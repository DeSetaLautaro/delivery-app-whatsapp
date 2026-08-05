require('dotenv').config();
const express = require('express');
const router = express.Router(); 
const fs = require('fs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const Anthropic = require('@anthropic-ai/sdk');
const path      = require('path');
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const Usuario = require('../models/usuario');
const verificarToken = require('../middleware/verificarToken');





// Ruta en tu backend para aplicar foto a toda la categoría
router.post('/aplicar-foto-categoria', verificarToken, async (req, res) => {
    const { categoria, fotoUrl } = req.body;
    console.log("llegue");
    // Validación mínima para no hacer consultas raras
    if (!categoria || !fotoUrl) {
        return res.status(400).json({ error: "Faltan datos (categoria o fotoUrl)" });
    }

    try {
        // 1. Los platos viven adentro del documento del dueño (usuario.platos),
        //    así que buscamos al usuario logueado con su lista completa.
        const usuario = await Usuario.findById(req.usuario.id);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // 2. Recorremos sus platos y les ponemos la foto SOLO a los que
        //    sean de la misma categoría y no tengan foto (vacía o inexistente).
        let actualizados = 0;
        usuario.platos.forEach(plato => {
            const sinFoto = !plato.fotoUrl || plato.fotoUrl === '';
            if (plato.categoria === categoria && sinFoto) {
                plato.fotoUrl = fotoUrl;
                actualizados++;
            }
        });

        // 3. Si cambió alguno, guardamos los cambios en MongoDB.
        if (actualizados > 0) {
            usuario.markModified('platos');
            await usuario.save();
        }

        // 4. Le avisamos al frontend cuántos platos actualizó.
        res.json({ actualizados });

    } catch (error) {
        console.error("Error al aplicar la foto:", error);
        res.status(500).json({ error: "Error al aplicar la foto" });
    }
});


const uploadFoto = multer({ dest: 'uploads/' });

// Agregamos una función espía justo después de '/subir-foto'
router.post('/subir-foto', 
    (req, res, next) => {
        console.log("🚨 1. LA PETICIÓN LLEGÓ A LA RUTA CORRECTA");
        next();
    }, 
    verificarToken, 
    (req, res, next) => {
        console.log("✅ 2. EL TOKEN SE VERIFICÓ CORRECTAMENTE");
        next();
    },
    uploadFoto.single('foto'), 
    async (req, res) => {
        console.log("📸 3. MULTER PROCESÓ LA FOTO. Entrando al try/catch...");
        try {
            if (!req.file) {
                console.log("❌ Error: No llegó req.file");
                return res.status(400).json({ error: 'No se recibió archivo' });
            }

            const ext = path.extname(req.file.originalname) || '.jpg';
            const nuevoNombre = `${req.file.filename}${ext}`;
            const rutaActual = req.file.path;
            const rutaFinal  = path.join(__dirname, '../uploads', nuevoNombre); 

            fs.renameSync(rutaActual, rutaFinal);
            
            console.log("✅ 4. LA FOTO SE MOVIÓ CON ÉXITO");
            const url = `/uploads/${nuevoNombre}`;
            res.status(200).json({ url });

        } catch (error) {
            console.error('🔥 ERROR CRÍTICO AL SUBIR LA FOTO:', error);
            res.status(500).json({ error: 'No se pudo subir la foto' });
        }
});


/*
-PROPÓSITO: se envía el plato nuevo que se agrega en la DB
*/

// Asegurate de importar tu modelo arriba: const Usuario = require('../models/User');
// RUTA PUT: Guardar los cambios de un grupo editado





router.post('/', verificarToken, async (req, res) => {
    // 1. Recibimos los datos del front
    const { nombre, precio, categoria, descripcion, fotoUrl } = req.body;

    // 2. Armamos el plato (¡Sin ID! MongoDB lo hace solo)
    const platoNuevo = { 
        nombre, 
        precio, 
        categoria, 
        descripcion: descripcion || '', 
        fotoUrl: fotoUrl || '',
        esMenuDelDia: req.body.esMenuDelDia || false,
        esEspecialidad: req.body.esEspecialidad || false,
        enPromocion: req.body.enPromocion || false,
        porcentajeDescuento: req.body.porcentajeDescuento || 0
    };

    try {
        // 3. El comando mágico de MongoDB
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            req.usuario.id, // Buscamos al dueño que está logueado
            { $push: { platos: platoNuevo } }, // Le "pusheamos" el plato a su array
            { new: true } // Le pedimos que nos devuelva el usuario YA actualizado
        );

        // 4. Respondemos con éxito
        res.status(200).json({ 
            mensaje: "Plato agregado con éxito",
            platos: usuarioActualizado.platos 
        });

    } catch (error) {
        console.error("Error guardando el plato:", error);
        res.status(500).json({ error: "No se pudo guardar el plato" });
    }
});


