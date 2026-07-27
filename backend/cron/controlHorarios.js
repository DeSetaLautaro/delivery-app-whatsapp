const cron = require('node-cron');
const Usuario = require('../models/usuario.js'); // Ajustá esta ruta si tu modelo se llama distinto

function iniciarRobotHorarios() {
    console.log("Robot de horarios encendido. Revisando cada 1 minuto...");

    // Los 5 asteriscos en el formato cron: "Ejecutar cada minuto de cada hora de cada día"
    cron.schedule('* * * * *', async () => {
        try {
            // 1. Obtener la hora actual de Argentina en formato "HH:MM" (Ej: "20:00")
            const opcionesFecha = { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false };
            const horaActual = new Date().toLocaleTimeString('es-AR', opcionesFecha);

            // 2. Obtener el día actual en Argentina y ponerle mayúscula (Ej: "Lunes")
            const opcionesDia = { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long' };
            let diaActual = new Date().toLocaleDateString('es-AR', opcionesDia);
            diaActual = diaActual.charAt(0).toUpperCase() + diaActual.slice(1);

            // 3. Buscar todos los locales en la base de datos
            const locales = await Usuario.find({});

            for (const local of locales) {
                // Si el local no tiene horarios configurados, lo saltamos
                if (!local.horariosEstructurados || local.horariosEstructurados.length === 0) continue;

                // Buscamos si tiene un turno configurado para HOY
                const horarioHoy = local.horariosEstructurados.find(h => h.dia === diaActual);

                if (horarioHoy) {
                    // A. ¿Es el minuto exacto de ABRIR?
                    if (horaActual === horarioHoy.apertura) {
                        local.abierto = true;
                        await local.save();
                        console.log(`✅ [${horaActual}] ${local.nombre} ha ABIERTO automáticamente.`);
                    }
                    
                    // B. ¿Es el minuto exacto de CERRAR?
                    if (horaActual === horarioHoy.cierre) {
                        local.abierto = false;
                        await local.save();
                        console.log(`🛑 [${horaActual}] ${local.nombre} ha CERRADO automáticamente.`);
                    }
                }
            }
        } catch (error) {
            console.error("❌ Error en el robot de horarios:", error);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });
}

module.exports = iniciarRobotHorarios;