const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
    localId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    telefono: { type: String, required: true },
    direcciones: [{ type: String }],
    cantidadPedidos: { type: Number, default: 0 },
    ultimaFechaPedido: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

clienteSchema.index({ localId: 1, telefono: 1 }, { unique: true });

module.exports = mongoose.models.Cliente || mongoose.model('Cliente', clienteSchema);
