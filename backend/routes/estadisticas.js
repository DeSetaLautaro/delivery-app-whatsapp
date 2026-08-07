const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/verificarToken');
const Pedido = require('../models/Pedido');
const mongoose = require('mongoose');

router.get('/', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;
        const { periodo = 'mes' } = req.query;

        // Definir rango de fechas según periodo seleccionado
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

        // 4) Ventas del período seleccionado (por día)
        const cantidadDias = periodo === 'hoy' ? 1 : (periodo === '7dias' ? 7 : 30);
        const ventasRecientes = [];
        for (let i = cantidadDias - 1; i >= 0; i--) {
            const inicioDia = new Date(fechaHoy0);
            inicioDia.setDate(inicioDia.getDate() - i);
            const finDia = new Date(inicioDia);
            finDia.setDate(finDia.getDate() + 1);

            const pedidosDia = pedidos.filter(p => {
                const fecha = new Date(p.fecha);
                return fecha >= inicioDia && fecha < finDia;
            });

            const totalDia = pedidosDia.reduce((s, p) => s + (p.total || 0), 0);
            ventasRecientes.push({
                fecha: inicioDia.toISOString().slice(0, 10),
                total: totalDia,
                cantidad: pedidosDia.length
            });
        }

        // 5) Clientes inactivos (último pedido hace más de 14 días)
        const fechaLimiteInactivo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const mapaTelefonos = new Map();

        pedidos.forEach(p => {
            const tel = (p.telefonoCliente || '').trim();
            if (!tel) return;
            const fecha = new Date(p.fecha);
            const ultima = mapaTelefonos.get(tel);
            if (!ultima || fecha > ultima) {
                mapaTelefonos.set(tel, fecha);
            }
        });

        let clientesInactivos = 0;
        mapaTelefonos.forEach((ultima, tel) => {
            if (ultima < fechaLimiteInactivo) clientesInactivos++;
        });

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

        res.status(200).json({
            totalVentas,
            cantidadPedidos,
            ticketPromedio,
            ventasRecientes,
            clientesInactivos,
            topPlatos,
            platosMenosPedidos
        });
    } catch (error) {
        console.error('[ERROR] Estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
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
            '🍦 Postre Helado'
        ];
        for (let i = 0; i < 50; i++) {
            const fecha = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
            const numItems = Math.floor(Math.random() * 3) + 1; // 1 a 3
            const itemsMock = [];
            let total = 0;
            for (let j = 0; j < numItems; j++) {
                const nombrePlato = nombresPlatos[Math.floor(Math.random() * nombresPlatos.length)];
                const precioUnitario = Math.floor(Math.random() * 12000) + 3000;
                const cantidad = Math.floor(Math.random() * 3) + 1; // 1 a 3
                const enPromocion = Math.random() < 0.3; // 30% de probabilidad
                const precioFinal = enPromocion ? Math.floor(precioUnitario * 0.8) : precioUnitario;
                itemsMock.push({
                    nombrePlato,
                    cantidad,
                    precio: precioFinal,
                    enPromocion
                });
                total += precioFinal * cantidad;
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

module.exports = router;
