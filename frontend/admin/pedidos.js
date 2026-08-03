let pedidosGlobales = [];

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
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/admin/login.html';
    return;
  }
  const resp = await peticionAPI('/api/pedidos', 'GET');
  if (resp && resp.ok) {
    pedidosGlobales = await resp.json();
  }
  renderizarPedidos();

  document.getElementById('btnCerrarCaja').addEventListener('click', cerrarCaja);
});

function cerrarCaja() {
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const pedidosHoy = pedidosGlobales.filter(p => {
    const fecha = new Date(p.fecha);
    return fecha >= hoy && fecha < new Date(hoy.getTime() + 24*60*60*1000);
  });

  const totales = { Efectivo: 0, Transferencia: 0, Tarjeta: 0 };
  pedidosHoy.forEach(p => {
    const metodo = p.metodoPago || 'Efectivo';
    if (totales[metodo] !== undefined) totales[metodo] += p.total;
  });
  const totalGeneral = Object.values(totales).reduce((a,b)=>a+b,0);

  const mensaje = `Resumen de Caja de Hoy:\nEfectivo: $${totales.Efectivo.toLocaleString('es-AR')}\nTransferencia: $${totales.Transferencia.toLocaleString('es-AR')}\nTarjeta: $${totales.Tarjeta.toLocaleString('es-AR')}\nTotal General: $${totalGeneral.toLocaleString('es-AR')}`;
  alert(mensaje);
}
