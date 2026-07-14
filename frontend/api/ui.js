function toggleDropdown() {
            const dd = document.getElementById('dropdown');
            dd.hidden ? dd.removeAttribute('hidden') : dd.setAttribute('hidden', '');
        }
        // Cerrar si se clickea afuera
        document.addEventListener('click', (e) => {
            if (!document.getElementById('userMenu').contains(e.target)) {
                document.getElementById('dropdown').setAttribute('hidden', '');
            }
        });
        function cerrarSesion() {
            localStorage.removeItem('token');
        }



async function cargarHeader(usuarioDataString) {
    try {
        // Traemos el pedazo de HTML desde el servidor
        const respuesta = await fetch('/admin/header.html');
        const html = await respuesta.text();
        
        // Lo inyectamos en la caja vacía
        document.getElementById('contenedor-header').innerHTML = html;

        // --- ¡RECIÉN AHORA EXISTEN LOS BOTONES EN LA PÁGINA! ---
        // Ahora sí podemos ponerles los nombres y los eventos de clic

        const usuarioData = JSON.parse(usuarioDataString);
        
        const welcomeNombre = document.getElementById("welcomeNombre");
        const userNombre = document.getElementById("userNombre");
        if (welcomeNombre) welcomeNombre.textContent = usuarioData.nombre;
        if (userNombre) userNombre.textContent = usuarioData.nombre;

        // Lógica del Menú Dropdown
        const userMenu = document.getElementById('userMenu');
        const dropdown = document.getElementById('dropdown');

        if (userMenu && dropdown) {
            userMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.hidden = !dropdown.hidden;
            });

            document.addEventListener('click', (e) => {
                if (!userMenu.contains(e.target)) {
                    dropdown.hidden = true;
                }
            });
        }

        // Lógica de Cerrar Sesión
        const btnCerrarSesion = document.getElementById('btnCerrarSesion');
        if (btnCerrarSesion) {
            btnCerrarSesion.addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user'); 
                window.location.href = '/admin/login.html';
            });
        }

    } catch (error) {
        console.error('Error al inyectar el header:', error);
    }
}