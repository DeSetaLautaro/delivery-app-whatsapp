const token = new URLSearchParams(window.location.search).get('token');

document.addEventListener('DOMContentLoaded', cargarPedidos);

function cargarPedidos() {
    const contenedor = document.getElementById('contenedorRepartidor');
    if (!token) {
        contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">Falta el token en la URL.</p>';
        return;
    }

    contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">Cargando pedidos...</p>';

    fetch(`/api/delivery/pedidos?token=${encodeURIComponent(token)}`)
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener pedidos');
            return res.json();
        })
        .then(pedidos => {
            if (!Array.isArray(pedidos) || pedidos.length === 0) {
                contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">No hay pedidos para hoy 🌙</p>';
                return;
            }

            contenedor.innerHTML = pedidos.map(p => crearTarjeta(p)).join('');

            document.querySelectorAll('.estado-boton').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const estado = e.target.dataset.estado;
                    cambiarEstado(id, estado);
                });
            });
        })
        .catch(err => {
            console.error(err);
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

    return `
        <div class="pedido-card">
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

function cambiarEstado(id, nuevoEstado) {
    fetch(`/api/delivery/pedidos/${id}/estado`, {
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
