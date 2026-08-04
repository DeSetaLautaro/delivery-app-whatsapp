const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Pedido = require('../models/Pedido');

// GET /api/delivery/pedidos?token=ID_DEL_LOCAL
router.get('/pedidos', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || !mongoose.Types.ObjectId.isValid(token)) {
            return res.status(400).json({ error: 'Token inválido' });
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const mañana = new Date(hoy);
        mañana.setDate(mañana.getDate() + 1);

        const pedidos = await Pedido.find({
            localId: token,
            fecha: { $gte: hoy, $lt: mañana }
        }).sort({ fecha: 1 });

        res.json(pedidos);
    } catch (error) {
        console.error('Error en delivery pedidos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/delivery/pedidos/:id/estado
router.put('/pedidos/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estadoDelivery } = req.body;

        const estadosPermitidos = ['pendiente', 'en_viaje', 'entregado'];
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        if (!estadoDelivery || !estadosPermitidos.includes(estadoDelivery)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }

        const pedido = await Pedido.findByIdAndUpdate(
            id,
            { estadoDelivery },
            { new: true }
        );

        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        res.json(pedido);
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
