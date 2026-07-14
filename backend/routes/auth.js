const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const Usuario  = require('../models/usuario');

const router = express.Router();

// ============================================================
// POST /api/login
// ============================================================
/**
 * PROPOSITO:
 *   Valida las credenciales del dueño del local contra la base de datos.
 *   Si son correctas, devuelve un JWT que el frontend guarda y usa
 *   para autenticarse en rutas protegidas (ej: subir menú).
 *
 * BODY: { email, password }
 *
 * RESPUESTA EXITOSA (200):
 *   { token: "eyJ..." }
 *
 * ERRORES:
 *   - 400: Email o contraseña incorrectos
 *   - 500: Error interno
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Paso 1: Buscar el usuario por email
        const usuario = await Usuario.findOne({ email });
        
        if (!usuario) {
            return res.status(400).json({ message: 'Email o contraseña incorrectos' });
        }
        // Paso 2: Comparar la contraseña con el hash guardado en la DB
        // bcrypt.compare nunca expone el hash, solo devuelve true/false
        const esValida = await bcrypt.compare(password, usuario.password);
        if (!esValida) {
            return res.status(400).json({ message: 'Email o contraseña incorrectos' });
        }

        // Paso 3: Generar el JWT (JSON Web Token)
        // Funciona como una "pulsera de boliche": el servidor la firma,
        // el cliente la guarda y la presenta en cada request protegido.
        const token = jwt.sign(
            { id: usuario._id, email: usuario.email },  // payload (datos dentro del token)
            process.env.JWT_SECRET,                      // clave secreta para firmarlo
            { expiresIn: '8h' }                          // expira en 8 horas
        );

        res.status(200).json({ token,
            user: {nombre : usuario.nombre,
                    email : usuario.email,
                    id : usuario.id
            }
         });

    } catch (error) {
        console.error('[ERROR] Login:', error.message);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});


// ============================================================
// POST /api/registro
// ============================================================
/**
 * PROPOSITO:
 *   Crea un nuevo usuario (dueño de local) en la base de datos.
 *   La contraseña se hashea con bcrypt antes de guardarse:
 *   nunca se almacena en texto plano.
 *
 * BODY: { nombreLocal, email, password }
 *
 * RESPUESTA EXITOSA (201):
 *   { message: "Usuario creado con exito" }
 *
 * ERRORES:
 *   - 400: El email ya está registrado
 *   - 500: Error interno
 */
router.post('/registro', async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
        // Verificar si el email ya existe
        const existe = await Usuario.findOne({ email });
        if (existe) {
            return res.status(400).json({ message: 'Ese email ya está registrado' });
        }

        // Hashear la contraseña (10 = nivel de complejidad del hash)
        const hash = await bcrypt.hash(password, 10);

        // Guardar el usuario nuevo
        await Usuario.create({ nombre, email, password: hash });

        res.status(201).json({ message: 'Usuario creado con exito' });

    } catch (error) {
        console.error('[ERROR] Registro:', error.message);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
