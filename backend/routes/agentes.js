const express = require('express');
const bcryptjs = require('bcryptjs');
const router = express.Router();
const verificarToken = require('../middleware/verificarToken');
const verificarAdmin = require('../middleware/verificarAdmin');
const Usuario = require('../models/usuario');
const Empresa = require('../models/empresa');

// POST /api/agentes
router.post('/', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { nombre, email, password, telefono, pinCrm, empresasAcceso } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, email, password)' });
    }

    const emailExiste = await Usuario.findOne({ email });
    if (emailExiste) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }

    // Verificar que las empresas pertenezcan al admin
    let empresasValidas = [];
    if (empresasAcceso && empresasAcceso.length > 0) {
      empresasValidas = await Empresa.find({
        _id: { $in: empresasAcceso },
        usuarioAppId: req.usuario._id
      });
      if (empresasValidas.length !== empresasAcceso.length) {
        return res.status(400).json({ error: 'Una o más empresas no pertenecen al administrador' });
      }
    }

    // Hashear password
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    // Generar pin automático si no viene
    const pinFinal = pinCrm || Math.random().toString(36).slice(2, 8).toUpperCase();

    const admin = await Usuario.findById(req.usuario._id);
    if (!admin) return res.status(404).json({ error: 'Administrador no encontrado' });

    const nuevoAgente = new Usuario({
      nombreDelLocal: admin.nombreDelLocal,
      email,
      nombre,
      password: passwordHash,
      pinCrm: pinFinal,
      rol: 'agente',
      adminId: admin._id,
      empresasAcceso: empresasValidas.map(e => e._id),
      telefono: telefono || '',
      activo: true
    });

    const slugBase = (admin.slug || 'local') + '-agente-' + email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
    nuevoAgente.slug = slugBase + '-' + Math.random().toString(36).slice(2, 6);

    await nuevoAgente.save();

    const respuesta = nuevoAgente.toObject();
    delete respuesta.password;
    delete respuesta.pinCrm;

    res.status(201).json({ message: 'Agente creado correctamente', agente: respuesta, pinGenerado: pinFinal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agentes
router.get('/', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const agentes = await Usuario.find({ rol: 'agente', adminId: req.usuario._id })
      .select('-password -pinCrm -__v');
    res.json(agentes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agentes/mis-empresas
router.get('/mis-empresas', verificarToken, async (req, res) => {
  try {
    let empresas;
    if (req.usuario.rol === 'admin') {
      empresas = await Empresa.find({ usuarioAppId: req.usuario._id })
        .select('-tokenMeta -metaCostoTotal -metaUltimaActualizacion');
    } else {
      const ids = req.usuario.empresasAcceso || [];
      empresas = await Empresa.find({ _id: { $in: ids } })
        .select('-tokenMeta -metaCostoTotal -metaUltimaActualizacion');
    }
    res.json(empresas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/agentes/:id
router.patch('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { activo, telefono } = req.body;
    const agente = await Usuario.findOne({ _id: req.params.id, adminId: req.usuario._id, rol: 'agente' });
    if (!agente) {
      return res.status(404).json({ error: 'Agente no encontrado' });
    }
    if (typeof activo === 'boolean') agente.activo = activo;
    if (telefono !== undefined) agente.telefono = telefono;
    await agente.save();
    const respuesta = agente.toObject();
    delete respuesta.password;
    delete respuesta.pinCrm;
    res.json(respuesta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
