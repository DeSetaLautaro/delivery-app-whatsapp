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