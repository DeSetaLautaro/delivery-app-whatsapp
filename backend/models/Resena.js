const mongoose = require('mongoose');

const resenaSchema = new mongoose.Schema({
    localId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    estrellas: { type: Number, default: 5 },
    comentario: { type: String, default: '' },
    usuario: { type: String, default: 'Anónimo' },
    fecha: { type: Date, default: Date.now },
    votosFavor: { type: Number, default: 0 },
    votosContra: { type: Number, default: 0 }
});

module.exports = mongoose.models.Resena || mongoose.model('Resena', resenaSchema);
