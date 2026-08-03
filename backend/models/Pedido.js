const mongoose = require('mongoose');

const pedidoSchema = new mongoose.Schema({
    localId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    cliente: { type: String, default: '' },
    items: [{
        nombrePlato: { type: String, required: true },
        cantidad: { type: Number, required: true },
        precio: { type: Number, required: true },
        toppings: [{
            grupoNombre: { type: String },
            opcionNombre: { type: String },
            precio: { type: Number, default: 0 }
        }]
    }],
    total: { type: Number, required: true },
    estado: { type: String, default: 'pendiente' },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Pedido || mongoose.model('Pedido', pedidoSchema);
