const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/verificarToken');
const Pedido = require('../models/Pedido');
const mongoose = require('mongoose');

router.get('/', verificarToken, async (req, res) => {
    try {
        const localId = req.usuario.id || req.usuario._id;

        // Traemos todos los pedidos del local
        const pedidos = await Pedido.find({ localId });

        // 1) Total vendido
        let totalVentas = 0;
        pedidos.forEach(p => {
            totalVentas += (p.total || 0);
        });

        // 2) Cantidad de pedidos
        const cantidadPedidos = pedidos.length;

        // 3) Ticket promedio
        const ticketPromedio = cantidadPedidos > 0 ? totalVentas / cantidadPedidos : 0;

        // 4) Ventas de los últimos 7 días
        const hoy = new Date();
        hoy.setHours(0,0,0,0);

        const ventasRecientes = [];
        for (let i = 6; i >= 0; i--) {
            const inicio = new Date(hoy);
            inicio.setDate(inicio.getDate() - i);
            const fin = new Date(inicio);
            fin.setDate(fin.getDate() + 1);

            const pedidosDia = pedidos.filter(p => {
                const fecha = new Date(p.fecha);
                return fecha >= inicio && fecha < fin;
            });

            const totalDia = pedidosDia.reduce((s, p) => s + (p.total || 0), 0);
            ventasRecientes.push({
                fecha: inicio.toISOString().slice(0, 10),
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
            { $match: { localId: new mongoose.Types.ObjectId(localId) } },
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
            { $match: { localId: new mongoose.Types.ObjectId(localId) } },
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
                itemsMock.push({
                    nombrePlato,
                    cantidad,
                    precio: precioUnitario
                });
                total += precioUnitario * cantidad;
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

module.exports = router;