/*
-PROPÓSITO: Cuando se realiza una petición  se devuelve la lista de platos guardadas en la DB.
*/ 
router.get('/', verificarToken, async (req, res) => {
    try {
        // 1. Buscamos al dueño en la base de datos usando el ID seguro del Token
        const usuario = await Usuario.findById(req.usuario.id);

        // (Por seguridad) Si el usuario fue borrado de la base de datos, cortamos acá
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // 2. Extraemos la lista de platos que está guardada adentro de su documento
        const listaDePlatos = usuario.platos;

        // 3. Se manda el array completo al frontend
        res.status(200).json(listaDePlatos);

    } catch (error) {
        console.error("Error al leer los platos:", error);
        res.status(500).json({ error: "No se pudieron cargar los platos" });
    }
});


router.post('/bulk', verificarToken, async (req, res) => {
    // 1. Recibimos los platos del Excel (ya convertidos a JSON por el frontend)
    const platosDelExcel = req.body; 

    try {
        // 2. EL REEMPLAZO TOTAL: Buscamos al usuario y le pisamos la lista entera
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            req.usuario.id,
            { 
                // Usamos $set en vez de $push para aplastar la lista anterior 
                // con la nueva lista que viene del Excel
                $set: { platos: platosDelExcel } 
            },
            { new: true } 
        );

        if (!usuarioActualizado) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // 3. Avisamos que todo salió de 10
        res.status(200).json({ mensaje: 'Menú actualizado por completo (Reemplazo total)' });

    } catch (error) {
        console.error("Error en carga masiva:", error);
        res.status(500).json({ error: 'Error al procesar el archivo' });
    }
});




async function procesarConIA(fotos)
{
    // Paso 1: Convertir todas las fotos a Base64
const bloquesDeImagen = fotos.map(file => ({
    type: 'image',
    source: {
        type: 'base64',
        media_type: file.mimetype,
        data: file.buffer.toString('base64') // Si usas memoryStorage, el archivo está en file.buffer
    }
}));
 const respuesta = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001', // Usá un modelo estable y económico
    max_tokens: 2048,
    // System message: Esto es lo más importante. Le define su "personalidad"
    system: "Sos un asistente experto en extracción de datos. Tu única tarea es convertir imágenes de menús en un array JSON estricto. No respondas nada más, no uses markdown, solo el JSON.",
    messages: [
        {
            role: 'user',
            content: [
                // Acá agregamos tantas imágenes como quieras, una por una
                ...bloquesDeImagen, 
                {
                    type: 'text',
                    text: `Analiza las imágenes proporcionadas y devuelve un array JSON de objetos con la siguiente estructura exacta: 
                    { "nombre": string, "descripcion": string, "precio": number, "categoria": string }. 
                    Si no hay descripción, usa cadena vacía. Si no hay categoría, usa 'Varios'. 
                    Solo responde con el JSON.`
                }
            ]
        }
    ]
});
        // Paso 3: Limpiar la respuesta y convertirla a JSON real
        let respuestaTexto = respuesta.content[0].text;
    respuestaTexto = respuestaTexto.replace(/```json|```/g, '').trim();
    return JSON.parse(respuestaTexto);
};


// La constante la dejamos afuera, arribita de todo, para que sea más ordenado
router.post('/procesar-ia', verificarToken, upload.any(), async (req, res) => { 
    try {
        const fotos = req.files;
        
        // 1. Recibimos los platos crudos de la IA
        const platosDesdeIA = await procesarConIA(fotos); 
        
        // 2. Limpiamos los datos para asegurarnos que tengan el formato correcto
        // ¡OJO! Ya NO inventamos el ID. Dejamos que Mongoose lo haga.
        const menuLimpio = platosDesdeIA.map(plato => {
            return {
                nombre: plato.nombre,
                descripcion: plato.descripcion || '',
                precio: Number(plato.precio) || 0, // Nos aseguramos de que sea número
                categoria: plato.categoria || 'Varios'
            };
        });
        
        // 3. ¡EL GUARDADO EN MONGODB! 
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            req.usuario.id, // El ID seguro del token
            { 
                // El $push con $each empuja VARIOS platos al mismo tiempo 
                // al final de la lista existente.
                $push: { platos: { $each: menuLimpio } } 
            },
            { new: true } // Devuelve el menú completo ya actualizado
        );

        if (!usuarioActualizado) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        console.log(`[ÉXITO] Menú procesado por IA y guardado en la base de datos.`);

        // 4. Le avisamos al Frontend y le devolvemos los platos (que ahora ya tienen su _id real)
        res.status(200).json({ 
            mensaje: 'Menú analizado y guardado con éxito',
            platos: usuarioActualizado.platos 
        });
        
    } catch (error) {
        console.error("Error en la ruta procesar-ia:", error);
        res.status(500).json({ error: "No pude procesar las fotos" });
    }
});

