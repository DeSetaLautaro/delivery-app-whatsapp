const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');
require('dotenv').config();

function verificarToken(req, res, next) {
    const headerAuth = req.header('Authorization');
    if (!headerAuth) {
        return res.status(401).json({ error: 'Acceso denegado. Falla el token.' });
    }

    const token = headerAuth.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token no provisto.' });
    }

    try {
        const decodificado = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
        // Guardamos el payload para usarlo como fallback
        req.usuarioPayload = decodificado;

        // Buscamos el usuario actual en la base para tener rol, empresasAcceso, adminId
        Usuario.findById(decodificado.id || decodificado._id)
            .then(user => {
                if (!user) {
                    return res.status(401).json({ error: 'Usuario no encontrado.' });
                }
                req.usuario = user;
                // Normalizamos para que siempre exista id (string)
                req.usuario.id = user._id;
                // Si no viene rol, asumimos admin por defecto (por si hay viejos documentos)
                if (!req.usuario.rol) req.usuario.rol = 'admin';
                next();
            })
            .catch(err => {
                console.error('Error buscando usuario en verificarToken:', err);
                res.status(500).json({ error: 'Error interno al verificar token.' });
            });
    } catch (error) {
        res.status(400).json({ error: 'El token no es válido.' });
    }
}

module.exports = verificarToken;
