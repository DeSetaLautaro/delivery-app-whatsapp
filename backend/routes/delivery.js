const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Pedido = require('../models/Pedido');
const DeliveryToken = require('../models/DeliveryToken');

async function getLocalIdPorToken(token) {
    if (!token) return null;
    const doc = await DeliveryToken.findOne({ token });
    return doc ? doc.localId : null;
}

// GET /api/delivery/pedidos?token=TOKEN
router.get('/pedidos', async (req, res) => {
    try {
        const { token } = req.query;
        const localId = await getLocalIdPorToken(token);
        if (!localId) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const mañana = new Date(hoy);
        mañana.setDate(mañana.getDate() + 1);

        const pedidos = await Pedido.find({
            localId,
            fecha: { $gte: hoy, $lt: mañana }
        }).sort({ fecha: 1 });

        res.json(pedidos);
    } catch (error) {
        console.error('Error en delivery pedidos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/delivery/pedidos/:id/estado?token=TOKEN
router.put('/pedidos/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { token } = req.query;
        const { estadoDelivery } = req.body;

        const estadosPermitidos = ['pendiente', 'en_viaje', 'entregado'];
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        if (!estadoDelivery || !estadosPermitidos.includes(estadoDelivery)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }

        const localId = await getLocalIdPorToken(token);
        if (!localId) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        const pedido = await Pedido.findById(id);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        if (String(pedido.localId) !== String(localId)) {
            return res.status(403).json({ error: 'No tenés permiso para actualizar este pedido' });
        }

        pedido.estadoDelivery = estadoDelivery;
        await pedido.save();

        res.json(pedido);
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
