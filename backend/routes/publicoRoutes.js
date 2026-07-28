require('dotenv').config();
const express   = require('express');
const router = express.Router();
const Usuario = require('../models/usuario'); // Asegurate de que la ruta a tu modelo sea la correcta
const fs = require('fs');
const path = require('path');
const MENU_PATH = path.join(__dirname, '../menu.json');

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
// --- RUTA NUEVA: Para traer el menú del cliente ---
router.get('/menu/:idLocal', async (req, res) => {
    try {
        let usuario;
        
        // Si el cliente entró con ?local=xxx en la URL, lo buscamos
        const idLocal = req.query.local;

        if (idLocal) {
            usuario = await Usuario.findById(idLocal);
        } else {
            // MVP: Si entra a la URL pelada (localhost:3000), 
            // traemos al primer usuario por defecto para que no se rompa nada
            usuario = await Usuario.findOne();
        }

        if (!usuario) {
            return res.status(404).json({ error: "Local no encontrado" });
        }

        // Le devolvemos su lista de platos
        res.status(200).json(usuario.platos);

    } catch (error) {
        console.error("Error al traer el menú público:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});


router.get('/menu', (req, res) => {

    // Verificar si el archivo menu.json existe
    if (!fs.existsSync(MENU_PATH)) {
        return res.status(404).json({ error: 'Todavia no hay ningun menu cargado.' });
    }

    // Leer el archivo y devolverlo como JSON
    const menuRaw  = fs.readFileSync(MENU_PATH, 'utf8');
    const menuJSON = JSON.parse(menuRaw);

    console.log(`[INFO] Menu enviado al cliente (${menuJSON.length} platos).`);
    res.status(200).json(menuJSON);
});


module.exports = router;