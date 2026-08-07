let pedidosGlobales = [];
let deliveryToken = null;
let filtroAdmin = 'todos';

function formatearFecha(fecha) {
  const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
  return new Date(fecha).toLocaleDateString('es-AR', opciones);
}

function agruparPorDia(pedidos) {
  const grupos = {};
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  pedidos.forEach(p => {
    const fecha = new Date(p.fecha);
    const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    let etiqueta;
    if (inicioDia.getTime() === hoy.getTime()) etiqueta = 'Hoy';
    else if (inicioDia.getTime() === ayer.getTime()) etiqueta = 'Ayer';
    else etiqueta = inicioDia.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

    if (!grupos[etiqueta]) grupos[etiqueta] = [];
    grupos[etiqueta].push(p);
  });
  return grupos;
}

function actualizarMetricasDiarias() {
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const pedidosHoy = pedidosGlobales.filter(p => {
    const fecha = new Date(p.fecha);
    return fecha >= hoy && fecha < new Date(hoy.getTime() + 24*60*60*1000);
  });
  const facturacion = pedidosHoy.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPedidos = pedidosHoy.length;

  const conteo = {};
  pedidosHoy.forEach(p => {
    (p.items || []).forEach(item => {
      const nombre = item.nombrePlato || 'Plato sin nombre';
      conteo[nombre] = (conteo[nombre] || 0) + (item.cantidad || 1);
    });
  });
  let productoEstrella = '';
  let maxCantidad = 0;
  for (const [nombre, cantidad] of Object.entries(conteo)) {
    if (cantidad > maxCantidad) {
      maxCantidad = cantidad;
      productoEstrella = nombre;
    }
  }

  const facturacionEl = document.getElementById('facturacionHoy');
  const pedidosEl = document.getElementById('pedidosHoy');
  const estrellaEl = document.getElementById('productoEstrella');
  if (facturacionEl) facturacionEl.textContent = `$${facturacion.toLocaleString('es-AR')}`;
  if (pedidosEl) pedidosEl.textContent = String(totalPedidos);
  if (estrellaEl) estrellaEl.textContent = productoEstrella || '—';
}

