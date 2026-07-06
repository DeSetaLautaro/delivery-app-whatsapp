const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    nombreLocal: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Usuario', usuarioSchema);