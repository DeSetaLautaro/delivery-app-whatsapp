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
    metodoPago: { type: String, default: 'Efectivo', enum: ['Efectivo', 'Transferencia', 'Tarjeta'] },
    total: { type: Number, required: true },
    estado: { type: String, default: 'pendiente' },
    direccion: { type: String, default: '' },
    notas: { type: String, default: '' },
    telefonoCliente: { type: String, default: '' },
    estadoDelivery: { type: String, enum: ['pendiente', 'en_viaje', 'entregado'], default: 'pendiente' },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Pedido || mongoose.model('Pedido', pedidoSchema);