function renderizarPedidos() {
  const contenedor = document.getElementById('contenedorPedidos');
  let pedidosMostrados = pedidosGlobales;
  if (filtroAdmin === 'pendientes') {
    pedidosMostrados = pedidosGlobales.filter(p => p.estadoDelivery !== 'entregado');
  } else if (filtroAdmin === 'entregados') {
    pedidosMostrados = pedidosGlobales.filter(p => p.estadoDelivery === 'entregado');
  }
  if (pedidosMostrados.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center;color:#888;">No hay pedidos que coincidan con el filtro.</p>';
    return;
  }
  const grupos = agruparPorDia(pedidosMostrados);
  let html = Object.keys(grupos).map(etiqueta => {
    const cards = grupos[etiqueta].map(p => {
      const estado = p.estado || 'pendiente';
      const badgeClass = estado === 'cancelado' ? 'estado-cancelado' : estado === 'completado' ? 'estado-completado' : 'estado-pendiente';
      const badgeText = estado === 'cancelado' ? 'Cancelado' : estado === 'completado' ? 'Completado' : 'Pendiente';
      const cardClass = estado === 'cancelado' ? 'pedido-card cancelado' : estado === 'completado' ? 'pedido-card completado' : 'pedido-card';
      const buttonsHtml = (estado === 'pendiente') ? `
        <div class="pedido-acciones">
          <button class="btn-completar" data-id="${p._id}">✅ Marcar Completado</button>
          <button class="btn-cancelar" data-id="${p._id}">❌ Cancelar</button>
        </div>
      ` : '';
      const numero = p.numeroDiario !== undefined ? `#${p.numeroDiario}` : '#?';
      const fechaHora = new Date(p.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const itemsHtml = (p.items || []).map(item =>
        `${item.cantidad} × ${item.nombrePlato}${item.toppings && item.toppings.length ? ` (${item.toppings.map(t=>t.opcionNombre).join(', ')})` : ''} — $${(item.precio * item.cantidad).toLocaleString('es-AR')}`
      ).join('<br>');
      return `
        <div class="${cardClass}" data-id="${p._id}">
          <div class="pedido-header">
            <span class="numero-pedido">${numero}</span>
            <span class="fecha">${fechaHora}</span>
          </div>
          <div class="pedido-body">
            <div class="total">$${(p.total || 0).toLocaleString('es-AR')}</div>
            <span class="estado-badge ${badgeClass}">${badgeText}</span>
            <div class="items">${itemsHtml}</div>
            <div class="metodo">Método de pago: ${p.metodoPago || 'Efectivo'}</div>
            ${p.direccion ? `<p class="direccion">📍 ${p.direccion}</p>` : ''}
          </div>
          ${buttonsHtml}
          <div class="switch-admin" style="display:flex; align-items:center; gap:8px; margin-top:10px;">
            <input type="checkbox" class="switch-entregado" data-id="${p._id}" ${p.estadoDelivery === 'entregado' ? 'checked' : ''} style="width:20px; height:20px; accent-color:#2563eb;">
            <span style="font-weight:700; color:#374151;">${p.estadoDelivery === 'entregado' ? 'Entregado' : 'Pendiente'}</span>
          </div>
        </div>
      `;
    }).join('');
    return `<div class="grupo-dia"><h2>${etiqueta}</h2>${cards}</div>`;
  }).join('');
  contenedor.innerHTML = html;
  actualizarMetricasDiarias();
}

async function obtenerPedidos() {
  const resp = await fetch('/api/pedidos', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  if (!resp.ok) throw new Error('Error al obtener pedidos');
  return resp.json();
}

async function obtenerDeliveryToken() {
  const resp = await fetch('/api/local/delivery-token', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.token;
}

async function regenerarToken() {
  const resp = await fetch('/api/local/regenerar-token-delivery', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  if (!resp.ok) throw new Error('Error al regenerar token');
  const data = await resp.json();
  deliveryToken = data.token;
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/admin/login.html';
    return;
  }

  const btnVer = document.getElementById('btnVerPanel');
  const btnCompartir = document.getElementById('btnCompartir');
  const btnRegenerar = document.getElementById('btnRegenerar');

  if (btnRegenerar) {
    btnRegenerar.addEventListener('click', async () => {
      try {
        await regenerarToken();
        alert('Link regenerado. Los deliverys anteriores perdieron acceso. Compartí el nuevo link.');
      } catch (error) {
        console.error(error);
        alert('No se pudo regenerar el link.');
      }
    });
  }

  if (btnCompartir) {
    btnCompartir.addEventListener('click', async () => {
      if (!deliveryToken) return alert('Todavía no hay link de delivery.');
      const url = `${window.location.origin}/delivery?token=${encodeURIComponent(deliveryToken)}`;
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copiado al portapapeles.');
      } catch (e) {
        prompt('Copiá el link:', url);
      }
    });
  }

  if (btnVer) {
    btnVer.addEventListener('click', () => {
      if (!deliveryToken) return alert('Todavía no hay link de delivery.');
      window.open(`/delivery?token=${encodeURIComponent(deliveryToken)}`, '_blank');
    });
  }

  try {
    // TODO: comenta estas dos líneas para usar datos reales
    // pedidosGlobales = await obtenerPedidos();
    // deliveryToken = await obtenerDeliveryToken();
    pedidosGlobales = [
      { _id: 'mock1', fecha: new Date(Date.now() - 1*60*60*1000), items: [ { cantidad: 2, nombrePlato: 'Hamburguesa Clásica', toppings: [{ opcionNombre: 'Extra queso' }], precio: 1800 }, { cantidad: 1, nombrePlato: 'Papas Fritas', toppings: [], precio: 500 } ], total: 4100, metodoPago: 'Efectivo', estado: 'pendiente', estadoDelivery: 'pendiente', numeroDiario: 1, direccion: 'Av. Siempre Viva 742', telefonoCliente: '11-5555-1234', notas: 'Sin cebolla' },
      { _id: 'mock2', fecha: new Date(Date.now() - 3*60*60*1000), items: [ { cantidad: 1, nombrePlato: 'Pizza Pepperoni', toppings: [{ opcionNombre: 'Aceitunas' }], precio: 3200 }, { cantidad: 2, nombrePlato: 'Coca-Cola 500ml', toppings: [], precio: 700 } ], total: 4600, metodoPago: 'Transferencia', estado: 'pendiente', estadoDelivery: 'en_viaje', numeroDiario: 2, direccion: 'Mitre 123', telefonoCliente: '11-5555-5678', notas: '' },
      { _id: 'mock3', fecha: new Date(Date.now() - 5*60*60*1000), items: [ { cantidad: 3, nombrePlato: 'Empanadas (docena)', toppings: [], precio: 6000 }, { cantidad: 1, nombrePlato: 'Salsa picante', toppings: [], precio: 300 } ], total: 6300, metodoPago: 'Tarjeta', estado: 'pendiente', estadoDelivery: 'pendiente', numeroDiario: 3, direccion: 'Belgrano 888', telefonoCliente: '11-5555-9012', notas: 'Picante' },
      { _id: 'mock4', fecha: new Date(Date.now() - 26*60*60*1000), items: [ { cantidad: 1, nombrePlato: 'Lomo completo', toppings: [], precio: 2900 }, { cantidad: 1, nombrePlato: 'Jugo de naranja', toppings: [], precio: 500 } ], total: 3400, metodoPago: 'Tarjeta', estado: 'completado', estadoDelivery: 'entregado', numeroDiario: 4, direccion: 'Rivadavia 333', telefonoCliente: '11-5555-3456', notas: '' },
      { _id: 'mock5', fecha: new Date(Date.now() - 27*60*60*1000), items: [ { cantidad: 1, nombrePlato: 'Pasta a la bolognesa', toppings: [], precio: 1700 }, { cantidad: 2, nombrePlato: 'Pan de ajo', toppings: [], precio: 400 } ], total: 2500, metodoPago: 'Efectivo', estado: 'pendiente', estadoDelivery: 'entregado', numeroDiario: 5, direccion: 'San Martín 456', telefonoCliente: '11-5555-7890', notas: '' }
    ];
    deliveryToken = 'mock-token';
  } catch (error) {
    console.error('Error al cargar datos:', error);
    pedidosGlobales = [];
  }
  // Listeners para filtros del admin
  document.querySelectorAll('.btn-filtro-admin').forEach(btn => {
    btn.addEventListener('click', () => {
      filtroAdmin = btn.dataset.filtro;
      document.querySelectorAll('.btn-filtro-admin').forEach(b => {
        b.style.background = '#f5f5f5';
        b.style.color = '#555';
      });
      btn.style.background = '#ff6b35';
      btn.style.color = '#fff';
      renderizarPedidos();
    });
  });

  // Listener para el switch de entregado (delegado)
  document.addEventListener('change', async (e) => {
    if (e.target.classList.contains('switch-entregado')) {
      const id = e.target.dataset.id;
      const nuevoEstado = e.target.checked ? 'entregado' : 'pendiente';
      try {
        const resp = await fetch(`/api/delivery/pedidos/${id}/estado?token=${encodeURIComponent(deliveryToken)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estadoDelivery: nuevoEstado })
        });
        if (!resp.ok) throw new Error('Error al cambiar estado');
        const pedido = await resp.json();
        const idx = pedidosGlobales.findIndex(p => p._id === id);
        if (idx !== -1) pedidosGlobales[idx].estadoDelivery = pedido.estadoDelivery;
        renderizarPedidos();
      } catch (error) {
        console.error(error);
        alert('No se pudo actualizar el estado');
      }
    }
  });

  // Listener para acciones de pedido (completar / cancelar)
  document.addEventListener('click', async (e) => {
    const boton = e.target.closest('.btn-completar, .btn-cancelar');
    if (!boton) return;
    const id = boton.dataset.id;
    const nuevoEstado = boton.classList.contains('btn-completar') ? 'completado' : 'cancelado';
    const textoConfirmacion = nuevoEstado === 'cancelado' ? '¿Seguro que querés cancelar este pedido?' : '¿Marcar este pedido como completado?';
    if (!confirm(textoConfirmacion)) return;
    try {
      const resp = await fetch(`/api/pedidos/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (!resp.ok) throw new Error('Error al actualizar estado');
      const pedido = await resp.json();
      const idx = pedidosGlobales.findIndex(p => p._id === id);
      if (idx !== -1) pedidosGlobales[idx].estado = pedido.estado;
      renderizarPedidos();
    } catch (error) {
      console.error(error);
      alert('No se pudo actualizar el pedido');
    }
  });

  renderizarPedidos();
});

