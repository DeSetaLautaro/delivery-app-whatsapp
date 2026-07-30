const cron = require('node-cron');
const Usuario = require('../models/usuario.js');

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

                // Si hoy tiene configurada apertura y cierre, calculamos:
                if (horarioHoy && horarioHoy.apertura && horarioHoy.cierre) {
                    const { apertura, cierre } = horarioHoy;

                    // Lógica para saber si la hora actual está DENTRO del rango de trabajo
                    if (apertura < cierre) {
                        // Horario normal de día (ej: 10:00 a 18:00)
                        deberiaEstarAbierto = (horaActual >= apertura && horaActual < cierre);
                    } else {
                        // Horario nocturno: cruza la medianoche (ej: 20:00 a 02:00)
                        deberiaEstarAbierto = (horaActual >= apertura || horaActual < cierre);
                    }
                }

                // 3. ¡EL TOQUE MAESTRO! Solo guardamos en MongoDB si el estado REALMENTE cambió.
                // Esto evita hacer 1440 guardados innecesarios por día en tu base de datos.
                if (local.abierto !== deberiaEstarAbierto) {
                    local.abierto = deberiaEstarAbierto;
                    await local.save();
                    
                    const estadoTexto = deberiaEstarAbierto ? 'ABIERTO ✅' : 'CERRADO 🛑';
                    console.log(`[${horaActual}] Cambio: ${local.nombre || 'Local'} ahora está ${estadoTexto}`);
                }
            }
        } catch (error) {
            console.error("❌ Error en el robot de horarios:", error);
        }
    });
}

module.exports = iniciarRobotHorarios;