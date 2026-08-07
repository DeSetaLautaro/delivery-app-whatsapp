let listaTopPlatos = [];
let topPlatosExpandido = false;
let listaPlatosMenos = [];
let datosExplorador = [];
let datosHorarios = [];

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
    cargarCombosSugeridos(token);
    cargarHorariosPico(token);
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
        const wrapper = document.createElement('div');
        wrapper.className = 'explorador-item-wrapper';

        const item = document.createElement('div');
        item.className = 'explorador-item';

        const con = plato.conPromo;
        const sin = plato.sinPromo;

        let lift = null;
        let elasticidad = null;
        if (con && sin && sin.promedioUnidadesPorDia > 0 && con.promedioUnidadesPorDia > 0 && sin.totalUnidades > 0 && con.totalUnidades > 0) {
            lift = ((con.promedioUnidadesPorDia - sin.promedioUnidadesPorDia) / sin.promedioUnidadesPorDia) * 100;

            const precioBase = sin.totalDinero / sin.totalUnidades;
            const precioPromo = con.totalDinero / con.totalUnidades;
            if (precioBase > 0 && precioPromo !== precioBase) {
                const deltaQ = (con.promedioUnidadesPorDia - sin.promedioUnidadesPorDia) / sin.promedioUnidadesPorDia;
                const deltaP = (precioPromo - precioBase) / precioBase;
                if (deltaP !== 0) {
                    elasticidad = Math.abs(deltaQ / deltaP);
                }
            }
        }

        const infoIzquierda = `<span class="explorador-nombre">${plato.nombre || 'Plato sin nombre'}</span>` +
            (plato.actualmenteEnPromo ? '<span class="badge-promo">EN PROMO</span>' : '');

        let claseLift = '';
        let claseElasticidad = '';
        if (lift !== null) {
            if (lift > 0) claseLift = 'text-success';
            else if (lift < 0) claseLift = 'text-danger';
        }
        if (elasticidad !== null) {
            if (elasticidad > 1) claseElasticidad = 'text-success';
            else if (elasticidad < 1) claseElasticidad = 'text-warning';
        }

        const metricasHtml = (lift !== null && elasticidad !== null) ? `
            <div class="metricas-avanzadas">
                <span class="metrica-badge">Lift: <span class="${claseLift}">${lift.toFixed(0)}%</span> <i class="info-tooltip" data-tooltip="Mide cuánto aumentaron tus ventas. Ej: 100% significa que vendés el doble con la promo.">?</i></span>
                <span class="metrica-badge">Elasticidad: <span class="${claseElasticidad}">${elasticidad.toFixed(1)}</span> <i class="info-tooltip" data-tooltip="Sensibilidad al precio. Mayor a 1: ¡La promo es un éxito! Menor a 1: La gente lo compraría igual sin descuento.">?</i></span>
            </div>
        ` : '';

        item.innerHTML = `
            <div class="explorador-item-info">${infoIzquierda}</div>
            ${metricasHtml}
        `;

        const detalle = document.createElement('div');
        detalle.className = 'explorador-detalle';
        detalle.style.display = 'none';

        item.addEventListener('click', () => toggleComparacion(plato, detalle, formatoMoneda));

        wrapper.appendChild(item);
        wrapper.appendChild(detalle);
        contenedor.appendChild(wrapper);
    });
}

