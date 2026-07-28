const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    // Nombre del local
    nombreDelLocal: { type: String, required: true},
    
    // Datos obligatorios al momento de registrarse
    email: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    password: { type: String, required: true },
    fechaRegistro: { type: Date, default: Date.now },
    
    // Datos del Perfil (Strings para que pueda escribir sin restricciones)
    horarios: { type: String, default: "" },
    horariosEstructurados: [{
        dia: { type: String },
        apertura: { type: String },
        cierre: { type: String }
    }],

    telefono: { type: String, default: "" }, // String para permitir el +54
    direccion: { type: String, default: "" },
    
    // Interruptor del local (Por defecto arranca abierto)
    abierto: { type: Boolean, default: true },

    // Para la URL
    slug: { type: String, required: true, unique: true },

    platos: [{
        nombre: { type: String, required: true },
        descripcion: { type: String },
        precio: { type: Number, required: true },
        categoria: { type: String, required: true },
        disponible: { type: Boolean, default: true }
    }]
});

module.exports = mongoose.model('Usuario', usuarioSchema);