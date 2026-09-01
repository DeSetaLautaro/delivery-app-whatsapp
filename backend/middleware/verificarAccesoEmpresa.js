const Empresa = require('../models/empresa');

const verificarAccesoEmpresa = async (req, res, next) => {
  const empresaId = req.params.empresaId || req.body.empresaId || req.query.empresaId;
  if (!empresaId) return next();

  try {
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    if (!req.usuario) return res.status(401).json({ error: 'No autenticado' });

    const esDueño = String(empresa.usuarioAppId) === String(req.usuario._id);
    const tieneAcceso = req.usuario.empresasAcceso && req.usuario.empresasAcceso.some(id => String(id) === String(empresaId));

    if (!esDueño && !tieneAcceso) {
      return res.status(403).json({ error: 'No tenés acceso a esta empresa' });
    }

    req.empresa = empresa;
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = verificarAccesoEmpresa;
