const mongoose = require('mongoose');

const visitaSchema = new mongoose.Schema({
    localId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    fecha: { type: String, required: true }, // formato YYYY-MM-DD
    cantidad: { type: Number, default: 0 }
});

visitaSchema.index({ localId: 1, fecha: 1 }, { unique: true });

module.exports = mongoose.models.Visita || mongoose.model('Visita', visitaSchema);
