let pedidosGlobales = [];

const mockPedidos = [
  {
    _id: 'a1b2c',
    fecha: new Date(Date.now() - 2 * 60 * 60 * 1000), // hace 2 horas
    items: [
      { cantidad: 2, nombrePlato: 'Hamburguesa Clásica', toppings: [{ opcionNombre: 'Extra queso' }], precio: 1800 },
      { cantidad: 1, nombrePlato: 'Papas Fritas', toppings: [], precio: 500 }
    ],
    total: 4100,
    metodoPago: 'Efectivo',
    estado: 'pendiente'
  },
  {
    _id: 'd4e5f',
    fecha: new Date(Date.now() - 5 * 60 * 60 * 1000), // hace 5 horas
    items: [
      { cantidad: 1, nombrePlato: 'Pizza Pepperoni', toppings: [{ opcionNombre: 'Aceitunas' }], precio: 3200 },
      { cantidad: 2, nombrePlato: 'Coca-Cola 500ml', toppings: [], precio: 700 }
    ],
    total: 4600,
    metodoPago: 'Transferencia',
    estado: 'pendiente'
  },
  {
    _id: 'g6h7i',
    fecha: new Date(Date.now() - 26 * 60 * 60 * 1000), // hace 26 horas (ayer)
    items: [
      { cantidad: 3, nombrePlato: 'Empanadas (docena)', toppings: [], precio: 6000 },
      { cantidad: 1, nombrePlato: 'Salsa picante', toppings: [], precio: 300 }
    ],
    total: 6300,
    metodoPago: 'Tarjeta',
    estado: 'pendiente'
  },
  {
    _id: 'j8k9l',
    fecha: new Date(Date.now() - 30 * 60 * 60 * 1000), // hace 30 horas (ayer)
    items: [
      { cantidad: 1, nombrePlato: 'Milanesa napolitana', toppings: [{ opcionNombre: 'Puré' }], precio: 2500 },
      { cantidad: 1, nombrePlato: 'Ensalada mixta', toppings: [], precio: 900 }
    ],
    total: 3400,
    metodoPago: 'Efectivo',
    estado: 'pendiente'
  },
  {
    _id: 'm0n1o',
    fecha: new Date(Date.now() - 72 * 60 * 60 * 1000), // hace 3 días
    items: [
      { cantidad: 1, nombrePlato: 'Lomo completo', toppings: [], precio: 2900 },
      { cantidad: 2, nombrePlato: 'Jugo de naranja', toppings: [], precio: 500 }
    ],
    total: 3900,
    metodoPago: 'Tarjeta',
    estado: 'completado'
  },
  {
    _id: 'p2q3r',
    fecha: new Date(Date.now() - 1 * 60 * 60 * 1000), // hace 1 hora
    items: [
      { cantidad: 1, nombrePlato: 'Pasta a la bolognesa', toppings: [], precio: 1700 },
      { cantidad: 2, nombrePlato: 'Pan de ajo', toppings: [], precio: 400 }
    ],
    total: 2500,
    metodoPago: 'Efectivo',
    estado: 'pendiente'
  }
];

function formatearFecha(fecha) {
  const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
  return fecha.toLocaleDateString('es-AR', opciones);
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

  const facturacionEl = document.getElementById('facturacionHoy');
  const pedidosEl = document.getElementById('pedidosHoy');
  if (facturacionEl) facturacionEl.textContent = `$${facturacion.toLocaleString('es-AR')}`;
  if (pedidosEl) pedidosEl.textContent = String(totalPedidos);
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

document.addEventListener('DOMContentLoaded', async () => {
  // TODO: Borrar mock data y usar fetch
  // const token = localStorage.getItem('token');
  // if (!token) {
  //   window.location.href = '/admin/login.html';
  //   return;
  // }
  // const resp = await peticionAPI('/api/pedidos', 'GET');
  // if (resp && resp.ok) {
  //   pedidosGlobales = await resp.json();
  // }
  pedidosGlobales = [...mockPedidos];
  renderizarPedidos();
});