function toggleComparacion(plato, detalle, formatoMoneda) {
    if (detalle.style.display === 'none') {
        const sin = plato.sinPromo;
        const con = plato.conPromo;
        if (!sin && !con) {
            detalle.innerHTML = '<p style="color:#8A8D9F">No hay datos para este plato.</p>';
            detalle.style.display = 'block';
            return;
        }
        let lift = null;
        let elasticidad = null;
        if (con && sin && sin.promedioUnidadesPorDia > 0 && con.promedioUnidadesPorDia > 0 && sin.totalUnidades > 0 && con.totalUnidades > 0) {
            lift = ((con.promedioUnidadesPorDia - sin.promedioUnidadesPorDia) / sin.promedioUnidadesPorDia) * 100;
            const precioBase = sin.totalDinero / sin.totalUnidades;
            const precioPromo = con.totalDinero / con.totalUnidades;
            if (precioBase > 0 && precioPromo !== precioBase) {
                const deltaQ = (con.promedioUnidadesPorDia - sin.promedioUnidadesPorDia) / sin.promedioUnidadesPorDia;
                const deltaP = (precioPromo - precioBase) / precioBase;
                if (deltaP !== 0) {
                    elasticidad = Math.abs(deltaQ / deltaP);
                }
            }
        }
        const metricasExtra = (lift !== null && elasticidad !== null) ? `
            <div class="metricas-avanzadas">
                <span class="metrica-badge">Lift: ${lift.toFixed(0)}% <i class="info-tooltip" data-tooltip="Mide cuánto aumentaron tus ventas. Ej: 100% significa que vendés el doble con la promo.">?</i></span>
                <span class="metrica-badge">Elasticidad: ${elasticidad.toFixed(1)} <i class="info-tooltip" data-tooltip="Sensibilidad al precio. Mayor a 1: ¡La promo es un éxito! Menor a 1: La gente lo compraría igual sin descuento.">?</i></span>
            </div>
        ` : '';
        const html = `
            <div class="comparacion-card">
                <p style="font-weight:700; color:#FFFFFF; margin:0 0 6px;">Rendimiento Diario Promedio - ${plato.nombre || 'Plato sin nombre'}</p>
                ${metricasExtra}
                <div class="comparacion-linea ${sin ? '' : 'sin-datos'}">
                    <span class="comparacion-tag">SIN PROMO</span>
                    <span>${sin ? `${sin.promedioUnidadesPorDia.toFixed(2)} unids/día` : 'Sin ventas'}</span>
                    <span>${sin ? formatoMoneda.format(sin.promedioDineroPorDia) + '/día' : ''}</span>
                </div>
                <div class="comparacion-linea ${con ? '' : 'sin-datos'}">
                    <span class="comparacion-tag comparacion-tag-promo">CON PROMO</span>
                    <span>${con ? `${con.promedioUnidadesPorDia.toFixed(2)} unids/día` : 'Sin ventas'}</span>
                    <span>${con ? formatoMoneda.format(con.promedioDineroPorDia) + '/día' : ''}</span>
                </div>
            </div>
        `;
        detalle.innerHTML = html;
        detalle.style.display = 'block';
    } else {
        detalle.style.display = 'none';
    }
}

async function cargarHorariosPico(token) {
    try {
        const resp = await fetch('/api/estadisticas/horarios-pico', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!resp.ok) throw new Error('Error al traer horarios pico');
        datosHorarios = await resp.json();
        inicializarHorariosPico();
    } catch (err) {
        console.error(err);
    }
}

function inicializarHorariosPico() {
    const select = document.getElementById('selectPlatoPico');
    if (!select) return;

    // Default: modo Plato
    modoPlatoHorarios();
}

function modoPlatoHorarios() {
    const btnPlato = document.getElementById('btnAnalisisPlato');
    const btnDia   = document.getElementById('btnAnalisisDia');
    if (btnPlato) btnPlato.classList.add('active');
    if (btnDia) btnDia.classList.remove('active');

    const select = document.getElementById('selectPlatoPico');
    if (select) {
        const platos = ['Todos los platos'].concat(
            [...new Set(datosHorarios.map(d => d.plato))].sort()
        );
        select.innerHTML = platos.map(p => `<option value="${p}">${p}</option>`).join('');
        select.value = 'Todos los platos';
        // Asegúrate de que el <select> esté visible
        select.style.display = '';
    }

    const heat = document.getElementById('heatmap-container');
    const rank = document.getElementById('day-ranking-container');
    if (heat) heat.classList.remove('hidden');
    if (rank) rank.classList.add('hidden');

    renderizarMapaCalor('Todos los platos');
}

function modoDiaHorarios() {
    const btnPlato = document.getElementById('btnAnalisisPlato');
    const btnDia   = document.getElementById('btnAnalisisDia');
    if (btnPlato) btnPlato.classList.remove('active');
    if (btnDia) btnDia.classList.add('active');

    const select = document.getElementById('selectPlatoPico');
    if (select) {
        const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
        select.innerHTML = dias.map(d => `<option value="${d}">${d}</option>`).join('');
        select.value = 'Lunes';
    }

    const heat = document.getElementById('heatmap-container');
    const rank = document.getElementById('day-ranking-container');
    if (heat) heat.classList.add('hidden');
    if (rank) rank.classList.remove('hidden');

    renderizarTopPorDia('Lunes');
}

