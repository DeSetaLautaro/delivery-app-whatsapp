require('dotenv').config();
const express   = require('express');
const router = express.Router();
const Usuario = require('../models/usuario'); // Asegurate de que la ruta a tu modelo sea la correcta
const fs = require('fs');
const path = require('path');
const MENU_PATH = path.join(__dirname, '../menu.json');

// Ruta PÚBLICA: Cualquier persona puede ver si está abierto o cerrado
// Se va a acceder desde: /api/publico/estadoLocal
router.get('/estadoLocal/:slugLocal', async (req, res) => {
    try {
        const usuario = await Usuario.findOne({ slug: req.params.slugLocal });
        if (!usuario) return res.status(404).json({ error: "Local no encontrado" });
        
        // Devolvemos solo el estado
        res.status(200).json({ abierto: usuario.abierto });
    } catch (error) {
        res.status(500).json({ error: "Error del servidor" });
    }
});

// Le ponemos /api/ adelante para saber que esto devuelve DATOS, no pantallas
router.get('/menu/:slugLocal', async (req, res) => {
    try {
        // 1. Como usamos los dos puntos (:slugLocal) en la ruta, se lee con req.params
        const slug = req.params.slugLocal; 

        // 2. Buscamos al usuario que tenga ESE slug (findOne, no findById)
        const usuario = await Usuario.findOne({ slug: slug });

        if (!usuario) {
            return res.status(404).json({ error: "Local no encontrado" });
        }

        // 3. Le devolvemos su lista de platos en JSON
        res.status(200).json(usuario.platos);

    } catch (error) {
        console.error("Error al traer el menú público:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});





// Ruta PÚBLICA: datos del perfil del local (número de WA + métodos de pago)
router.get('/perfil/:slugLocal', async (req, res) => {
    try {
        const usuario = await Usuario.findOne({ slug: req.params.slugLocal });
        if (!usuario) return res.status(404).json({ error: 'Local no encontrado' });
                res.json({
            nombre:         usuario.nombreDelLocal,
            whatsappNumero: usuario.telefono,
            metodosPago:    usuario.metodosPago || [],
            fotoPerfil:     usuario.fotoPerfil || '',
            temaMenu:       usuario.temaMenu || 'clasico'
        });
    } catch (e) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Ruta PÚBLICA: devuelve los grupos de toppings de un local filtrados por categoría.
// El cliente la llama cuando toca "+ Agregar" en un plato.
router.get('/toppings/:slugLocal/:categoria', async (req, res) => {
    try {
        const { slugLocal, categoria } = req.params;

        const usuario = await Usuario.findOne({ slug: slugLocal });
        if (!usuario) return res.status(404).json({ error: 'Local no encontrado' });

        // Filtramos solo los grupos cuyo categoriaDestino incluye la categoría pedida
        const grupos = usuario.gruposToppings.filter(g =>
            g.categoriaDestino.includes(categoria)
        );

        res.status(200).json(grupos); // puede ser [] si no hay toppings para esa cat
    } catch (error) {
        console.error('Error al traer toppings públicos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
