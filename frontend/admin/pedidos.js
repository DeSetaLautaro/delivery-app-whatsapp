let pedidosGlobales = [];
let deliveryToken = null;

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
  if (pedidosGlobales.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center;color:#888;">No hay pedidos todavía.</p>';
    return;
  }
  const grupos = agruparPorDia(pedidosGlobales);
  let html = Object.keys(grupos).map(etiqueta => {
    const cards = grupos[etiqueta].map(p => `
      <div class="pedido-card">
        <div class="pedido-header">
          <span class="chan">Pedido #${p._id.slice(-5)}</span>
          <span class="fecha">${new Date(p.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="items">
          ${p.items.map(item => `${item.cantidad} × ${item.nombrePlato}${item.toppings && item.toppings.length ? ` (${item.toppings.map(t=>t.opcionNombre).join(', ')})` : ''} — $${(item.precio * item.cantidad).toLocaleString('es-AR')}`).join('<br>')}
        </div>
        <div class="total">Total: $${p.total.toLocaleString('es-AR')}</div>
        <div class="metodo">Método de pago: ${p.metodoPago || 'Efectivo'}</div>
      </div>
    `).join('');
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
  }
  renderizarPedidos();
});

