const express = require('express');
const router = express.Router();
const mercadopago = require('mercadopago');
const Usuario = require('../models/usuario');

mercadopago.configure({
    access_token: process.env.MP_ACCESS_TOKEN
});

const PRECIOS_PLANES = {
    web: 2000,
    bot: 4000,
    pro: 5000
};

const NOMBRES_PLANES = {
    web: '🌐 Plan Web',
    bot: '🤖 Plan Bot',
    pro: '🚀 Plan Pro'
};

// ==========================================
// CREAR PREFERENCIA DE PAGO
// ==========================================
router.post('/crear-preferencia', async (req, res) => {
    try {
        const { localId, planSeleccionado } = req.body;

        if (!localId || !planSeleccionado || !PRECIOS_PLANES[planSeleccionado]) {
            return res.status(400).json({ error: 'Datos de plan incompletos o inválidos' });
        }

        const precio = PRECIOS_PLANES[planSeleccionado];
        const nombrePlan = NOMBRES_PLANES[planSeleccionado];

        const preferencia = {
            items: [
                {
                    title: nombrePlan,
                    quantity: 1,
                    unit_price: precio,
                    currency_id: 'ARS'
                }
            ],
            external_reference: `${localId}|${planSeleccionado}`,
            notification_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/pagos/webhook`,
            back_urls: {
                success: `${process.env.BASE_URL || 'http://localhost:3000'}/admin/perfil`,
                failure: `${process.env.BASE_URL || 'http://localhost:3000'}/admin/perfil`
            }
        };

        const respuesta = await mercadopago.preferences.create(preferencia);
        const init_point = respuesta.body.init_point;

        res.status(200).json({ init_point });
    } catch (error) {
        console.error('Error al crear preferencia:', error);
        res.status(500).json({ error: 'No se pudo generar el pago' });
    }
});

// ==========================================
// WEBHOOK DE MERCADO PAGO
// ==========================================
router.post('/webhook', async (req, res) => {
    try {
        const { data, type } = req.body;

        if (type !== 'payment' || !data || !data.id) {
            return res.sendStatus(200);
        }

        const pago = await mercadopago.payment.get(data.id);
        if (pago.body && pago.body.status === 'approved') {
            const externalRef = pago.body.external_reference;
            if (externalRef) {
                const [localId, planSeleccionado] = externalRef.split('|');
                if (localId && planSeleccionado) {
                    await Usuario.findByIdAndUpdate(
                        localId,
                        { $set: { plan: planSeleccionado } }
                    );
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error en webhook de MP:', error);
        res.sendStatus(200);
    }
});

module.exports = router;
