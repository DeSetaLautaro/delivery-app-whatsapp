require('dotenv').config();
const express  = require('express');
const bcrypt   = require('bcrypt'); 
const jwt      = require('jsonwebtoken');
const fs       = require('fs');
const path     = require('path');
const multer   = require('multer');
const Usuario  = require('../models/usuario'); 
const verificarToken = require('../middleware/verificarToken');

const router = express.Router();

// Multer: guarda la foto del perfil en la carpeta /uploads
const uploadFotoPerfil = multer({ dest: 'uploads/' });


// ==========================================
// RUTA PARA SUBIR LA FOTO/LOGO DEL LOCAL
// ==========================================
router.post('/subirFotoPerfil', verificarToken, uploadFotoPerfil.single('foto'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió archivo' });
        }

        // 1. Le damos la extensión correcta y lo movemos a /uploads
        const ext          = path.extname(req.file.originalname) || '.jpg';
        const nuevoNombre  = `${req.file.filename}${ext}`;
        const rutaActual   = req.file.path;
        const rutaFinal    = path.join(__dirname, '../uploads', nuevoNombre);
        fs.renameSync(rutaActual, rutaFinal);

        const url = `/uploads/${nuevoNombre}`;

        // 2. Guardamos la URL en la base de datos del usuario
        await Usuario.findByIdAndUpdate(
            req.usuario.id,
            { $set: { fotoPerfil: url } },
            { new: true }
        );

        // 3. Devolvemos la URL para que el frontend la use al instante
        res.status(200).json({ url });

    } catch (error) {
        console.error('Error al subir la foto de perfil:', error);
        res.status(500).json({ error: 'No se pudo subir la foto' });
    }
});


// ==========================================
// 2. RUTA PARA MODIFICAR DATOS (INTELIGENTE)
// ==========================================
router.patch('/modificarDatos', verificarToken, async(req, res) => {
    try {
        const idUser = req.usuario.id; 

        console.log("1. Backend recibió este body:", req.body);
        
        // 1. Armamos un cajón vacío para poner solo lo que vamos a actualizar
        const camposAActualizar = {};

        // 2. Chequeamos qué nos mandó el Frontend. Si lo mandó, lo metemos al cajón.
        if (req.body.nombre !== undefined) camposAActualizar.nombre = req.body.nombre;
        if (req.body.telefono !== undefined) camposAActualizar.telefono = req.body.telefono;
        if (req.body.direccion !== undefined) camposAActualizar.direccion = req.body.direccion;
        if (req.body.horarios !== undefined) camposAActualizar.horarios = req.body.horarios;
                if (req.body.abierto             !== undefined) camposAActualizar.abierto             = req.body.abierto; 
        if (req.body.horariosEstructurados !== undefined) camposAActualizar.horariosEstructurados = req.body.horariosEstructurados;
        if (req.body.metodosPago          !== undefined) camposAActualizar.metodosPago          = req.body.metodosPago;

        console.log("2. Cajón a actualizar en Mongo:", camposAActualizar);

        // 3. Magia de MongoDB: Usamos $set para decirle "cambiame SOLO estos campos específicos y no toques el resto"
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            idUser, 
            { $set: camposAActualizar }, 
            { returnDocument: 'after' } // Para que nos devuelva el usuario ya actualizado
        );

        // 4. Devolvemos los datos nuevos al frontend para que actualice el localStorage
        res.json({ 
            mensaje: "Datos actualizados correctamente",
            usuario: {
                nombre: usuarioActualizado.nombre,
                email: usuarioActualizado.email,
                telefono: usuarioActualizado.telefono,
                direccion: usuarioActualizado.direccion,
                horarios: usuarioActualizado.horarios,
                abierto: usuarioActualizado.abierto
            }
        });

    } catch (error) {
        console.error("Error al actualizar:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});



router.patch('/cambiarPassword', verificarToken, async (req, res) => {
    try {
        const idUser = req.usuario.id; // Viene del token del patovica
        const { passwordActual, passwordNueva } = req.body;

        // A. Buscamos al usuario en la base de datos (necesitamos su contraseña actual hasheada)
        const usuario = await Usuario.findById(idUser);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // B. Verificamos que la contraseña actual que escribió sea correcta
        const esCorrecta = await bcrypt.compare(passwordActual, usuario.password);
        if (!esCorrecta) {
            return res.status(400).json({ error: "La contraseña actual es incorrecta" });
        }

        // C. Si es correcta, hasheamos la nueva contraseña (nivel de complejidad 10)
        const nuevoHash = await bcrypt.hash(passwordNueva, 10);

        // D. Actualizamos en MongoDB
        usuario.password = nuevoHash;
        await usuario.save(); // O podés usar findByIdAndUpdate

        res.json({ mensaje: "¡Contraseña actualizada con éxito!" });

    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});


// ==========================================
// RUTA PARA LEER EL ESTADO ACTUAL DEL LOCAL
// ==========================================
router.get('/estadoLocal', verificarToken, async (req, res) => {
    try {
        const idUser = req.usuario.id;
        // Buscamos al usuario, pero le decimos a Mongoose que SOLO nos traiga el campo "abierto" para que sea ultra rápido
        const usuario = await Usuario.findById(idUser).select('abierto'); 
        
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

        res.json({ abierto: usuario.abierto });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener estado" });
    }
});

router.get('/horarios', verificarToken, async (req, res) =>
{
    try {
        const idUser = req.usuario.id;
        const usuario = await Usuario.findById(idUser).select('horariosEstructurados');

        if(!usuario) return res.status(404).json({error: "Usuario no encontrado"});
        res.json({horarios : usuario.horariosEstructurados});
        
    } catch (error) {
        res.status(500).json({ error: "Error al obtener estado" });
    }

})


// Ruta para leer los métodos de pago del local (protegida)
router.get('/metodosPago', verificarToken, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id).select('metodosPago');
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ metodosPago: usuario.metodosPago || [] });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener métodos de pago' });
    }
});

module.exports = router;