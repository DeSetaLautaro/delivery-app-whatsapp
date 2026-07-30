const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario'); // Asegurate de que la ruta al modelo sea correcta
const verificarToken = require('../middleware/verificarToken'); // Tu middleware de seguridad

// RUTA POST: Crear un nuevo grupo de toppings
// Endpoint típico: POST /api/toppings
router.post('/', verificarToken, async (req, res) => {
    try {
        // 1. Extraemos los datos que nos manda el frontend en el body
        const { nombre, categoriaDestino, esMultiselect, opciones } = req.body;

        // 2. Validación fundamental de seguridad (Evitar basura en la base de datos)
        if (!nombre || !categoriaDestino || !opciones || opciones.length === 0) {
            return res.status(400).json({ 
                msg: "Faltan datos obligatorios. Se requiere un nombre, una categoría destino y al menos una opción." 
            });
        }

        // 3. Buscamos al usuario dueño usando el ID que viene en el token
        const usuario = await Usuario.findById(req.usuario.id);
        
        if (!usuario) {
            return res.status(404).json({ msg: "Usuario no encontrado" });
        }

        // 4. Armamos el objeto con el nuevo grupo de toppings
        const nuevoGrupoTopping = {
            nombre: nombre,
            categoriaDestino: categoriaDestino,
            esMultiselect: esMultiselect !== undefined ? esMultiselect : true,
            opciones: opciones // Este es el array con [{nombre: "Cheddar", precio: 500}, ...]
        };

        // 5. Lo metemos en el array del usuario (Subdocumento)
        usuario.gruposToppings.push(nuevoGrupoTopping);

        // 6. Guardamos el usuario (Acá Mongoose le asigna el _id automático al grupo y a las opciones)
        await usuario.save();

        // 7. Obtenemos el grupo recién guardado (es el último de la lista) para devolverlo al frontend
        const grupoGuardado = usuario.gruposToppings[usuario.gruposToppings.length - 1];

        // 8. Respondemos con éxito (Status 201: Created)
        res.status(201).json({
            msg: "Grupo de toppings creado con éxito",
            topping: grupoGuardado
        });

    } catch (error) {
        console.error("Error al guardar toppings:", error);
        res.status(500).json({ msg: "Hubo un error al guardar el grupo de toppings." });
    }
});

module.exports = router;