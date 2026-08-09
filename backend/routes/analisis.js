const express = require('express');
const router = express.Router();
const Pedido = require('../models/Pedido');
const Usuario = require('../models/usuario');
const verificarToken = require('../middleware/verificarToken');

router.get('/', verificarToken, async (req, res) => {
    try {
        const userId = req.usuario.id;

        const usuario = await Usuario.findById(userId);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const totalPlatos = usuario.platos ? usuario.platos.length : 0;

        const pedidos = await Pedido.find({ localId: userId }).sort({ fecha: 1 });

        const totalPedidos = pedidos.length;

        let ventasTotales = 0;
        let itemsVendidos = 0;
        const productoConteo = {};
        const ventasPorDia = {};

        pedidos.forEach(p => {
            ventasTotales += p.total || 0;
            const items = p.items || [];
            items.forEach(it => {
                itemsVendidos += it.cantidad || 1;
                const nombre = it.nombre || 'Sin nombre';
                productoConteo[nombre] = (productoConteo[nombre] || 0) + (it.cantidad || 1);
            });
            const fecha = p.fecha ? new Date(p.fecha) : new Date();
            const dia = fecha.toISOString().slice(0, 10);
            ventasPorDia[dia] = (ventasPorDia[dia] || 0) + (p.total || 0);
        });

        const topPlatos = Object.entries(productoConteo)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }));

        const pedidosPorDia = Object.entries(ventasPorDia)
            .map(([fecha, total]) => ({ fecha, total }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha));

        res.json({
            totalPlatos,
            totalPedidos,
            ventasTotales,
            itemsVendidos,
            topPlatos,
            pedidosPorDia
        });
    } catch (error) {
        console.error('Error en analisis:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
