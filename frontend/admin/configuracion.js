document.addEventListener('DOMContentLoaded', async ()=>{
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData){
        window.location.href="/admin/login.html";
        return;
    }

    cargarHeader(userData);

    const res = await peticionAPI(`/api/usuarios/horarios`, 'GET');
    if (!res){
        return;
    }
    const horariosEstructurados = await res.json();
    rellenarHorarios(horariosEstructurados.horarios);
});

// Seleccionamos todos los botones de variables
const botonesVar = document.querySelectorAll('.btn-var');
const textareaMensaje = document.getElementById('configMensaje');

// A cada botón le agregamos un evento "click"
botonesVar.forEach(boton => {
    boton.addEventListener('click', () => {
        // Obtenemos qué variable tiene el botón (ej: "{total}")
        const variable = boton.getAttribute('data-var');
        
        // --- LA MAGIA PARA INSERTAR DONDE ESTÁ EL CURSOR ---
        // 1. Buscamos dónde está parpadeando el cursor en el texto
        const posicionCursor = textareaMensaje.selectionStart;
        
        // 2. Partimos el texto en dos (antes del cursor y después del cursor)
        const textoAntes = textareaMensaje.value.substring(0, posicionCursor);
        const textoDespues = textareaMensaje.value.substring(posicionCursor);
        
        // 3. Unimos todo: texto inicial + variable + texto final
        textareaMensaje.value = textoAntes + variable + textoDespues;
        
        // 4. Volvemos a poner el foco en el textarea para que el usuario siga escribiendo
        textareaMensaje.focus();
    });
});

// =====================================================
//             AUTOGUARDADO DE HORARIOS (CON DEBOUNCE)
// =====================================================

const estadoHorarios = document.getElementById('estadoHorarios');
let temporizadorGuardado; // <--- Acá guardamos el cronómetro del ascensor

// Función intermedia que frena el spam de clics
function programarGuardado() {
    // 1. Si había un cronómetro corriendo porque el usuario tocó algo hace medio segundo, lo cancelamos
    clearTimeout(temporizadorGuardado);
    
    // Mostramos que estamos esperando a que termine de editar...
    estadoHorarios.innerText = 'Esperando para guardar...';
    estadoHorarios.style.color = '#888';

    // 2. Arrancamos un cronómetro nuevo de 1 segundo (1000 milisegundos)
    temporizadorGuardado = setTimeout(() => {
        // Recién cuando el cronómetro llega a cero sin ser interrumpido, ejecutamos el fetch
        guardarHorarios(); 
    }, 1000);
}

// ── Paso 1: Habilitar/deshabilitar inputs al tildar checkbox ──────────
document.querySelectorAll('.fila-dia input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const fila    = checkbox.closest('.fila-dia');
        const tiempos = fila.querySelectorAll('input[type="time"]');

        tiempos.forEach(t => t.disabled = !checkbox.checked);

        // En lugar de llamar a guardarHorarios() directo, llamamos a nuestro temporizador
        programarGuardado();
    });
});

// ── Paso 2: Escuchar blur (y ahora también change) en los inputs de tiempo ──
document.querySelectorAll('.fila-dia input[type="time"]').forEach(inputTiempo => {
    // Cuando sale de la cajita o cambia la hora
    inputTiempo.addEventListener('blur', programarGuardado);
    inputTiempo.addEventListener('change', programarGuardado);
});

// ... Acá sigue tu Paso 3 (recolectarHorarios) y Paso 4 (guardarHorarios) exactamente igual