// OCULTAR PLATO
router.patch('/:id', verificarToken, async (req, res) => {
    try {
        const usuario = await Usuario.findOne({ _id: req.usuario.id, "platos._id": req.params.id });
        if (!usuario) {
            return res.status(404).json({ error: 'Plato no encontrado' });
        }

        const plato = usuario.platos.id(req.params.id);
        if (!plato) {
            return res.status(404).json({ error: 'Plato no encontrado' });
        }

        // El backend decide por sí solo invertir el estado
        plato.disponible = !plato.disponible;
        await usuario.save();

        res.json({ disponible: plato.disponible });
    } catch (error) {
        console.error('Error al cambiar disponibilidad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// Atrapamos las peticiones PUT que apuntan a un ID específico
router.put('/:id', verificarToken, async (req, res) => {
    try {
        // 1. Capturamos el ID del plato de la URL y los datos nuevos del body
                const idPlato = req.params.id; 
        const { nombre, precio, categoria, descripcion, fotoUrl } = req.body;  

        // 2. Le pedimos a MongoDB que haga la búsqueda y el reemplazo en un solo paso
        const usuarioActualizado = await Usuario.findOneAndUpdate(
            { 
                _id: req.usuario.id,        // Filtro 1: Buscamos al dueño correcto
                "platos._id": idPlato       // Filtro 2: Buscamos que tenga ese plato adentro
            },
            { 
                // El $set le dice "modificá solo estos campos"
                // El símbolo $ significa "el renglón exacto que coincidió en la búsqueda"
                                $set: { 
                    "platos.$.nombre": nombre,
                    "platos.$.precio": precio,
                    "platos.$.categoria": categoria,
                    "platos.$.descripcion": descripcion,
                    "platos.$.fotoUrl": fotoUrl || '',
                    "platos.$.esMenuDelDia": req.body.esMenuDelDia || false,
                    "platos.$.esEspecialidad": req.body.esEspecialidad || false,
                    "platos.$.enPromocion": req.body.enPromocion || false,
                    "platos.$.porcentajeDescuento": req.body.porcentajeDescuento || 0
                }  
            },
            { new: true } // Para que nos devuelva el documento ya actualizado
        );

        // 3. Si nos devuelve nulo, es porque no encontró al usuario o no encontró el plato
        if (!usuarioActualizado) {
            return res.status(404).json({ error: "Plato no encontrado o no tienes permiso" });
        }

        // 4. Le avisamos al frontend que todo salió perfecto
        res.status(200).json({ mensaje: "Plato actualizado con éxito" });

    } catch (error) {
        console.error("Error al editar el plato:", error);
        res.status(500).json({ error: "No se pudo actualizar el plato" });
    }
});




// ============================================================
// ELIMINAR TODOS LOS PLATOS
// ============================================================
router.delete('/todos', verificarToken, async (req, res) => {
    try {
        const usuario = await Usuario.findByIdAndUpdate(
            req.usuario.id,
            { $set: { platos: [] } },
            { new: true }
        );

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ mensaje: 'Todos los platos fueron eliminados', platos: usuario.platos });
    } catch (error) {
        console.error('Error al borrar todos los platos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Atrapamos las peticiones DELETE que apuntan a un ID específico
// Acordate de que este archivo ya tiene que tener importado Usuario y verificarToken

router.delete('/:id', verificarToken, async (req, res) => {
    try {
        const idPlato = req.params.id; 

        // 1. Buscamos al dueño y le "arrancamos" el plato de su lista en un solo paso
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            req.usuario.id, // Buscamos al dueño por el ID de su token
            { 
                // El operador $pull busca adentro del array "platos" 
                // y elimina el que tenga este _id exacto.
                $pull: { platos: { _id: idPlato } } 
            },
            { new: true } // Nos devuelve el usuario ya sin el plato
        );

        // 2. Si el usuario no existe (ej: borraron la cuenta), tiramos error
        if (!usuarioActualizado) {
            return res.status(404).json({ error: "Usuario no encontrado o sin permisos" });
        }

        // 3. Todo salió perfecto
        res.status(200).json({ mensaje: "Plato eliminado con éxito" });

        } catch (error) {
        console.error("Error al borrar el plato:", error);
        res.status(500).json({ error: "No se pudo borrar el plato" });
    }
});







module.exports = router;
