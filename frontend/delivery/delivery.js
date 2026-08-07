const token = new URLSearchParams(window.location.search).get('token');
let deliveryToken = token;
let todosLosPedidos = [];
let filtroDelivery = 'todos';

const MOCK_PEDIDOS_DELIVERY = [
  { _id: 'mock1', cliente: 'Juan Pérez', direccion: 'Av. Siempre Viva 742', telefonoCliente: '11-5555-1234', notas: 'Sin cebolla', items: [{ cantidad: 1, nombrePlato: 'Hamburguesa', toppings: [], precio: 1800 }], total: 1800, metodoPago: 'Efectivo', fecha: new Date(Date.now() - 1*60*60*1000), numeroDiario: 1, estadoDelivery: 'pendiente', estado: 'pendiente' },
  { _id: 'mock2', cliente: 'María López', direccion: 'Mitre 123', telefonoCliente: '11-5555-5678', notas: '', items: [{ cantidad: 2, nombrePlato: 'Pizza', toppings: [{grupoNombre: 'Queso', opcionNombre: 'Aceitunas', precio: 200}], precio: 3200 }], total: 6600, metodoPago: 'Transferencia', fecha: new Date(Date.now() - 2*60*60*1000), numeroDiario: 2, estadoDelivery: 'entregado', estado: 'entregado' },
  { _id: 'mock3', cliente: 'Carlos Gómez', direccion: 'Belgrano 888', telefonoCliente: '11-5555-9012', notas: 'Picante', items: [{ cantidad: 3, nombrePlato: 'Empanadas', toppings: [], precio: 6000 }], total: 18000, metodoPago: 'Tarjeta', fecha: new Date(Date.now() - 3*60*60*1000), numeroDiario: 3, estadoDelivery: 'en_viaje', estado: 'en_viaje' },
  { _id: 'mock4', cliente: 'Ana Ruiz', direccion: 'Rivadavia 333', telefonoCliente: '11-5555-3456', notas: '', items: [{ cantidad: 1, nombrePlato: 'Lomo', toppings: [], precio: 2900 }], total: 2900, metodoPago: 'Efectivo', fecha: new Date(Date.now() - 26*60*60*1000), numeroDiario: 4, estadoDelivery: 'pendiente', estado: 'pendiente' }
];

document.addEventListener('DOMContentLoaded', () => {
    const inputBusqueda = document.getElementById('buscadorPedidos');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', renderPedidos);
    }
    crearFiltrosDelivery();
    cargarPedidos();
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

    // Usamos datos de prueba para visualizar el front
    setTimeout(() => {
        if (!Array.isArray(MOCK_PEDIDOS_DELIVERY) || MOCK_PEDIDOS_DELIVERY.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">No hay pedidos para hoy 🌙</p>';
            todosLosPedidos = [];
            return;
        }
        todosLosPedidos = MOCK_PEDIDOS_DELIVERY;
        renderPedidos();
    }, 400);
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
    const numero = p.numeroDiario ? `#${p.numeroDiario}` : '#?';
    const entregado = estadoActual === 'entregado';
    const estiloEntregado = entregado ? 'opacity:0.5; filter:grayscale(0.3);' : '';
    const cancelado = p.estado === 'cancelado';
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
            <div style="display:flex; align-items:center; gap:8px; margin-top:14px; border-top:1px solid #eee; padding-top:10px;">
                <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                    <input type="checkbox" class="switch-entregado" data-id="${p._id}" ${entregado ? 'checked' : ''} style="width:20px; height:20px; accent-color:#2563eb;">
                    <span style="font-weight:600; color:#374151;">${entregado ? 'Entregado' : 'Pendiente'}</span>
                </label>
            </div>
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

    document.querySelectorAll('.switch-entregado').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const nuevoEstado = e.target.checked ? 'entregado' : 'pendiente';
            cambiarEstado(id, nuevoEstado);
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
