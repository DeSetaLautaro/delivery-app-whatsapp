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


router.put('/editarToppings', verificarToken, async (req, res) => {
    try {
        // Recibimos los datos que nos manda el frontend
        const { nombreOriginal, categoriaDestino, opciones } = req.body;
        const userId = req.usuario.id;

        const usuario = await Usuario.findById(userId);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Buscamos en qué posición del array está el grupo que queremos editar
        const grupoIndex = usuario.gruposToppings.findIndex(g => g.nombre === nombreOriginal);
        
        if (grupoIndex === -1) {
            return res.status(404).json({ error: "El grupo no existe" });
        }

        // Actualizamos los datos de ese grupo específico
        usuario.gruposToppings[grupoIndex].categoriaDestino = categoriaDestino;
        usuario.gruposToppings[grupoIndex].opciones = opciones;

        // Guardamos los cambios
        await usuario.save();

        return res.status(200).json({ mensaje: "¡Grupo actualizado con éxito!" });

    } catch (error) {
        console.error("Error al editar toppings:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});


// RUTA PUT: Desvincular TODOS los toppings de una categoría específica
router.put('/desvincularTodosDeCategoria', verificarToken, async (req, res) => {
    try {
        const { nombreCategoria } = req.body;
        const userId = req.usuario.id;

        const usuario = await Usuario.findById(userId);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Recorremos todos los grupos y les filtramos esta categoría
        usuario.gruposToppings.forEach(grupo => {
            grupo.categoriaDestino = grupo.categoriaDestino.filter(cat => cat !== nombreCategoria);
        });

        await usuario.save();

        return res.status(200).json({ mensaje: `¡Se quitaron todos los toppings de ${nombreCategoria}!` });

    } catch (error) {
        console.error("Error al desvincular todos los toppings:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});

// RUTA PUT: Desvincular una categoría de un grupo de toppings específico
router.put('/desvincularCategoriaDeTopping', verificarToken, async (req, res) => {
    try {
        const { nombreGrupo, nombreCategoria } = req.body;
        const userId = req.usuario.id;

        const usuario = await Usuario.findById(userId);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // 1. Buscamos el grupo específico por su nombre
        const grupo = usuario.gruposToppings.find(g => g.nombre === nombreGrupo);
        
        if (!grupo) {
            return res.status(404).json({ error: "El grupo de toppings no existe" });
        }

        // 2. Le filtramos la categoría que queremos sacar
        grupo.categoriaDestino = grupo.categoriaDestino.filter(cat => cat !== nombreCategoria);

        // 3. Guardamos. 
        await usuario.save();

        return res.status(200).json({ mensaje: `¡Categoría ${nombreCategoria} quitada del grupo ${nombreGrupo}!` });

    } catch (error) {
        console.error("Error al desvincular categoría:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});


router.post('/crearToppings', verificarToken, async (req, res) => {
    try {
        const { nombre, categoriaDestino, opciones } = req.body;
        const userId = req.usuario.id;

        // 1. Buscamos al usuario completo
        const usuario = await Usuario.findById(userId);
        
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // 2. Nos fijamos si ya existe un grupo con ese nombre exacto (ignorando mayúsculas/minúsculas)
        const grupoExistente = usuario.gruposToppings.find(
            grupo => grupo.nombre.toLowerCase() === nombre.trim().toLowerCase()
        );

        if (grupoExistente) {
            // ESCENARIO A: El grupo YA EXISTE. 
            // 1. Le sumamos las opciones nuevas a las que ya tenía
            grupoExistente.opciones.push(...opciones);
            
            // 2. (Opcional pero recomendado) Sumamos las categorías nuevas si no estaban marcadas
            categoriaDestino.forEach(cat => {
                if (!grupoExistente.categoriaDestino.includes(cat)) {
                    grupoExistente.categoriaDestino.push(cat);
                }
            });

        } else {
            // ESCENARIO B: El grupo ES NUEVO. 
            // Hacemos lo mismo que hacías antes, creamos el molde completo.
            usuario.gruposToppings.push({ 
                nombre: nombre.trim(), 
                categoriaDestino, 
                opciones 
            });
        }

        // 3. Guardamos los cambios en la base de datos
        await usuario.save();

        return res.status(200).json({ mensaje: "¡Toppings guardados con éxito!" });

    } catch (error) {
        console.error("Error al guardar toppings:", error);
        return res.status(400).json({ error: error.message });
    }
});

// Ruta para obtener todos los grupos de toppings del usuario
router.get('/misToppings', verificarToken, async (req, res) => {
    try {
        const userId = req.usuario.id;
        const usuario = await Usuario.findById(userId);
        
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Le devolvemos al frontend únicamente el array de grupos
        return res.status(200).json(usuario.gruposToppings);

    } catch (error) {
        console.error("Error al obtener toppings:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});

// RUTA DELETE: Eliminar un grupo completo
router.delete('/eliminarToppings/:nombreGrupo', verificarToken, async (req, res) => {
    try {
        const nombreGrupo = req.params.nombreGrupo; // Lo sacamos de la URL
        const userId = req.usuario.id;

        const usuario = await Usuario.findById(userId);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Filtramos el array: nos quedamos con todos los que NO se llamen igual al que queremos borrar
        usuario.gruposToppings = usuario.gruposToppings.filter(g => g.nombre !== nombreGrupo);

        await usuario.save();
        
        return res.status(200).json({ mensaje: "¡Grupo eliminado con éxito!" });

    } catch (error) {
        console.error("Error al eliminar toppings:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});

module.exports = router;