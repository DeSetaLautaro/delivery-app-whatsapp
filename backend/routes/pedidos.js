const express = require('express');
const router = express.Router();
const Pedido = require('../models/Pedido');
const Usuario = require('../models/usuario'); // Ajustá la ruta si tu archivo se llama distinto
const verificarToken = require('../middleware/verificarToken');

// GET /api/pedidos (protegido)
router.get('/', verificarToken, async (req, res) => {
    try {
        const pedidos = await Pedido.find({ localId: req.usuario.id }).sort({ fecha: -1 });
        res.json(pedidos);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/pedidos
router.post('/', async (req, res) => {
    try {
        const { localId, slug, items, total, cliente, metodoPago, direccion, notas, telefonoCliente } = req.body;

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

        // Día gastronómico: restamos 5 horas para contemplar los nocturnos
        const ahora = new Date();
        const fechaTurno = new Date(ahora.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

        // Buscamos el último pedido del turno actual para ese local
        const ultimoPedido = await Pedido.findOne({
            localId: local._id,
            fechaTurno
        }).sort({ numeroDiario: -1 });

        const numeroDiario = ultimoPedido && ultimoPedido.numeroDiario ? ultimoPedido.numeroDiario + 1 : 1;

        // Creamos el pedido y lo guardamos
        const pedido = await Pedido.create({
            localId: local._id,
            cliente: cliente || '',
            items,
            total,
            metodoPago: metodoPago || 'Efectivo',
            estado: 'pendiente',
            numeroDiario,
            fechaTurno,
            direccion: direccion || '',
            notas: notas || '',
            telefonoCliente: telefonoCliente || ''
        });

        res.status(201).json({ mensaje: 'Pedido guardado', pedido });
    } catch (error) {
        console.error('Error al guardar pedido:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
