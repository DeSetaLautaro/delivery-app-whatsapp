const mongoose = require('mongoose');

const deliveryTokenSchema = new mongoose.Schema({
    localId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        unique: true
    },
    token: {
        type: String,
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.models.DeliveryToken || mongoose.model('DeliveryToken', deliveryTokenSchema);
