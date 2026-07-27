document.addEventListener('DOMContentLoaded', ()=>{
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData){
        window.location.href="/admin/login.html";
        return;
    }

    cargarHeader(userData);




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

//=====================================
//       BLUR HORARIOS
//=====================================

const inputHorarios = document.getElementById('tarjeta-horarios');
const estadoHorarios = document.getElementById('estadoHorarios');

// El evento 'blur' se dispara EXACTAMENTE cuando el usuario hace clic afuera de la caja
inputHorarios.addEventListener('blur', async (e) => {
    const nuevosHorarios = e.target.value;

    // 1. Le damos feedback al usuario para que no se ponga ansioso
    estadoHorarios.innerText = "Guardando...";
    estadoHorarios.style.color = "gray";

    try {
        // 2. Mandamos la petición al backend (usamos la misma ruta de modificarDatos que charlamos antes)
        const respuesta = await peticionAPI('/api/usuarios/modificarDatos', 'PATCH', {
            horarios: nuevosHorarios
        });

        const resultado = await respuesta.json();

        // 3. Verificamos si todo salió bien
        if (respuesta.ok) {
            estadoHorarios.innerText = "¡Guardado! ✅";
            estadoHorarios.style.color = "green";

            // Actualizamos el localStorage por las dudas
            // (Asegurate de fusionar los datos nuevos con los viejos para no perder el resto)
            const userGuardado = JSON.parse(localStorage.getItem("user"));
            userGuardado.horarios = nuevosHorarios;
            localStorage.setItem("user", JSON.stringify(userGuardado));

            // Opcional: Borramos el cartelito de "Guardado" después de 3 segundos para que quede limpio
            setTimeout(() => {
                estadoHorarios.innerText = "";
            }, 3000);

        } else {
            estadoHorarios.innerText = "Error al guardar ❌";
            estadoHorarios.style.color = "red";
            alert("Error: " + (resultado.error || resultado.mensaje));
        }
    } catch (error) {
        console.error("Error al guardar horarios:", error);
        estadoHorarios.innerText = "Error de conexión ❌";
        estadoHorarios.style.color = "red";
    }
});