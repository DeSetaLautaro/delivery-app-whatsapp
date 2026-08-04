const token = new URLSearchParams(window.location.search).get('token');
let deliveryToken = token;
let todosLosPedidos = [];

document.addEventListener('DOMContentLoaded', () => {
    const inputBusqueda = document.getElementById('buscadorPedidos');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', renderPedidos);
    }
    cargarPedidos();
});

function cargarPedidos() {
    const contenedor = document.getElementById('contenedorRepartidor');
    if (!token) {
        contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">Falta el token en la URL.</p>';
        return;
    }

    contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">Cargando pedidos...</p>';

    fetch(`/api/delivery/pedidos?token=${encodeURIComponent(token)}`)
        .then(res => {
            if (res.status === 401 || res.status === 403) {
                const error = new Error('expirado');
                error.expirado = true;
                throw error;
            }
            if (!res.ok) throw new Error('Error al obtener pedidos');
            return res.json();
        })
        .then(pedidos => {
            if (!Array.isArray(pedidos) || pedidos.length === 0) {
                contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">No hay pedidos para hoy 🌙</p>';
                todosLosPedidos = [];
                return;
            }
            todosLosPedidos = pedidos;
            renderPedidos();
        })
        .catch(err => {
            console.error(err);
            if (err.expirado) {
                contenedor.innerHTML = `
                    <div style="text-align:center; padding:60px 20px;">
                        <div style="font-size:80px; margin-bottom:16px;">🛑</div>
                        <h2 style="font-size:1.4rem; margin-bottom:10px;">Enlace expirado o inválido</h2>
                        <p style="color:#888; font-size:1rem;">Por favor, pedile el nuevo link al dueño del local.</p>
                    </div>`;
                return;
            }
            contenedor.innerHTML = '<p style="color:#c0392b;text-align:center;padding:20px;">No se pudieron cargar los pedidos.</p>';
        });
}

function crearTarjeta(p) {
    const hora = new Date(p.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const itemsHtml = (p.items || []).map(item => `
        <div class="item">
            <span>${item.cantidad} × ${item.nombrePlato}${item.toppings && item.toppings.length ? ` (${item.toppings.map(t=>t.opcionNombre).join(', ')})` : ''}</span>
            <span>$${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
        </div>
    `).join('');

    const estadoActual = p.estadoDelivery || 'pendiente';
    const botones = ['pendiente', 'en_viaje', 'entregado'].map(est => `
        <button class="estado-boton ${est === estadoActual ? 'active' : ''}" data-id="${p._id}" data-estado="${est}">
            ${est.replace('_', ' ')}
        </button>
    `).join('');

    const numero = p.numeroDiario ? `#${p.numeroDiario}` : '#?';
    const entregado = estadoActual === 'entregado';
    const estiloEntregado = entregado ? 'opacity:0.5; filter:grayscale(0.3);' : '';

    return `
        <div class="pedido-card ${entregado ? 'pedido-entregado' : ''}" style="${estiloEntregado}">
            <div style="font-size:2.2rem; font-weight:800; color:#1e293b; margin-bottom:8px;">${numero}</div>
            <div class="card-head">
                <span class="cliente">${p.cliente || 'Cliente sin nombre'}</span>
                <span class="hora">🕑 ${hora}</span>
            </div>
            <div class="datos">
                <p>📍 ${p.direccion || 'Sin dirección'}</p>
                ${p.telefonoCliente ? `<p>📞 <a href="tel:${p.telefonoCliente}">${p.telefonoCliente}</a></p>` : ''}
                ${p.notas ? `<p>📝 ${p.notas}</p>` : ''}
            </div>
            <div class="items">${itemsHtml}</div>
            <div class="total-metodo">
                <span>Total</span>
                <span>$${(p.total || 0).toLocaleString('es-AR')}</span>
            </div>
            <div class="total-metodo" style="margin-top:4px;">
                <span>Pago</span>
                <span>${p.metodoPago || 'Efectivo'}</span>
            </div>
            <div class="estado-botones">${botones}</div>
        </div>
    `;
}

function renderPedidos() {
    const contenedor = document.getElementById('contenedorRepartidor');
    if (!contenedor) return;

    const inputBusqueda = document.getElementById('buscadorPedidos');
    const term = inputBusqueda ? inputBusqueda.value.trim().toLowerCase() : '';

    let filtrados = todosLosPedidos;
    if (term) {
        filtrados = todosLosPedidos.filter(p => {
            const numero = p.numeroDiario ? String(p.numeroDiario) : '';
            const cliente = (p.cliente || '').toLowerCase();
            const direccion = (p.direccion || '').toLowerCase();
            return numero.includes(term) || cliente.includes(term) || direccion.includes(term);
        });
    }

    const ordenados = [...filtrados].sort((a,b) => {
        const aEnt = a.estadoDelivery === 'entregado' ? 1 : 0;
        const bEnt = b.estadoDelivery === 'entregado' ? 1 : 0;
        if (aEnt !== bEnt) return aEnt - bEnt;
        return 0;
    });

    if (ordenados.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">No hay pedidos para mostrar.</p>';
        return;
    }

    contenedor.innerHTML = ordenados.map(p => crearTarjeta(p)).join('');

    document.querySelectorAll('.estado-boton').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const estado = e.target.dataset.estado;
            cambiarEstado(id, estado);
        });
    });

    if (inputBusqueda) {
        inputBusqueda.focus();
    }
}

function cambiarEstado(id, nuevoEstado) {
    if (!deliveryToken) return;
    fetch(`/api/delivery/pedidos/${id}/estado?token=${encodeURIComponent(deliveryToken)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoDelivery: nuevoEstado })
    })
    .then(res => {
        if (!res.ok) throw new Error('No se pudo actualizar');
        return res.json();
    })
    .then(() => cargarPedidos())
    .catch(err => console.error(err));
}
