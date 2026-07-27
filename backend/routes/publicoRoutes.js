const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario'); // Asegurate de que la ruta a tu modelo sea la correcta

// Ruta PÚBLICA: Cualquier persona puede ver si está abierto o cerrado
// Se va a acceder desde: /api/publico/estadoLocal
router.get('/estadoLocal', async (req, res) => {
    try {
        // Como por ahora es un MVP de un solo local, buscamos el primer usuario que haya
        // (A futuro, acá buscarías por el ID del local que te pase el cliente)
        const local = await Usuario.findOne().select('abierto'); 
        
        if (!local) {
            return res.status(404).json({ error: "Local no encontrado" });
        }
        
        res.json({ abierto: local.abierto });
    } catch (error) {
        console.error("Error al leer estado público:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ¡Acá a futuro vas a poner también la ruta pública para leer los platos del menú!
// router.get('/menu', async (req, res) => { ... });

module.exports = router;