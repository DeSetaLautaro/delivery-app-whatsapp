const token = new URLSearchParams(window.location.search).get('token');
let deliveryToken = token;
let todosLosPedidos = [];
let filtroDelivery = 'todos';

document.addEventListener('DOMContentLoaded', () => {
    const inputBusqueda = document.getElementById('buscadorPedidos');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', renderPedidos);
    }
    crearFiltrosDelivery();
    cargarPedidos();
    setInterval(() => {
        if (token) actualizarPedidos();
    }, 5000);
});

function crearFiltrosDelivery() {
    const contenedor = document.getElementById('contenedorRepartidor');
    if (!contenedor) return;
    const filtrosHtml = `
        <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">
            <button class="filtro-delivery" data-filtro="todos" style="padding:8px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:600; background:#e2e8f0;">Todos</button>
            <button class="filtro-delivery" data-filtro="pendientes" style="padding:8px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:600; background:#e2e8f0;">Pendientes</button>
            <button class="filtro-delivery" data-filtro="entregados" style="padding:8px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:600; background:#e2e8f0;">Entregados</button>
        </div>
    `;
    contenedor.insertAdjacentHTML('afterbegin', filtrosHtml);
    document.querySelectorAll('.filtro-delivery').forEach(btn => {
        btn.addEventListener('click', () => {
            filtroDelivery = btn.dataset.filtro;
            document.querySelectorAll('.filtro-delivery').forEach(b => {
                b.style.background = '#e2e8f0';
                b.style.color = '#333';
            });
            btn.style.background = '#2563eb';
            btn.style.color = '#fff';
            renderPedidos();
        });
    });
}

function cargarPedidos() {
    const contenedor = document.getElementById('contenedorRepartidor');
    if (!token) {
        contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">Falta el token en la URL.</p>';
        return;
    }
    contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">Cargando pedidos...</p>';
    if (token) {
        actualizarPedidos();
    }
}

function actualizarPedidos() {
    if (!token) return Promise.resolve();
    return fetch(`/api/delivery/pedidos?token=${encodeURIComponent(token)}`)
        .then(res => {
            if (!res.ok) throw new Error('No se pudieron obtener los pedidos');
            return res.json();
        })
        .then(data => {
            todosLosPedidos = Array.isArray(data) ? data : [];
            renderPedidos();
        })
        .catch(err => {
            console.error('Error al cargar pedidos:', err);
            todosLosPedidos = [];
            renderPedidos();
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
    const numero = p.numeroDiario ? `#${p.numeroDiario}` : 'S/N';
    const completado = p.estado === 'completado' || estadoActual === 'entregado';
    const cancelado = p.estado === 'cancelado';
    const entregado = completado;
    const estiloEntregado = completado ? 'opacity:0.5; filter:grayscale(0.3);' : '';
    const claseCancelado = cancelado ? ' pedido-cancelado' : '';

    return `
        <div class="pedido-card ${entregado ? 'pedido-entregado' : ''}${claseCancelado}" style="${cancelado ? 'position:relative; opacity:0.6; filter:grayscale(100%) blur(1px); pointer-events:none;' : estiloEntregado}">
            ${cancelado ? '<div style="position:absolute; top:8px; left:8px; background:#dc2626; color:#fff; padding:2px 10px; border-radius:4px; font-weight:900; font-size:0.8rem; z-index:10; box-shadow:0 2px 6px rgba(0,0,0,0.3);">CANCELADO</div>' : ''}
            <div class="card-head" style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <span class="cliente" style="font-weight:700; font-size:1.05rem;">${p.cliente || 'Cliente sin nombre'}</span>
                <div style="display:flex; flex-direction:column; align-items:flex-end;">
                    <span class="hora" style="font-size:0.8rem; color:#6b7280;">🕑 ${hora}</span>
                    <div style="margin-top:5px; background:#eff6ff; border:2px solid #2563eb; border-radius:8px; padding:2px 8px; font-size:1.3rem; font-weight:900; color:#2563eb;">${numero}</div>
                </div>
            </div>
            <div class="datos">
                <p>📍 ${p.direccion || 'Sin dirección'}</p>
                ${p.telefonoCliente ? `<p>📞 <a href="tel:${p.telefonoCliente}">${p.telefonoCliente}</a></p>` : ''}
                ${p.notas ? `<p>📝 ${p.notas}</p>` : ''}
            </div>
            <div class="items" style="background:#f9fafb; border-radius:8px; padding:10px; margin-top:8px;">
                ${itemsHtml}
            </div>
            <div class="total-metodo" style="display:flex; justify-content:space-between; margin-top:12px; font-weight:700;">
                <span>Total</span>
                <span>$${(p.total || 0).toLocaleString('es-AR')}</span>
            </div>
            <div class="total-metodo" style="display:flex; justify-content:space-between; margin-top:4px;">
                <span>Pago</span>
                <span>${p.metodoPago || 'Efectivo'}</span>
            </div>
            ${completado ? `
                <div style="display:inline-block; background:#dcfce7; color:#15803d; font-weight:800; padding:6px 14px; border-radius:999px; margin-top:14px; border-top:1px solid #eee; padding-top:10px;">✅ COMPLETADO</div>
            ` : cancelado ? `
                <div style="display:inline-block; background:#fee2e2; color:#b91c1c; font-weight:800; padding:6px 14px; border-radius:999px; margin-top:14px; border-top:1px solid #eee; padding-top:10px;">CANCELADO</div>
            ` : `
                <div style="display:flex; align-items:center; gap:8px; margin-top:14px; border-top:1px solid #eee; padding-top:10px;">
                    <button class="btn-completar-delivery" data-id="${p._id}" style="width:100%; padding:12px; border:none; border-radius:10px; background:#22c55e; color:#fff; font-weight:800; cursor:pointer;">✅ Marcar como completado</button>
                </div>
            `}
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
    if (filtroDelivery === 'pendientes') {
        filtrados = filtrados.filter(p => p.estadoDelivery !== 'entregado');
    } else if (filtroDelivery === 'entregados') {
        filtrados = filtrados.filter(p => p.estadoDelivery === 'entregado');
    }

    const ordenEstado = { 'pendiente': 0, 'completado': 1, 'cancelado': 2 };
    const ordenados = [...filtrados].sort((a,b) => {
        const ea = a.estado || 'pendiente';
        const eb = b.estado || 'pendiente';
        const diff = (ordenEstado[ea] ?? 3) - (ordenEstado[eb] ?? 3);
        if (diff !== 0) return diff;
        return 0;
    });

    if (ordenados.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">No hay pedidos para mostrar.</p>';
        return;
    }

    contenedor.innerHTML = ordenados.map(p => crearTarjeta(p)).join('');

    document.querySelectorAll('.btn-completar-delivery').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            cambiarEstado(id, 'completado');
        });
    });

    if (inputBusqueda) {
        inputBusqueda.focus();
    }
}

function cambiarEstado(id, nuevoEstado) {
    if (!deliveryToken) return;
    const estadoPATCH = nuevoEstado === 'completado' ? 'completado' : 'pendiente';
    fetch(`/api/pedidos/${id}/estado?token=${encodeURIComponent(deliveryToken)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: estadoPATCH })
    })
    .then(res => {
        if (!res.ok) throw new Error('No se pudo actualizar');
        return res.json();
    })
    .then(() => actualizarPedidos())
    .catch(err => console.error(err));
}
