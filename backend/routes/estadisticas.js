const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/verificarToken');
const Pedido = require('../models/Pedido');
const Resena = require('../models/Resena');
const Cliente = require('../models/Cliente');
const Visita = require('../models/Visita');
const mongoose = require('mongoose');

function formatoFechaLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

router.get('/', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;
        const { periodo = 'mes', fechaInicio: qFechaInicio, fechaFin: qFechaFin } = req.query;

        // Definir rango de fechas según periodo o parámetros explícitos
        const fechaHoy0 = new Date();
        fechaHoy0.setHours(0,0,0,0);
        const fechaFin = new Date(fechaHoy0);
        fechaFin.setDate(fechaFin.getDate() + 1); // hasta mañana (excluido)

        let fechaInicio = new Date(fechaHoy0);
        if (periodo === 'hoy') {
            // inicio = hoy
        } else if (periodo === '7dias') {
            fechaInicio.setDate(fechaInicio.getDate() - 6);
        } else { // 'mes' por defecto
            fechaInicio = new Date(fechaHoy0.getFullYear(), fechaHoy0.getMonth(), 1);
        }
        if (qFechaInicio) {
            const parsedIni = new Date(qFechaInicio);
            if (!isNaN(parsedIni)) {
                fechaInicio = parsedIni;
                fechaInicio.setHours(0,0,0,0);
            }
        }
        if (qFechaFin) {
            const parsedFin = new Date(qFechaFin);
            if (!isNaN(parsedFin)) {
                // fin inclusive hasta fin de día, luego se vuelve exclusivo sumando un día
                fechaFin = new Date(parsedFin);
                fechaFin.setHours(23,59,59,999);
                fechaFin.setDate(fechaFin.getDate() + 1); // ahora es exclusivo (empieza al día siguiente)
            }
        }

        // Traemos todos los pedidos del local dentro del periodo seleccionado
        const pedidos = await Pedido.find({
            localId,
            fecha: { $gte: fechaInicio, $lt: fechaFin }
        });

        // 1) Total vendido
        let totalVentas = 0;
        pedidos.forEach(p => {
            totalVentas += (p.total || 0);
        });

        // 2) Cantidad de pedidos
        const cantidadPedidos = pedidos.length;

        // 3) Ticket promedio
        const ticketPromedio = cantidadPedidos > 0 ? totalVentas / cantidadPedidos : 0;

        // 4) Ventas del período seleccionado (granularidad dinámica)
        const diffMs = fechaFin - fechaInicio;
        const diffDias = Math.ceil(diffMs / (1000*60*60*24));
        const granularidad = diffDias <= 1 ? 'hora' : (diffDias <= 60 ? 'dia' : 'mes');

        const serieMap = {};
        pedidos.forEach(p => {
            const fecha = new Date(p.fecha);
            let clave;
            if (granularidad === 'hora') {
                clave = String(fecha.getHours()).padStart(2, '0') + ':00 hs';
            } else if (granularidad === 'dia') {
                clave = fecha.toISOString().slice(0, 10);
            } else { // mes
                clave = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2, '0')}`;
            }
            if (!serieMap[clave]) serieMap[clave] = { total: 0, cantidad: 0 };
            serieMap[clave].total += p.total || 0;
            serieMap[clave].cantidad += 1;
        });

        const ventasRecientes = Object.keys(serieMap)
            .sort((a, b) => {
                if (granularidad === 'hora') return a.localeCompare(b, 'es-AR', { numeric: true });
                return a.localeCompare(b);
            })
            .map(clave => ({
                fecha: clave,
                recaudacion: serieMap[clave].total,
                cantidadPedidos: serieMap[clave].cantidad
            }));

        const labels = ventasRecientes.map(v => v.fecha);
        const dataIngresos = ventasRecientes.map(v => v.recaudacion || 0);
        const dataPedidos = ventasRecientes.map(v => v.cantidadPedidos || 0);

        // 5) Métricas de clientes (dentro del período seleccionado)
        const fechaLimiteInactivo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const fechaLimiteVIP = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const fechaLimiteRiesgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const mapaClientes = new Map();
        pedidos.forEach(p => {
            const tel = (p.telefonoCliente || '').trim();
            if (!tel) return;
            const info = mapaClientes.get(tel) || { pedidos: 0, total: 0, ultimaFecha: null };
            info.pedidos += 1;
            info.total += (p.total || 0);
            const f = new Date(p.fecha);
            if (!info.ultimaFecha || f > info.ultimaFecha) {
                info.ultimaFecha = f;
            }
            mapaClientes.set(tel, info);
        });

        const clientesArray = [...mapaClientes.entries()].map(([telefono, info]) => ({
            telefono,
            pedidos: info.pedidos,
            total: info.total,
            ultimaFecha: info.ultimaFecha
        }));

        const totalClientesUnicos = clientesArray.length;
        const clientesRecompra = clientesArray.filter(c => c.pedidos > 1).length;

        // Cálculo de VIP: top 20% de frecuencia (percentil 80) y recencia <= 30 días
        let percentil80 = 0;
        if (clientesArray.length > 0) {
            const pedidosOrdenados = clientesArray
                .map(c => c.pedidos)
                .sort((a, b) => a - b);
            percentil80 = pedidosOrdenados[Math.floor(0.8 * (pedidosOrdenados.length - 1))];
        }
        const clientesFieles = clientesArray.filter(c => {
            if (!c.ultimaFecha) return false;
            if (new Date(c.ultimaFecha) < fechaLimiteVIP) return false;
            return c.pedidos > percentil80;
        }).length;

        const clientesEnRiesgo = clientesArray.filter(c =>
            c.pedidos > 1 &&
            c.ultimaFecha &&
            new Date(c.ultimaFecha) < fechaLimiteRiesgo
        ).length;
        const tasaRecompra = totalClientesUnicos > 0 ? (clientesRecompra / totalClientesUnicos) * 100 : 0;

        const topClientes = clientesArray
            .map(c => ({
                telefono: c.telefono,
                pedidos: c.pedidos,
                gastoTotal: c.total,
                ultimaFecha: c.ultimaFecha
            }))
            .sort((a, b) => b.pedidos - a.pedidos)
            .slice(0, 50);

        // 6) Top platos más vendidos (agregación)
        const topPlatos = await Pedido.aggregate([
            { $match: { localId: new mongoose.Types.ObjectId(localId), fecha: { $gte: fechaInicio, $lt: fechaFin } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.nombrePlato',
                    totalUnidades: { $sum: '$items.cantidad' },
                    recaudacion: {
                        $sum: {
                            $multiply: [
                                '$items.cantidad',
                                { $ifNull: ['$items.precio', 0] }
                            ]
                        }
                    }
                }
            },
            { $sort: { totalUnidades: -1 } },
            { $limit: 20 }
        ]);

        // 7) Platos menos pedidos (para "Platos Muertos")
        const platosMenosPedidos = await Pedido.aggregate([
            { $match: { localId: new mongoose.Types.ObjectId(localId), fecha: { $gte: fechaInicio, $lt: fechaFin } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.nombrePlato',
                    totalUnidades: { $sum: '$items.cantidad' },
                    recaudacion: {
                        $sum: {
                            $multiply: [
                                '$items.cantidad',
                                { $ifNull: ['$items.precio', 0] }
                            ]
                        }
                    },
                    ultimaVenta: { $max: '$fecha' }
                }
            },
            { $sort: { totalUnidades: 1 } },
            { $limit: 3 }
        ]);

        const visitasEnPeriodo = await Visita.find({
            localId: localId,
            fecha: { $gte: formatoFechaLocal(fechaInicio), $lte: formatoFechaLocal(fechaFin) }
        });
        const totalVisitas = visitasEnPeriodo.reduce((sum, v) => sum + (v.cantidad || 0), 0);
        const tasaDeConversion = totalVisitas > 0 ? (cantidadPedidos / totalVisitas) * 100 : 0;

        // Métricas actuales para comparación
        const ingresosActuales = totalVentas || 0;
        const pedidosActuales = cantidadPedidos || 0;
        const ticketActual = pedidosActuales > 0 ? ingresosActuales / pedidosActuales : 0;
        const visitasActuales = totalVisitas || 0;
        const conversionActual = visitasActuales > 0 ? (pedidosActuales / visitasActuales) * 100 : 0;

        // Calcular período anterior y sus métricas
        const duracionMs = (fechaFin.getTime() - fechaInicio.getTime());
        const inicioAnterior = new Date(fechaInicio.getTime() - duracionMs);
        const finAnterior = new Date(fechaInicio.getTime()); // exclusivo

        const pedidosAnteriores = await Pedido.find({
            localId,
            fecha: { $gte: inicioAnterior, $lt: finAnterior }
        });

        const ingresosAnteriores = pedidosAnteriores.reduce((sum, p) => sum + (p.total || 0), 0);
        const pedidosAnterioresCount = pedidosAnteriores.length;
        const ticketAnterior = pedidosAnterioresCount > 0 ? ingresosAnteriores / pedidosAnterioresCount : 0;

        const visitasAnterioresDoc = await Visita.find({
            localId,
            fecha: { $gte: formatoFechaLocal(inicioAnterior), $lte: formatoFechaLocal(finAnterior) }
        });
        const visitasAnteriores = visitasAnterioresDoc.reduce((sum, v) => sum + (v.cantidad || 0), 0);
        const conversionAnterior = visitasAnteriores > 0 ? (pedidosAnterioresCount / visitasAnteriores) * 100 : 0;

        const calcPct = (actual, anterior) => {
            if (anterior === 0) return actual > 0 ? 100 : 0;
            return ((actual - anterior) / anterior) * 100;
        };

        const comparaciones = {
            ingresos:   { valor: ingresosActuales, porcentaje: calcPct(ingresosActuales, ingresosAnteriores) },
            pedidos:    { valor: pedidosActuales, porcentaje: calcPct(pedidosActuales, pedidosAnterioresCount) },
            ticket:     { valor: ticketActual, porcentaje: calcPct(ticketActual, ticketAnterior) },
            visitas:    { valor: visitasActuales, porcentaje: calcPct(visitasActuales, visitasAnteriores) },
            conversion: { valor: conversionActual, porcentaje: calcPct(conversionActual, conversionAnterior) }
        };

        res.status(200).json({
            totalVentas,
            cantidadPedidos,
            ticketPromedio,
            ventasRecientes,
            granularidad,
            labels,
            dataIngresos,
            dataPedidos,
            totalClientesUnicos,
            tasaRecompra,
            clientesFieles,
            clientesEnRiesgo,
            topClientes,
            topPlatos,
            platosMenosPedidos,
            totalVisitas,
            tasaDeConversion,
            comparaciones
        });
    } catch (error) {
        console.error('[ERROR] Estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

router.get('/tendencias', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;
        const localObjId = new mongoose.Types.ObjectId(localId);

        const { fechaInicio, fechaFin } = req.query;
        const hoy = new Date();
        let inicio = new Date(hoy);
        inicio.setHours(0,0,0,0);
        inicio.setDate(inicio.getDate() - 6); // por defecto últimos 7 días incluido hoy
        let fin = new Date(hoy);
        fin.setHours(23,59,59,999);

        if (fechaInicio) {
            const pI = new Date(fechaInicio);
            if (!isNaN(pI)) {
                inicio = pI;
                inicio.setHours(0,0,0,0);
            }
        }
        if (fechaFin) {
            const pF = new Date(fechaFin);
            if (!isNaN(pF)) {
                fin = pF;
                fin.setHours(23,59,59,999);
            }
        }

        const duracion = fin.getTime() - inicio.getTime();
        const inicioAnterior = new Date(inicio.getTime() - duracion);

        const tendenciasData = await Pedido.aggregate([
            {
                $match: {
                    localId: localObjId,
                    fecha: { $gte: inicioAnterior, $lte: fin }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.nombrePlato',
                    ventasActuales: {
                        $sum: {
                            $cond: [
                                { $gte: ['$fecha', inicio] },
                                '$items.cantidad',
                                0
                            ]
                        }
                    },
                    ventasAnteriores: {
                        $sum: {
                            $cond: [
                                { $lt: ['$fecha', inicio] },
                                '$items.cantidad',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const tendencias = tendenciasData
            .map(t => {
                const actual = t.ventasActuales || 0;
                const anterior = t.ventasAnteriores || 0;
                if (actual < 3) return null;
                let crecimiento = 0;
                let esNuevo = false;
                if (anterior === 0) {
                    crecimiento = 100;
                    esNuevo = true;
                } else if (actual > anterior) {
                    crecimiento = ((actual - anterior) / anterior) * 100;
                } else {
                    return null;
                }
                return {
                    plato: t._id,
                    ventasActuales: actual,
                    ventasAnteriores: anterior,
                    crecimientoPorcentaje: Math.round(crecimiento),
                    esNuevo
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.crecimientoPorcentaje - a.crecimientoPorcentaje)
            .slice(0, 3);

        res.json(tendencias);
    } catch (error) {
        console.error('[ERROR] Tendencias:', error);
        res.status(500).json({ error: 'Error al obtener tendencias de platos' });
    }
});

router.get('/explorador-promos', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;
        const localObjId = new mongoose.Types.ObjectId(localId);

        const agrupado = await Pedido.aggregate([
            { $match: { localId: localObjId } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: {
                        nombre: '$items.nombrePlato',
                        enPromo: { $ifNull: ['$items.enPromocion', false] }
                    },
                    totalUnidades: { $sum: '$items.cantidad' },
                    totalDinero: { $sum: { $multiply: ['$items.cantidad', { $ifNull: ['$items.precio', 0] }] } },
                    dias: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } } }
                }
            },
            {
                $project: {
                    nombre: '$_id.nombre',
                    enPromo: '$_id.enPromo',
                    totalUnidades: 1,
                    totalDinero: 1,
                    cantidadDias: { $size: '$dias' }
                }
            },
            {
                $project: {
                    nombre: 1,
                    enPromo: 1,
                    totalUnidades: 1,
                    totalDinero: 1,
                    promedioUnidadesPorDia: { $cond: [{ $eq: ['$cantidadDias', 0] }, 0, { $divide: ['$totalUnidades', '$cantidadDias'] }] },
                    promedioDineroPorDia: { $cond: [{ $eq: ['$cantidadDias', 0] }, 0, { $divide: ['$totalDinero', '$cantidadDias'] }] }
                }
            }
        ]);

        const mapaPlatos = {};
        agrupado.forEach(item => {
            if (!mapaPlatos[item.nombre]) {
                mapaPlatos[item.nombre] = {
                    nombre: item.nombre,
                    actualmenteEnPromo: false,
                    conPromo: null,
                    sinPromo: null
                };
            }
            const plato = mapaPlatos[item.nombre];
            const metricas = {
                promedioUnidadesPorDia: item.promedioUnidadesPorDia,
                promedioDineroPorDia: item.promedioDineroPorDia,
                totalUnidades: item.totalUnidades,
                totalDinero: item.totalDinero
            };
            if (item.enPromo) {
                plato.actualmenteEnPromo = true;
                plato.conPromo = metricas;
            } else {
                plato.sinPromo = metricas;
            }
        });

        res.json(Object.values(mapaPlatos));
    } catch (error) {
        console.error('[ERROR] Explorador promos:', error);
        res.status(500).json({ error: 'Error al obtener explorador de promociones' });
    }
});

router.post('/mock', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;

        const pedidosMock = [];
        const nombresPlatos = [
            '🍔 Triple Bacon',
            '🍕 Muzza XL',
            '🥗 Ensalada César',
            '🌮 Taco Mexicano',
            '🍟 Papas Cheddar',
            '🍝 Fideos con Crema',
            '🥟 Empanadas de Carne',
            '🍗 Pollo al Spiedo',
            '🥙 Lomo Completo',
            '🍦 Postre Helado',
            '🥤 Coca-Cola',
            '🥑 Guacamole'
        ];
        // Combos "ancla" para que el análisis de asociaciones tenga datos de sobra
        const combosFijos = [
            [   // Combo clásico: Pizza + Coca
                { nombrePlato: '🍕 Muzza XL', cantidad: 1, precio: 8000, enPromocion: false },
                { nombrePlato: '🥤 Coca-Cola', cantidad: 1, precio: 2000, enPromocion: false }
            ],
            [   // Combo hamburguesa + papas
                { nombrePlato: '🍔 Triple Bacon', cantidad: 1, precio: 9000, enPromocion: false },
                { nombrePlato: '🍟 Papas Cheddar', cantidad: 1, precio: 3500, enPromocion: false }
            ],
            [   // Combo mexicano
                { nombrePlato: '🌮 Taco Mexicano', cantidad: 1, precio: 7500, enPromocion: false },
                { nombrePlato: '🥑 Guacamole', cantidad: 1, precio: 2500, enPromocion: false }
            ]
        ];
        for (let i = 0; i < 50; i++) {
            const fecha = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
            let itemsMock = [];
            let total = 0;

            // Los primeros 45 pedidos son combos repetidos a propósito
            if (i < 15) {
                itemsMock = combosFijos[0].map(it => ({ ...it }));
                total = itemsMock.reduce((s, it) => s + it.precio * it.cantidad, 0);
            } else if (i < 30) {
                itemsMock = combosFijos[1].map(it => ({ ...it }));
                total = itemsMock.reduce((s, it) => s + it.precio * it.cantidad, 0);
            } else if (i < 45) {
                itemsMock = combosFijos[2].map(it => ({ ...it }));
                total = itemsMock.reduce((s, it) => s + it.precio * it.cantidad, 0);
            } else {
                // Resto: pedidos aleatorios como antes
                const numItems = Math.floor(Math.random() * 3) + 1;
                for (let j = 0; j < numItems; j++) {
                    const nombrePlato = nombresPlatos[Math.floor(Math.random() * nombresPlatos.length)];
                    const precioUnitario = Math.floor(Math.random() * 12000) + 3000;
                    const cantidad = Math.floor(Math.random() * 3) + 1;
                    const enPromocion = Math.random() < 0.3;
                    const precioFinal = enPromocion ? Math.floor(precioUnitario * 0.8) : precioUnitario;
                    itemsMock.push({
                        nombrePlato,
                        cantidad,
                        precio: precioFinal,
                        enPromocion
                    });
                    total += precioFinal * cantidad;
                }
            }
            pedidosMock.push({
                localId,
                items: itemsMock,
                total,
                fecha,
                telefonoCliente: `11-5555-${String(i).padStart(4, '0')}`,
                direccion: 'Mock Street 123',
                estado: 'pendiente',
                estadoDelivery: 'pendiente'
            });
        }

        await Pedido.insertMany(pedidosMock);

        const operacionesClientes = pedidosMock.map(p => ({
            updateOne: {
                filter: { localId: new mongoose.Types.ObjectId(localId), telefono: p.telefonoCliente },
                update: {
                    $inc: { cantidadPedidos: 1 },
                    $set: { ultimaFechaPedido: p.fecha },
                    $addToSet: { direcciones: p.direccion }
                },
                upsert: true
            }
        }));
        await Cliente.bulkWrite(operacionesClientes);

        res.status(200).json({ ok: true, mensaje: '50 pedidos de prueba generados' });
    } catch (error) {
        console.error('[ERROR] Mock data:', error);
        res.status(500).json({ error: 'Error al generar pedidos de prueba' });
    }
});

// ============================================================
// RUTA: GET /api/estadisticas/asociaciones
// ============================================================
router.get('/asociaciones', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 90);
        const pedidos = await Pedido.find({ localId, fecha: { $gte: fechaLimite } }).select('items');

        const frecuenciaIndividual = {};
        const frecuenciaPares = {};

        for (const pedido of pedidos) {
            const items = pedido.items || [];
            const nombres = [];
            for (const it of items) {
                const nombre = (it.nombrePlato || it.nombre || '').trim();
                if (nombre && !nombres.includes(nombre)) {
                    nombres.push(nombre);
                }
            }
            if (nombres.length === 0) continue;

            for (const n of nombres) {
                frecuenciaIndividual[n] = (frecuenciaIndividual[n] || 0) + 1;
            }

            for (let i = 0; i < nombres.length; i++) {
                for (let j = i + 1; j < nombres.length; j++) {
                    const a = nombres[i] < nombres[j] ? nombres[i] : nombres[j];
                    const b = nombres[i] < nombres[j] ? nombres[j] : nombres[i];
                    const key = `${a}|${b}`;
                    frecuenciaPares[key] = (frecuenciaPares[key] || 0) + 1;
                }
            }
        }

        const resultados = [];
        for (const [key, frecuencia] of Object.entries(frecuenciaPares)) {
            if (frecuencia < 4) continue; // soporte mínimo >3
            const [prodA, prodB] = key.split('|');
            const freqA = frecuenciaIndividual[prodA] || 0;
            const freqB = frecuenciaIndividual[prodB] || 0;
            if (freqA === 0 || freqB === 0) continue;
            const confianzaA = (frecuencia / freqA) * 100;
            const confianzaB = (frecuencia / freqB) * 100;
            const confianza = Math.max(confianzaA, confianzaB);
            if (confianza > 20) {
                resultados.push({
                    productoA: prodA,
                    productoB: prodB,
                    confianza: Math.round(confianza)
                });
            }
        }

        resultados.sort((a, b) => b.confianza - a.confianza);
        res.status(200).json(resultados.slice(0, 3));
    } catch (error) {
        console.error('[ERROR] Asociaciones:', error);
        res.status(500).json({ error: 'Error al obtener asociaciones de productos' });
    }
});

// ============================================================
// RUTA: GET /api/estadisticas/retencion
// ============================================================
router.get('/retencion', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;
        const { fechaInicio, fechaFin } = req.query;

        const hoy = new Date();
        hoy.setHours(23,59,59,999);

        let inicio = new Date();
        inicio.setHours(0,0,0,0);
        inicio.setDate(inicio.getDate() - 30);
        let fin = hoy;

        if (fechaInicio) {
            const parsedI = new Date(fechaInicio);
            if (!isNaN(parsedI)) {
                inicio = parsedI;
                inicio.setHours(0,0,0,0);
            }
        }
        if (fechaFin) {
            const parsedF = new Date(fechaFin);
            if (!isNaN(parsedF)) {
                fin = parsedF;
                fin.setHours(23,59,59,999);
            }
        }

        const localObjId = new mongoose.Types.ObjectId(localId);

        // Primer pedido por cliente
        const primeros = await Pedido.aggregate([
            { $match: { localId: localObjId } },
            { $group: { _id: { $trim: { input: '$telefonoCliente' } }, primerPedido: { $min: '$fecha' } } }
        ]);
        const mapaPrimerPedido = {};
        primeros.forEach(doc => {
            mapaPrimerPedido[doc._id] = new Date(doc.primerPedido);
        });

        // Pedidos dentro del rango
        const pedidosFiltrados = await Pedido.find({
            localId: localObjId,
            telefonoCliente: { $ne: '' },
            fecha: { $gte: inicio, $lte: fin }
        });

        // Frecuencia en el período
        const freqEnPeriodo = {};
        pedidosFiltrados.forEach(p => {
            const tel = (p.telefonoCliente || '').trim();
            if (!tel) return;
            freqEnPeriodo[tel] = (freqEnPeriodo[tel] || 0) + 1;
        });

        // Segmentos
        const frecuentes = [];
        const regulares = [];
        const ocasionales = [];
        Object.entries(freqEnPeriodo).forEach(([tel, count]) => {
            if (count >= 3) frecuentes.push(tel);
            else if (count === 2) regulares.push(tel);
            else if (count === 1) ocasionales.push(tel);
        });

        // Adquisición
        let nuevos = 0;
        let nuevosRetenidos = 0;
        Object.keys(freqEnPeriodo).forEach(tel => {
            const primer = mapaPrimerPedido[tel];
            if (!primer) return;
            if (primer >= inicio && primer <= fin) {
                nuevos++;
                if (freqEnPeriodo[tel] > 1) nuevosRetenidos++;
            }
        });

        res.status(200).json({
            segmentacion: {
                frecuentes: frecuentes.length,
                regulares: regulares.length,
                ocasionales: ocasionales.length
            },
            adquisicion: {
                nuevos,
                nuevosRetenidos
            }
        });
    } catch (error) {
        console.error('[ERROR] Retención:', error);
        res.status(500).json({ error: 'Error al obtener retención' });
    }
});

// ============================================================
// RUTA: GET /api/estadisticas/horarios-pico
// ============================================================
router.get('/horarios-pico', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;

        const datos = await Pedido.aggregate([
            { $match: { localId: new mongoose.Types.ObjectId(localId) } },
            { $unwind: '$items' },
            {
                $addFields: {
                    diaNum: { $dayOfWeek: { date: '$fecha', timezone: 'America/Argentina/Buenos_Aires' } },
                    hora:   { $hour:    { date: '$fecha', timezone: 'America/Argentina/Buenos_Aires' } }
                }
            },
            {
                $addFields: {
                    dia: {
                        $let: {
                            vars: {
                                arr: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
                            },
                            in: { $arrayElemAt: ['$$arr', { $subtract: ['$diaNum', 1] }] }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: { dia: '$dia', hora: '$hora', plato: '$items.nombrePlato' },
                    unidades: { $sum: '$items.cantidad' },
                    recaudacion: { $sum: { $multiply: ['$items.cantidad', { $ifNull: ['$items.precio', 0] }] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    dia: '$_id.dia',
                    hora: '$_id.hora',
                    plato: '$_id.plato',
                    unidades: 1,
                    recaudacion: 1
                }
            }
        ]);

        res.status(200).json(datos);
    } catch (error) {
        console.error('[ERROR] Horarios pico:', error);
        res.status(500).json({ error: 'Error al obtener horarios pico' });
    }
});

// ============================================================
// RUTA: GET /api/estadisticas/resenas/kpis
// ============================================================
router.get('/resenas/kpis', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;
        const resenas = await Resena.find({ localId });
        const totalResenas = resenas.length;
        let puntuacionPromedio = 0;
        let votosFavor = 0;
        let votosContra = 0;
        let criticasValidadas = 0;
        resenas.forEach(r => {
            puntuacionPromedio += r.estrellas || 0;
            votosFavor += r.votosFavor || 0;
            votosContra += r.votosContra || 0;
            if (r.estrellas <= 2) criticasValidadas++;
        });
        puntuacionPromedio = totalResenas ? puntuacionPromedio / totalResenas : 0;
        const votosTotales = votosFavor + votosContra;
        const aprobacionComunitaria = votosTotales > 0 ? (votosFavor / votosTotales) * 100 : 0;
        res.status(200).json({ puntuacionPromedio, totalResenas, aprobacionComunitaria, criticasValidadas });
    } catch (error) {
        console.error('[ERROR] KPIs reseñas:', error);
        res.status(500).json({ error: 'Error al obtener KPIs de reseñas' });
    }
});

// ============================================================
// RUTA: GET /api/estadisticas/resenas
// ============================================================
router.get('/resenas', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;
        const { orden = 'cronologico' } = req.query;
        let sort = { fecha: -1 };
        if (orden === 'relevante') sort = { votosFavor: -1, fecha: -1 };
        const resenas = await Resena.find({ localId }).sort(sort);
        res.status(200).json(resenas);
    } catch (error) {
        console.error('[ERROR] Lista reseñas:', error);
        res.status(500).json({ error: 'Error al obtener reseñas' });
    }
});

module.exports = router;
