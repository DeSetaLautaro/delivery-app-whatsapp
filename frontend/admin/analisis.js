let listaTopPlatos = [];
let topPlatosExpandido = false;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }

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
                await cargarEstadisticas(token);
            } catch (err) {
                console.error(err);
                alert('Error al generar datos de prueba');
            } finally {
                btnMock.textContent = '🧪 Generar Datos de Prueba';
            }
        });
    }

    const btnToggleTop = document.getElementById('btn-toggle-top-products');
    if (btnToggleTop) {
        btnToggleTop.addEventListener('click', () => {
            topPlatosExpandido = !topPlatosExpandido;
            renderizarTopPlatos();
        });
    }

    await cargarEstadisticas(token);
});

async function cargarEstadisticas(token) {
    try {
        const resp = await fetch('/api/estadisticas', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!resp.ok) throw new Error('Error al traer estadísticas');
        const data = await resp.json();

        listaTopPlatos = data.topPlatos || [];
        renderizarTopPlatos();

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
