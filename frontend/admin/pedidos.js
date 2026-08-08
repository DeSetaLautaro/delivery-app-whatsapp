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
    pedidosMostrados = pedidosGlobales.filter(p => (p.estado || 'pendiente') === 'pendiente');
  } else if (filtroAdmin === 'entregados') {
    pedidosMostrados = pedidosGlobales.filter(p => p.estadoDelivery === 'entregado');
  } else if (filtroAdmin === 'cancelados') {
    pedidosMostrados = pedidosGlobales.filter(p => p.estado === 'cancelado');
  } else if (filtroAdmin === 'completados') {
    pedidosMostrados = pedidosGlobales.filter(p => p.estado === 'completado');
  } else {
    // "Todos" no filtra
    pedidosMostrados = pedidosGlobales;
  }
  if (pedidosMostrados.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center;color:#888;">No hay pedidos que coincidan con el filtro.</p>';
    return;
  }
  const grupos = agruparPorDia(pedidosMostrados);
  let html = Object.keys(grupos).map(etiqueta => {
    const ordenEstado = { 'pendiente': 0, 'completado': 1, 'cancelado': 2 };
    const listaOrdenada = [...grupos[etiqueta]].sort((a,b) => {
        const ea = a.estado || 'pendiente';
        const eb = b.estado || 'pendiente';
        return (ordenEstado[ea] ?? 3) - (ordenEstado[eb] ?? 3);
    });
    const cards = listaOrdenada.map(p => {
      const estado = p.estado || 'pendiente';
      const badgeClass = estado === 'cancelado' ? 'estado-cancelado' : estado === 'completado' ? 'estado-completado' : 'estado-pendiente';
      const badgeText = estado === 'cancelado' ? 'Cancelado' : estado === 'completado' ? 'COMPLETADO' : 'Pendiente';
      const cardClass = estado === 'cancelado' ? 'pedido-card cancelado' : estado === 'completado' ? 'pedido-card completado' : 'pedido-card';
      let buttonsHtml = '';
      if (estado === 'pendiente') {
        buttonsHtml = `
          <div class="pedido-acciones">
            <button class="btn-completar" data-id="${p._id}">✅ Marcar como completado</button>
            <button class="btn-cancelar" data-id="${p._id}">❌ Cancelar</button>
          </div>
        `;
      } else {
        buttonsHtml = `
          <div class="pedido-acciones-secundarias">
            <button class="btn-revertir-pendiente" data-id="${p._id}" title="Mover a pendiente">↺ Pendiente</button>
            ${estado === 'completado' ? `<button class="btn-revertir-cancelado" data-id="${p._id}" title="Cambiar a cancelado">❌ Cancelado</button>` : ''}
            ${estado === 'cancelado' ? `<button class="btn-revertir-completado" data-id="${p._id}" title="Cambiar a completado">✅ Completado</button>` : ''}
          </div>
        `;
      }
      const numero = p.numeroDiario ? `#${p.numeroDiario}` : 'S/N';
      const fechaHora = new Date(p.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const itemsHtml = (p.items || []).map(item => {
        const cantidad = item.cantidad || 1;
        const toppings = item.toppings && item.toppings.length ? ` <span class="topping-item">(${item.toppings.map(t=>t.opcionNombre).join(', ')})</span>` : '';
        const precioItem = (item.precio || 0) * cantidad;
        return `<div class="linea-item"><span class="nombre-item"><strong class="cantidad-item">${cantidad}×</strong> ${item.nombrePlato}${toppings}</span> <span class="precio-item">$${precioItem.toLocaleString('es-AR')}</span></div>`;
      }).join('');
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
    pedidosGlobales = await obtenerPedidos();
    deliveryToken = await obtenerDeliveryToken();
  } catch (error) {
    console.error('Error al cargar datos:', error);
    pedidosGlobales = [];
    deliveryToken = null;
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


  // Listener para acciones de pedido (completar / cancelar)
  document.addEventListener('click', async (e) => {
    const boton = e.target.closest('.btn-completar, .btn-cancelar, .btn-revertir-pendiente, .btn-revertir-completado, .btn-revertir-cancelado');
    if (!boton) return;
    const id = boton.dataset.id;
    let nuevoEstado;
    if (boton.classList.contains('btn-completar') || boton.classList.contains('btn-revertir-completado')) {
      nuevoEstado = 'completado';
    } else if (boton.classList.contains('btn-cancelar') || boton.classList.contains('btn-revertir-cancelado')) {
      nuevoEstado = 'cancelado';
    } else if (boton.classList.contains('btn-revertir-pendiente')) {
      nuevoEstado = 'pendiente';
    }
    const esRevertir = boton.classList.contains('btn-revertir-pendiente') || boton.classList.contains('btn-revertir-completado') || boton.classList.contains('btn-revertir-cancelado');
    if (!esRevertir) {
      const textoConfirmacion = nuevoEstado === 'cancelado' ? '¿Seguro que querés cancelar este pedido?' : '¿Marcar este pedido como completado?';
      if (!confirm(textoConfirmacion)) return;
    }


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

  // Sincronización automática con la base de datos
  setInterval(async () => {
    try {
      pedidosGlobales = await obtenerPedidos();
      renderizarPedidos();
    } catch (error) {
      console.error('Error al actualizar pedidos:', error);
    }
  }, 5000);
});

