const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario');
const Resena = require('../models/Resena');

// GET /:slug -> devuelve reseñas públicas (si el local las activó)
router.get('/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        const local = await Usuario.findOne({ slug });
        if (!local) return res.status(404).json({ error: 'Local no encontrado' });

        if (!local.resenasPublicas) return res.json([]);

        const resenas = await Resena.find({ localId: local._id, publica: true })
            .sort({ fecha: -1 })
            .limit(100);

        res.json(resenas);
    } catch (error) {
        console.error('Error al obtener reseñas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST / -> permite crear una reseña (si el local la acepta)
router.post('/', async (req, res) => {
    try {
        const { slug, comentario, publica } = req.body;
        const estrellas = req.body.estrellas ?? 5;

        if (!slug) {
            return res.status(400).json({ error: 'Datos inválidos' });
        }

        const local = await Usuario.findOne({ slug });
        if (!local) return res.status(404).json({ error: 'Local no encontrado' });
        if (!local.permitirResenas) {
            return res.status(403).json({ error: 'El local no acepta reseñas' });
        }

        const nueva = await Resena.create({
            localId: local._id,
            estrellas,
            comentario: comentario || '',
            publica: !!(publica && local.resenasPublicas !== false),
            fecha: new Date(),
            votosFavor: 0,
            votosContra: 0
        });

        res.status(201).json(nueva);
    } catch (error) {
        console.error('Error al crear reseña:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PATCH /:id/voto -> permite votar una reseña
router.patch('/:id/voto', async (req, res) => {
    try {
        const { id } = req.params;
        const { voto } = req.body;

        if (!['acuerdo', 'desacuerdo'].includes(voto)) {
            return res.status(400).json({ error: 'Voto inválido' });
        }

        const resena = await Resena.findById(id);
        if (!resena) return res.status(404).json({ error: 'Reseña no encontrada' });

        const local = await Usuario.findById(resena.localId);
        if (!local || !local.permitirVotosResenas) {
            return res.status(403).json({ error: 'El local no permite votos comunitarios' });
        }

        if (voto === 'acuerdo') {
            resena.votosFavor = (resena.votosFavor || 0) + 1;
        } else {
            resena.votosContra = (resena.votosContra || 0) + 1;
        }

        await resena.save();
        res.json({ votosFavor: resena.votosFavor, votosContra: resena.votosContra });
    } catch (error) {
        console.error('Error al votar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