// ── Paso 3: Recolectar string (humanos) y array (computadora) ─────────
function recolectarHorarios() {
    const filas = document.querySelectorAll('.fila-dia');
    const partesTexto = [];        // Acá guardamos "Lunes 20:00 a 23:30"
    const arrayEstructurado = [];  // Acá guardamos objetos { dia: "Lunes", apertura: "20:00", ... }

    filas.forEach(fila => {
        const checkbox = fila.querySelector('input[type="checkbox"]');
        if (!checkbox.checked) return; // Saltamos los días no seleccionados

        const dia     = fila.querySelector('.dia-check span').innerText.trim();
        const tiempos = fila.querySelectorAll('input[type="time"]');
        const desde   = tiempos[0].value; // Ej: "20:00"
        const hasta   = tiempos[1].value; // Ej: "23:30"

        // 1. Armamos el texto para humanos
        partesTexto.push(`${dia} ${desde} a ${hasta}`);

        // 2. Armamos el objeto para la computadora
        arrayEstructurado.push({
            dia: dia,
            apertura: desde,
            cierre: hasta
        });
    });

    // Devolvemos ambas cosas empaquetadas
    return {
        textoLegible: partesTexto.join(' | '),
        datosParaNode: arrayEstructurado
    };
}

// ── Paso 4: Enviar al backend ──────────────────────
async function guardarHorarios() {
    const paqueteHorarios = recolectarHorarios(); // Obtenemos el texto y el array

    estadoHorarios.innerText   = 'Guardando...';
    estadoHorarios.style.color = '#888';

    try {
        const respuesta = await peticionAPI('/api/usuarios/modificarDatos', 'PATCH', {
            // Mandamos los dos datos al backend:
            horarios: paqueteHorarios.textoLegible,               // El string de siempre
            horariosEstructurados: paqueteHorarios.datosParaNode  // El nuevo array para el robot
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            // Éxito: actualizamos localStorage (solo guardamos el texto para mostrarlo si hace falta)
            const userGuardado = JSON.parse(localStorage.getItem('user'));
            userGuardado.horarios = paqueteHorarios.textoLegible;
            localStorage.setItem('user', JSON.stringify(userGuardado));

            estadoHorarios.innerText   = '¡Guardado! ✅';
            estadoHorarios.style.color = '#16a34a';
            setTimeout(() => { estadoHorarios.innerText = ''; }, 3000);
        } else {
            estadoHorarios.innerText   = 'Error al guardar ❌';
            estadoHorarios.style.color = '#dc2626';
            console.error('Error backend:', resultado);
        }

    } catch (error) {
        estadoHorarios.innerText   = 'Error de conexión ❌';
        estadoHorarios.style.color = '#dc2626';
        console.error('Error al guardar horarios:', error);
    }
}

//===================
// RECOLECTAR HORARIOS
//* El objetivo es rellenar en cada check y horario los datos que tengamos guardados en mongo DB
//=====================

function rellenarHorarios(horariosArray) {
    // Si no hay horarios guardados o el array está vacío, no hacemos nada
    if (!horariosArray || horariosArray.length === 0) return;

    // Recorremos la lista de días uno por uno
    horariosArray.forEach(configDia => {
        // configDia es cada objetito: { dia: "lunes", apertura: "20:00", cierre: "23:30" }
         console.log(`el formato de horarios es:`, configDia);
        // Nos aseguramos de que el día esté en minúsculas para que coincida con los IDs del HTML
        const dia = configDia.dia.toLowerCase(); 
        console.log(`pasé por acá y hoy es: ${dia}`);

        // Buscamos las 3 cajitas de ESE día en el HTML
        const checkActivo = document.getElementById(`${dia}-activo`);
        checkActivo.disabled = false;
        const inputDesde = document.getElementById(`${dia}-desde`);
        inputDesde.disabled = false;
        const inputHasta = document.getElementById(`${dia}-hasta`);
        inputHasta.disabled = false;

        // 1. Rellenamos las horas usando las propiedades de tu MongoDB (apertura y cierre)
        if (inputDesde) inputDesde.value = configDia.apertura || "";
        if (inputHasta) inputHasta.value = configDia.cierre || "";

        // 2. ¿Cómo sabemos si marcamos el Checkbox (activo)? 
        // Lógica simple: Si tiene hora de apertura guardada, asumimos que ese día abre.
        if (checkActivo) {
            checkActivo.checked = configDia.apertura ? true : false;
        }
    });
}