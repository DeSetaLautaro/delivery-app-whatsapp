const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/verificarToken');
const Pedido = require('../models/Pedido');

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

        res.status(200).json({
            totalVentas,
            cantidadPedidos,
            ticketPromedio,
            ventasRecientes,
            clientesInactivos
        });
    } catch (error) {
        console.error('[ERROR] Estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;
