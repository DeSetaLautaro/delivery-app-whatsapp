document.addEventListener('DOMContentLoaded', () =>
{
    const token = localStorage.getItem('tokenVIP');

    if (!token) {
        // Si no hay token, no sos bienvenido acá. Chau.
        window.location.href = '/admin/login.html';
    } else {
        // Si hay token, cargamos los datos del sistema
        cargarListaDePlatos();
    }
})


// 2. CERRAR SESIÓN: Borramos la pulsera y nos vamos
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
        localStorage.removeItem('tokenVIP');
        window.location.href = '/admin/login.html';
    });
}

// 3. EL CADETE: Pedimos datos al servidor con nuestra pulsera
async function cargarListaDePlatos() {
    const token = localStorage.getItem('tokenVIP');

    try {
        const respuesta = await fetch('/api/platos', {
            method: 'GET',
            headers: {
                // Acá le mostramos el token al backend
                'Authorization': `Bearer ${token}`
            }
        });

        if (respuesta.status === 401) {
            // El token expiró o es falso
            alert('Sesión vencida, por favor logueate de nuevo.');
            localStorage.removeItem('tokenVIP');
            window.location.href = '/admin/login.html';
        }

        const datos = await respuesta.json();
        console.log('Mis platos:', datos);
        // Acá luego inyectarías los datos en tu tabla HTML
        
    } catch (error) {
        console.error('Error al cargar platos:', error);
    }
}