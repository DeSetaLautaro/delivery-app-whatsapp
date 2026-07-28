const jwt = require('jsonwebtoken'); 
require('dotenv').config();       

// ==========================================
//                  Middleware
// ==========================================
function verificarToken(req, res, next) {
    const headerAuth = req.header('Authorization');
    
    if (!headerAuth) {
        return res.status(401).json({ error: 'Acceso denegado. Falla el token.' });
    }

    // El token llega como "Bearer eyJhbG...", lo separamos
    const token = headerAuth.split(' ')[1];

    try {
        // Acá desencriptamos el token (Recordá poner tu misma clave secreta del login)
        const decodificado = jwt.verify(token, process.env.JWT_SECRET); 
        
        // El patovica lee el ID oculto y se lo guarda a la petición
        req.usuario = decodificado; 
        next(); // Lo deja pasar
    } catch (error) {
        res.status(400).json({ error: 'El token no es válido' });
    }
}

module.exports = verificarToken;