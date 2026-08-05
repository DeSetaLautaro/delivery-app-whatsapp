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

    // ===== TEMA VISUAL =====
    const resPerfil = await peticionAPI('/api/usuarios/perfil', 'GET');
    const selectTema = document.getElementById('select-tema-menu');
    if (resPerfil && resPerfil.ok && selectTema) {
        const datosPerfil = await resPerfil.json();
        selectTema.value = datosPerfil.temaMenu || 'clasico';

        const restablecer = document.getElementById('restablecer-tema');
        if (restablecer) {
            restablecer.addEventListener('click', async () => {
                selectTema.value = 'clasico';
                await guardarTema('clasico');
            });
        }

        selectTema.addEventListener('change', () => {
            guardarTema(selectTema.value);
        });
    }
});

async function guardarTema(nuevoTema) {
    const resp = await peticionAPI('/api/usuarios/modificarDatos', 'PATCH', { temaMenu: nuevoTema });
    const resultado = await resp.json();

    if (resp.ok) {
        const userGuardado = JSON.parse(localStorage.getItem('user'));
        userGuardado.temaMenu = nuevoTema;
        localStorage.setItem('user', JSON.stringify(userGuardado));
        alert('Tema actualizado correctamente');
    } else {
        alert('Error al actualizar tema: ' + (resultado.error || 'Error desconocido'));
    }
}

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

const DIAS_SEMANA = [
    { id: 'lunes', label: 'Lunes' },
    { id: 'martes', label: 'Martes' },
    { id: 'miercoles', label: 'Miércoles' },
    { id: 'jueves', label: 'Jueves' },
    { id: 'viernes', label: 'Viernes' },
    { id: 'sabado', label: 'Sábado' },
    { id: 'domingo', label: 'Domingo' }
];

function recolectarHorarios() {
    const partesTexto = [];
    const arrayEstructurado = [];

    DIAS_SEMANA.forEach(dia => {
        const checkActivo = document.getElementById(`${dia.id}-activo`);
        const inputDesde = document.getElementById(`${dia.id}-desde`);
        const inputHasta = document.getElementById(`${dia.id}-hasta`);

        const activo = checkActivo && checkActivo.checked;
        const desde = activo && inputDesde ? inputDesde.value : '';
        const hasta = activo && inputHasta ? inputHasta.value : '';

        if (activo && desde && hasta) {
            partesTexto.push(`${dia.label} ${desde} a ${hasta}`);
        }

        arrayEstructurado.push({
            dia: dia.label,
            apertura: activo ? desde : '',
            cierre: activo ? hasta : ''
        });
    });

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
    // Primero dejamos todos los días desactivados
    DIAS_SEMANA.forEach(dia => {
        const check = document.getElementById(`${dia.id}-activo`);
        const desde = document.getElementById(`${dia.id}-desde`);
        const hasta = document.getElementById(`${dia.id}-hasta`);

        if (check) {
            check.checked = false;
        }
        if (desde) {
            desde.value = '';
            desde.disabled = true;
        }
        if (hasta) {
            hasta.value = '';
            hasta.disabled = true;
        }
    });

    // Si no hay datos guardados, terminamos
    if (!horariosArray || horariosArray.length === 0) return;

    // Ahora aplicamos los datos guardados
    horariosArray.forEach(configDia => {
        const diaKey = (configDia.dia || '').toLowerCase();
        const entrada = DIAS_SEMANA.find(
            d => d.id === diaKey || d.label.toLowerCase() === diaKey
        );
        if (!entrada) return;

        const check = document.getElementById(`${entrada.id}-activo`);
        const desde = document.getElementById(`${entrada.id}-desde`);
        const hasta = document.getElementById(`${entrada.id}-hasta`);

        if (check) {
            check.checked = true;
        }
        if (desde) {
            desde.value = configDia.apertura || '';
            desde.disabled = false;
        }
        if (hasta) {
            hasta.value = configDia.cierre || '';
            hasta.disabled = false;
        }
    });
}
