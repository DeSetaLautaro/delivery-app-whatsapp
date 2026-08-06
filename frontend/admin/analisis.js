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