function renderizarMapaCalor(filtro = 'Todos los platos') {
    const tabla = document.querySelector('.heatmap');
    if (!tabla) return;
    const tbody = tabla.querySelector('tbody');
    if (!tbody) return;

    const franjas = ['Mediodía','Tarde','Noche','Trasnoche'];
    const dias    = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

    let datosFiltrados = datosHorarios;
    if (filtro !== 'Todos los platos') {
        datosFiltrados = datosFiltrados.filter(d => d.plato === filtro);
    }

    const acum = {};
    datosFiltrados.forEach(d => {
        const key = `${d.dia}|${d.franja}`;
        acum[key] = (acum[key] || 0) + d.unidades;
    });

    let max = 0;
    Object.values(acum).forEach(v => { if (v > max) max = v; });
    max = max || 1;

    const filas = tbody.querySelectorAll('tr');
    filas.forEach(fila => {
        const primerTd = fila.querySelector('td');
        if (!primerTd) return;
        const dia = primerTd.textContent.trim();
        const celdas = fila.querySelectorAll('.heat-cell');
        celdas.forEach((celda, idx) => {
            const franja = franjas[idx];
            const key = `${dia}|${franja}`;
            const valor = acum[key] || 0;
            const alpha = valor / max;
            celda.style.background = `rgba(0,227,150,${0.05 + alpha * 0.85})`;
        });
    });
}

function renderizarTopPorDia(diaSeleccionado) {
    const contenedor = document.getElementById('day-ranking-list');
    if (!contenedor) return;

    const datosDia = datosHorarios.filter(d => d.dia === diaSeleccionado);
    const porPlato = {};

    datosDia.forEach(d => {
        if (!porPlato[d.plato]) {
            porPlato[d.plato] = { unidades: 0, recaudacion: 0 };
        }
        porPlato[d.plato].unidades += d.unidades;
        porPlato[d.plato].recaudacion += d.recaudacion;
    });

    const ranking = Object.entries(porPlato)
        .map(([nombre, data]) => ({ nombre, ...data }))
        .sort((a, b) => b.unidades - a.unidades)
        .slice(0, 5);

    if (ranking.length === 0) {
        contenedor.innerHTML = '<p style="color:#8A8D9F">Todavía no hay datos para este día.</p>';
        return;
    }

    const maxUnidades = ranking[0].unidades || 1;
    const formatoMoneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

    contenedor.innerHTML = ranking.map((plato, i) => {
        const ancho = Math.round((plato.unidades / maxUnidades) * 100);
        return `
            <div class="top-item">
                <span class="rank">${i + 1}</span>
                <div class="top-info">
                    <div class="top-header">
                        <span class="top-nombre">${plato.nombre}</span>
                        <span class="top-stats">${plato.unidades} u · ${formatoMoneda.format(plato.recaudacion)}</span>
                    </div>
                    <div class="barra-progreso">
                        <div class="barra-fill" style="width: ${ancho}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function cargarCombosSugeridos(token) {
    try {
        const resp = await fetch('/api/estadisticas/asociaciones', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!resp.ok) throw new Error('Error al traer combos sugeridos');
        const combos = await resp.json();
        renderizarCombosSugeridos(combos);
    } catch (err) {
        console.error(err);
    }
}

function renderizarCombosSugeridos(combos) {
    if (!combos || combos.length === 0) {
        const grid = document.querySelector('.combos-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="combo-card" style="grid-column: 1 / -1; align-items: center; justify-content: center; text-align: center; padding: 28px 20px;">
                    <p style="font-size:1rem; color:#8A8D9F; margin:0 0 8px;">📊 Todavía no hay suficientes datos de ventas combinadas.</p>
                    <p style="font-size:0.85rem; color:#6B7280; margin:0;">En este recuadro te vamos a recomendar combos cuando haya la suficiente información.</p>
                </div>
            `;
        }
        return;
    }
    for (let i = 1; i <= 3; i++) {
        const card = document.getElementById(`combo-card-${i}`);
        if (!card) continue;
        const combo = combos[i - 1];
        if (combo) {
            card.innerHTML = `
                <span class="combo-prod">${combo.productoA}</span>
                <span class="combo-mas">+</span>
                <span class="combo-prod">${combo.productoB}</span>
                <div class="coincidencia">${combo.confianza}% de coincidencia</div>
                <button class="btn-crear-combo">Crear Combo</button>
            `;
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    }
}
