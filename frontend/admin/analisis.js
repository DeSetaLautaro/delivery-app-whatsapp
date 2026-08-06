let listaTopPlatos = [];
let topPlatosExpandido = false;
let listaPlatosMenos = [];
let datosExplorador = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }

    const selectPeriodo = document.getElementById('select-periodo');
    const periodoActual = selectPeriodo ? selectPeriodo.value : 'mes';

    const btnMock = document.getElementById('btn-generar-mock');
    if (btnMock) {
        btnMock.addEventListener('click', async (e) => {
            e.preventDefault();
            btnMock.textContent = 'Generando...';
            try {
                const resp = await fetch('/api/estadisticas/mock', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    }
                });
                if (!resp.ok) throw new Error('Error al generar datos de prueba');
                await cargarEstadisticas(token, selectPeriodo ? selectPeriodo.value : 'mes');
            } catch (err) {
                console.error(err);
                alert('Error al generar datos de prueba');
            } finally {
                btnMock.textContent = '🧪 Generar Datos de Prueba';
            }
        });
    }

    if (selectPeriodo) {
        selectPeriodo.addEventListener('change', () => {
            cargarEstadisticas(token, selectPeriodo.value);
        });
    }

    const btnToggleTop = document.getElementById('btn-toggle-top-products');
    if (btnToggleTop) {
        btnToggleTop.addEventListener('click', () => {
            topPlatosExpandido = !topPlatosExpandido;
            renderizarTopPlatos();
        });
    }

    const inputExplorador = document.getElementById('buscador-platos');
    if (inputExplorador) {
        inputExplorador.addEventListener('input', (e) => {
            renderizarExplorador(e.target.value.trim());
        });
    }

    await cargarEstadisticas(token, periodoActual);
    cargarExplorador(token);
});

async function cargarEstadisticas(token, periodo = 'mes') {
    try {
        const resp = await fetch(`/api/estadisticas?periodo=${encodeURIComponent(periodo)}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!resp.ok) throw new Error('Error al traer estadísticas');
        const data = await resp.json();

        listaTopPlatos = data.topPlatos || [];
        renderizarTopPlatos();

        listaPlatosMenos = data.platosMenosPedidos || [];
        renderizarPlatosMenos();

        const formatter = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        });

        const elVentas = document.getElementById('kpi-ventas');
        if (elVentas) elVentas.textContent = formatter.format(data.totalVentas || 0);

        const elPedidos = document.getElementById('kpi-pedidos');
        if (elPedidos) elPedidos.textContent = (data.cantidadPedidos || 0).toLocaleString('es-AR');

        const elTicket = document.getElementById('kpi-ticket');
        if (elTicket) elTicket.textContent = formatter.format(data.ticketPromedio || 0);

        const elClientesInactivos = document.getElementById('kpi-clientes-inactivos');
        if (elClientesInactivos) elClientesInactivos.textContent = data.clientesInactivos || 0;
    } catch (err) {
        console.error(err);
    }
}

function renderizarTopPlatos() {
    const contenedor = document.querySelector('.top-platos');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    const limite = topPlatosExpandido ? 20 : 5;
    const platos = listaTopPlatos.slice(0, limite);
    if (platos.length === 0) {
        contenedor.innerHTML = '<p style="color:#8A8D9F">Todavía no hay datos para mostrar.</p>';
        return;
    }

    const maxUnidades = platos[0].totalUnidades || 1;

    const formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    });

    platos.forEach((plato, i) => {
        const nombre = plato._id || 'Sin nombre';
        const unidades = plato.totalUnidades || 0;
        const recaudacion = plato.recaudacion || 0;
        const ancho = Math.round((unidades / maxUnidades) * 100);
        const fila = `
            <div class="top-item">
                <span class="rank">${i + 1}</span>
                <div class="top-info">
                    <div class="top-header">
                        <span class="top-nombre">${nombre}</span>
                        <span class="top-stats">${unidades} u · ${formatoMoneda.format(recaudacion)}</span>
                    </div>
                    <div class="barra-progreso">
                        <div class="barra-fill" style="width: ${ancho}%"></div>
                    </div>
                </div>
            </div>
        `;
        contenedor.innerHTML += fila;
    });

    const btnToggle = document.getElementById('btn-toggle-top-products');
    if (btnToggle) {
        btnToggle.textContent = topPlatosExpandido ? 'Ver menos' : 'Ver todos';
    }
}

function renderizarPlatosMenos() {
    const contenedor = document.getElementById('lista-platos-muertos');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    const platos = listaPlatosMenos.slice(0, 3);
    if (platos.length === 0) {
        contenedor.innerHTML = '<p style="color:#8A8D9F">Todavía no hay datos para mostrar.</p>';
        return;
    }

    platos.forEach(plato => {
        const nombre = plato._id || 'Sin nombre';
        let dias = 999;
        if (plato.ultimaVenta) {
            dias = Math.max(0, Math.floor((Date.now() - new Date(plato.ultimaVenta).getTime()) / (1000 * 60 * 60 * 24)));
        }
        const fila = document.createElement('div');
        fila.className = 'plato-muerto';
        fila.innerHTML = `
            <span>${nombre}</span>
            <span class="dias-sin-venta">Días sin ventas: ${dias}</span>
            <button class="btn-sugerencia">🔥 Poner en promo</button>
        `;
        contenedor.appendChild(fila);
    });
}

async function cargarExplorador(token) {
    try {
        const resp = await fetch('/api/estadisticas/explorador-promos', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!resp.ok) throw new Error('Error al traer explorador de promos');
        datosExplorador = await resp.json();
        renderizarExplorador();
    } catch (err) {
        console.error(err);
    }
}

function renderizarExplorador(filtro = '') {
    const contenedor = document.getElementById('lista-explorador-platos');
    if (!contenedor) return;

    contenedor.innerHTML = '';
    let datos = datosExplorador;

    if (filtro) {
        const texto = filtro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        datos = datos.filter(p => (p.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(texto));
    }

    const ordenados = [...datos].sort((a, b) => (b.actualmenteEnPromo === true) - (a.actualmenteEnPromo === true));

    if (ordenados.length === 0) {
        contenedor.innerHTML = '<p style="color:#8A8D9F">No hay platos para mostrar.</p>';
        return;
    }

    const formatoMoneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

    ordenados.forEach(plato => {
        const item = document.createElement('div');
        item.className = 'explorador-item';
        item.innerHTML = `<span class="explorador-nombre">${plato.nombre}</span>` +
            (plato.actualmenteEnPromo ? '<span class="badge-promo">EN PROMO</span>' : '');
        item.addEventListener('click', () => mostrarComparacion(plato, formatoMoneda));
        contenedor.appendChild(item);
    });
}

function mostrarComparacion(plato, formatoMoneda) {
    const sin = plato.sinPromo;
    const con = plato.conPromo;
    const mensaje = `Rendimiento Diario Promedio - ${plato.nombre}\n` +
        (sin ? `SIN PROMO: Vende ${sin.promedioUnidadesPorDia.toFixed(2)} unids/día (${formatoMoneda.format(sin.promedioDineroPorDia)}/día)` : 'SIN PROMO: Sin ventas') + '\n' +
        (con ? `CON PROMO: Vende ${con.promedioUnidadesPorDia.toFixed(2)} unids/día (${formatoMoneda.format(con.promedioDineroPorDia)}/día)` : 'CON PROMO: Sin ventas');
    alert(mensaje);
}
