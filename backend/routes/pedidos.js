const express = require('express');
const router = express.Router();
const Pedido = require('../models/Pedido');
const Usuario = require('../models/usuario'); // Ajustá la ruta si tu archivo se llama distinto

// POST /api/pedidos
router.post('/', async (req, res) => {
    try {
        const { localId, slug, items, total, cliente } = req.body;

        // Resolvemos el local a partir del ID (si viene) o del slug
        let local = null;
        if (localId) {
            local = await Usuario.findById(localId);
        } else if (slug) {
            local = await Usuario.findOne({ slug });
        }

        if (!local) {
            return res.status(404).json({ error: 'Local no encontrado' });
        }

        // Creamos el pedido y lo guardamos
        const pedido = await Pedido.create({
            localId: local._id,
            cliente: cliente || '',
            items,
            total,
            estado: 'pendiente'
        });

        res.status(201).json({ mensaje: 'Pedido guardado', pedido });
    } catch (error) {
        console.error('Error al guardar pedido:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
