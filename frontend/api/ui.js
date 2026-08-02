function toggleDropdown() {
const menuUsuario = document.getElementById('userMenu');
    const dropdown = document.getElementById('dropdown');

    // 2. ESCUDO: Si no hay menú en esta pantalla, cortamos la ejecución acá nomás.
    if (!menuUsuario || !dropdown) {
        return; // "No hay menú acá, seguí con tu vida, guardia"
    }

    // 3. Si el menú SÍ existe, hacemos la lógica de cerrarlo
    if (!menuUsuario.contains(e.target)) {
        dropdown.setAttribute('hidden', '');
    }
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

        // Logo del local en el header: si tiene foto, reemplazamos la pizza
        const logoImg   = document.getElementById('headerLogoImg');
        const logoEmoji = document.getElementById('headerLogoEmoji');
        if (logoImg && logoEmoji) {
            if (usuarioData.fotoPerfil) {
                logoImg.src   = usuarioData.fotoPerfil;
                logoImg.hidden = false;
                logoEmoji.hidden = true;
            } else {
                logoImg.hidden = true;
                logoEmoji.hidden = false;
            }
        }

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