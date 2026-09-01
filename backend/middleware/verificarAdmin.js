const verificarAdmin = (req, res, next) => {
  if (!req.usuario || req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador puede realizar esta acción' });
  }
  next();
};

module.exports = verificarAdmin;
