
async function peticionAPI(ruta, metodo, datos = null) {
    const opciones = {
        method: metodo,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    };

    if (datos) {
        opciones.body = JSON.stringify(datos);
    }

    try {
        const respuesta = await fetch(ruta, opciones);

        // 2. ESCUDO 2: Si el backend tiró un error (400, 404, 500)
        if (!respuesta.ok) {
            // Intentamos leer el mensaje de error que mandó el backend (si existe)
            const errorDetalle = await respuesta.json().catch(() => ({}));
            console.error(`Error del servidor en ${ruta}:`, errorDetalle);
            return null; // Devolvemos null para avisarle a tu dashboard que falló
        }
        // ----------------------------------

        // Si pasó la seguridad (no fue 401), devuelve la respuesta normal
        return respuesta; 

    } catch (error) {
        console.error(`Error en la petición a ${ruta}:`, error);
        return null; 
    }
}


// 1. VERIFICAR TOKEN
function verificarAcceso() {
    const token = localStorage.getItem('token');
    
    // Si directamente no hay token (entró escribiendo la URL a mano), lo pateamos
    if (!token) {
        window.location.href = '/admin/login.html';
    }
}



function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // De yapa, borramos también los datos del usuario
    window.location.href = '/admin/login.html';
}
