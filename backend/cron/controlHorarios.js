const cron = require('node-cron');
const Usuario = require('../models/usuario.js');
const Pedido = require('../models/Pedido.js');

function iniciarRobotHorarios() {
    console.log("🤖 Robot de horarios encendido. Vigilando cada 1 minuto...");

    cron.schedule('* * * * *', async () => {
        try {
            // 1. Obtenemos la hora de Argentina de forma segura
            const fechaArg = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
            
            // Día en minúsculas siempre (ej: "lunes", "martes")
            const diaActual = fechaArg.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase(); 
            
            // Hora en formato "HH:MM" (Aseguramos que los números tengan 2 dígitos: "09:05")
            const horas = String(fechaArg.getHours()).padStart(2, '0');
            const minutos = String(fechaArg.getMinutes()).padStart(2, '0');
            const horaActual = `${horas}:${minutos}`;

            // 2. Traemos a TODOS los locales de la base de datos
            const locales = await Usuario.find({});

            for (const local of locales) {
                // Si no tiene horarios cargados, pasamos al siguiente local
                if (!local.horariosEstructurados || local.horariosEstructurados.length === 0) continue;

                // Buscamos el horario de hoy (ignorando mayúsculas/minúsculas)
                const horarioHoy = local.horariosEstructurados.find(
                    h => h.dia && h.dia.toLowerCase() === diaActual
                );

                let deberiaEstarAbierto = false; // Por defecto asumimos que está cerrado

               if (horarioHoy && horarioHoy.apertura && horarioHoy.cierre) {
                    const { apertura, cierre } = horarioHoy;

                    // 1. ¿Es el minuto EXACTO de apertura?
                    if (horaActual === apertura && local.abierto === false) {
                        local.abierto = true;
                        await local.save();
                        console.log(`[${horaActual}] 🟢 APERTURA AUTOMÁTICA: ${local.nombre || 'Local'} ahora está ABIERTO`);
                    }

                    // 2. ¿Es el minuto EXACTO de cierre?
                    if (horaActual === cierre && local.abierto === true) {
                        local.abierto = false;
                        await local.save();
                        console.log(`[${horaActual}] 🔴 CIERRE AUTOMÁTICO: ${local.nombre || 'Local'} ahora está CERRADO`);
                    }
                }
            }
        } catch (error) {
            console.error("❌ Error en el robot de horarios:", error);
        }
    });

    // Cierre automático diario de pedidos pendientes
    cron.schedule('0 4 * * *', async () => {
        try {
            const resultado = await Pedido.updateMany(
                { estado: 'pendiente' },
                { $set: { estado: 'completado' } }
            );
            console.log(`[Cierre diario] ${resultado.modifiedCount} pedidos pendientes fueron marcados como completados.`);
        } catch (error) {
            console.error('Error al cerrar pedidos automáticamente:', error);
        }
    });
}

module.exports = iniciarRobotHorarios;
