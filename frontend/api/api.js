// api.js

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

        // El motor revisa si el backend rebotó al usuario
        if (respuesta.status === 401) {
            alert('Tu sesión caducó por seguridad. Volvé a ingresar.');
            localStorage.removeItem('token');
            window.location.href = '/admin/login.html';
            
            // Retornamos null para que el archivo dashbord.js sepa que la petición fracasó
            return null; 
        }
        // ----------------------------------

        // Si pasó la seguridad (no fue 401), devuelve la respuesta normal
        return respuesta; 

    } catch (error) {
        console.error(`Error en la petición a ${ruta}:`, error);
        return null; 
    }
}


function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // De yapa, borramos también los datos del usuario
    window.location.href = '/admin/login.html';
}