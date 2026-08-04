const cartelitoEstado = document.getElementById('cartelEstado');
const LINK_DE_MERCADO_PAGO = "LINK_DE_MERCADO_PAGO_AQUI";

function actualizarVisibilidadTransferencia() {
    const marcado = document.getElementById('pagoTransferencia').checked;
    document.getElementById('datosTransferencia').classList.toggle('oculto', !marcado);
}

function separarTelefono(telefono, codigoPais) {
    if (!telefono) return '';
    if (!codigoPais) codigoPais = '+54';
    const txt = telefono.trim();
    if (txt.startsWith(codigoPais)) {
        return txt.slice(codigoPais.length).trim();
    }
    return txt;
}

// ============================================================
// Cargar TODOS los datos del perfil directamente desde la BD
// ============================================================
async function cargarDatosDesdeBD() {
    const respuesta = await peticionAPI('/api/usuarios/perfil', 'GET');
    if (!respuesta || !respuesta.ok) return;

    const datos = await respuesta.json();

    // Datos básicos
    document.getElementById('nombreUsuario').value = datos.nombre || '';
    document.getElementById('nombreLocal').value = datos.nombreDelLocal || '';
    const inputEmail = document.getElementById('inputEmail');
    if (inputEmail) inputEmail.value = datos.email || '';

    // Teléfono separado: código de país + número
    const codigoPaisDefecto = datos.codigoPais || '+54';
    document.getElementById('codigoPaisPerfil').value = codigoPaisDefecto;
    document.getElementById('whatsappNumero').value = separarTelefono(datos.telefono || '', codigoPaisDefecto);

    document.getElementById('direccion').value = datos.direccion || '';

    // Nombre del local en la tarjeta de identidad
    const nombreLocalDisplay = document.getElementById('nombreLocalDisplay');
    if (nombreLocalDisplay) nombreLocalDisplay.textContent = datos.nombreDelLocal || '';

    // URL del local (se arma como /menu/<slug>)
    const baseUrl = window.location.origin;
    document.getElementById('url').value = datos.slug ? `${baseUrl}/menu/${datos.slug}` : '';

    // Foto de perfil (logo) en el círculo del avatar
    if (datos.fotoPerfil) {
        const avatarImg = document.getElementById('avatarImg');
        if (avatarImg) avatarImg.src = datos.fotoPerfil;
        const userGuardado = JSON.parse(localStorage.getItem('user'));
        userGuardado.fotoPerfil = datos.fotoPerfil;
        localStorage.setItem('user', JSON.stringify(userGuardado));
    }

    // Los métodos de pago se cargan con la función existente
    // (evitamos duplicar código y el backend ya la soporta)
    cargarMetodosPagoGuardados();
}

// Lee los métodos de pago guardados en la BD y los precarga en el formulario
async function cargarMetodosPagoGuardados() {
    try {
        const res = await peticionAPI('/api/usuarios/metodosPago', 'GET');
        const data = res.ok ? await res.json() : { metodosPago: [] };
        const metodos = data.metodosPago || [];

        const tipos = metodos.map(m => m.tipo);
        document.getElementById('pagoEfectivo').checked     = tipos.includes('efectivo');
        document.getElementById('pagoTransferencia').checked = tipos.includes('transferencia');
        document.getElementById('pagoTarjeta').checked      = tipos.includes('tarjeta');

        const transf = metodos.find(m => m.tipo === 'transferencia');
        if (transf) {
            document.getElementById('transAlias').value    = transf.alias    || '';
            document.getElementById('transTitular').value  = transf.titular  || '';
        }
        actualizarVisibilidadTransferencia();
    } catch (error) {
        console.error('Error al cargar métodos de pago:', error);
    }
}

// Función que solo LEE de la base de datos
async function leerEstadoParaElPerfil() {
    try {

        // Le preguntamos a MongoDB cómo está el local
        const respuesta = await peticionAPI('/api/usuarios/estadoLocal', 'GET');
        const resultado = await respuesta.json();

        if (respuesta.ok) {
            // Cambiamos el texto y el color según lo que diga la base de datos
            if (resultado.abierto) {
                cartelitoEstado.innerText = "Local Abierto 🟢";
                cartelitoEstado.style.color = "#16a34a"; 
            } else {
                cartelitoEstado.innerText = "Local Cerrado 🔴";
                cartelitoEstado.style.color = "#dc2626"; 
            }
        }
    } catch (error) {
        console.error("Error al leer el estado:", error);
    }
}


document.addEventListener('DOMContentLoaded', async ()=>{
    const token = localStorage.getItem("token");
    const userDataJS = localStorage.getItem("user");

    if (!token || !userDataJS){
        window.location.href="/admin/login.html";
        return;
    }

        cargarHeader(userDataJS);

    await cargarDatosDesdeBD();

    const btnPago = document.getElementById('btnPagoMensual');
    if (btnPago) btnPago.href = LINK_DE_MERCADO_PAGO;

    const userData = JSON.parse(userDataJS);

    // Si el local ya tiene una foto guardada, la mostramos en el avatar
    // (ya sea que venga en el localStorage o la busquemos desde el servidor)
    function actAvatar(foto) {
        if (foto) {
            const img = document.getElementById('avatarImg');
            img.src = foto;
            // Guardamos en localStorage para que quede fresco
            const userGuardado = JSON.parse(localStorage.getItem('user'));
            userGuardado.fotoPerfil = foto;
            localStorage.setItem('user', JSON.stringify(userGuardado));
        }
    }

    if (userData.fotoPerfil) {
        actAvatar(userData.fotoPerfil);
    } else if (userData.slug) {
        // Intentamos obtenerla desde el perfil público (sin token, igual funciona)
        peticionAPI(`/api/publico/perfil/${userData.slug}`, 'GET')
            .then(resp => resp && resp.ok ? resp.json() : null)
            .then(data => {
                if (data && data.fotoPerfil) actAvatar(data.fotoPerfil);
            })
            .catch(() => {});
    }

    // Modificar los placeholder con la información del local
    document.getElementById('nombreUsuario').value = userData.nombre || '';
    document.getElementById('nombreLocal').value = userData.nombreDelLocal || '';
    userData.nombreLocal ? document.getElementById('nombreLocal').placeholder = '' : document.getElementById('nombreLocal').placeholder ='Agrega un nombre';

    // Separar el teléfono: el código de país va en el selector, el número va sin código
    const codigoPaisDefecto = userData.codigoPais || '+54';
    document.getElementById('codigoPaisPerfil').value = codigoPaisDefecto;
    document.getElementById('whatsappNumero').value = separarTelefono(userData.telefono || '', codigoPaisDefecto);

    document.getElementById('direccion').value = userData.direccion || '';
    userData.direccion ? document.getElementById('direccion').placeholder = '' : document.getElementById('direccion').placeholder ='Agrega una dirección';

    // Mostrar nombre del local en la tarjeta de identidad
    const nombreLocalDisplay = document.getElementById('nombreLocalDisplay');
    if (nombreLocalDisplay) nombreLocalDisplay.textContent = userData.nombreDelLocal || '';

    // Email del usuario (no editable)
    const inputEmail = document.getElementById('inputEmail');
    if (inputEmail) inputEmail.value = userData.email || '';
    // 1. Agarramos la base de la página (Ej: "http://localhost:3000" o "https://miapp.com")
    const baseUrl = window.location.origin;

    if (userData.slug) {
        // La URL pública del menú es /menu/<slug>
        const urlCompleta = `${baseUrl}/menu/${userData.slug}`;
        document.getElementById('url').value = urlCompleta;
    } else {
        document.getElementById('url').value = '';
    };

        leerEstadoParaElPerfil();
    setInterval(leerEstadoParaElPerfil, 60000);

        // Cargar métodos de pago desde la base de datos (para que siempre estén frescos)
    cargarMetodosPagoGuardados();

        document.getElementById('pagoTransferencia').addEventListener('change', actualizarVisibilidadTransferencia);
});

// ===========================================
//             EVENTOS
// ===========================================
const btnGuardar = document.getElementById('btnGuardarCambios');
btnGuardar.addEventListener('click', async (e) =>{
    e.preventDefault();

    // 1. Datos del local
    const nombreLocal    = document.getElementById('nombreLocal').value;
    const whatsappNumero = document.getElementById('whatsappNumero').value.trim();
    const codigoPais     = document.getElementById('codigoPaisPerfil').value;
    const direccion      = document.getElementById('direccion').value;
    const nombreUsuario = document.getElementById('nombreUsuario').value;

    // 2. Métodos de pago: armamos el array según los checkboxes tildados
    const metodosPago = [];
    if (document.getElementById('pagoEfectivo').checked)
        metodosPago.push({ tipo: 'efectivo' });
    if (document.getElementById('pagoTransferencia').checked)
        metodosPago.push({
            tipo:    'transferencia',
            alias:   document.getElementById('transAlias').value.trim(),
            titular: document.getElementById('transTitular').value.trim()
        });
    if (document.getElementById('pagoTarjeta').checked)
        metodosPago.push({ tipo: 'tarjeta' });

    const datosNuevos = {nombre: nombreUsuario,  nombreDelLocal: nombreLocal, telefono: whatsappNumero, codigoPais, direccion, metodosPago };

    try {
        const resultado = await peticionAPI('/api/usuarios/modificarDatos', 'PATCH', datosNuevos);
        const respuesta = await resultado.json();

        if (resultado.ok) {
            // Actualizamos el localStorage para que la info sea fresca
            const userGuardado = JSON.parse(localStorage.getItem('user'));
            Object.assign(userGuardado, { nombre: nombreUsuario, nombreDelLocal: nombreLocal, telefono: whatsappNumero, codigoPais, direccion, metodosPago });
            localStorage.setItem('user', JSON.stringify(userGuardado));
            alert('¡Perfil actualizado con éxito!');
        } else {
            alert('Hubo un error: ' + (respuesta.mensaje || respuesta.error));
        }
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
    }
});

//=====================================
//   BOTÓN DE ACTUALIZAR CONTRASEÑA
//=====================================

const btnActualizarContraseña = document.getElementById('btnActualizarContraseña'); 

btnActualizarContraseña.addEventListener('click', async (e) => {
    e.preventDefault();

    const passwordActual = document.getElementById('passActual').value;
    const passwordNueva = document.getElementById('passNueva').value; 
    const passwordConfirm = document.getElementById('passConfirm').value;

    if (passwordNueva !== passwordConfirm)
    {
        return;
    }
    btnActualizarContraseña.disabled = true;
    btnActualizarContraseña.innerText = "Guardando...";

    // Realizamos la petición
    const respuesta = await peticionAPI('/api/usuarios/cambiarPassword', 'PATCH', {
        passwordActual,
        passwordNueva
    });

    const resultado = await respuesta.json();

    console.log("Lo que respondió el servidor:", resultado);

    if (resultado && resultado.error) {
        alert("Error: " + resultado.error);
    } else if (resultado) {
        alert(resultado.mensaje);
        document.getElementById('passActual').value = '';
        document.getElementById('passNueva').value = '';
        document.getElementById('passConfirm').value = '';
    }

        btnActualizarContraseña.disabled = false;
    btnActualizarContraseña.innerText = "Actualizar Contraseña";
});

// ===========================================
//   FOTO DE PERFIL DEL LOCAL (AVATAR)
// ===========================================
const avatarImg   = document.getElementById('avatarImg');
const btnFoto     = document.getElementById('btnCambiarFoto');
const inputFoto   = document.getElementById('inputFoto');

// Clickeando la foto O el botón de la cámara → se abre el selector de archivos
avatarImg.addEventListener('click', () => inputFoto.click());
btnFoto.addEventListener('click', () => inputFoto.click());

// Cuando el usuario elige una foto de su dispositivo
inputFoto.addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    // 1. Vista previa local al instante (antes de subir)
    const lector = new FileReader();
    lector.onload = (ev) => { avatarImg.src = ev.target.result; };
    lector.readAsDataURL(archivo);

    // 2. Subir la foto al servidor y guardarla en la base de datos
    try {
        const formData = new FormData();
        formData.append('foto', archivo);

        const respuesta = await fetch('/api/usuarios/subirFotoPerfil', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || 'No se pudo subir la foto');
        }

        // 3. Guardar la URL nueva en el localStorage para que esté fresca
        const userGuardado = JSON.parse(localStorage.getItem('user'));
        userGuardado.fotoPerfil = datos.url;
        localStorage.setItem('user', JSON.stringify(userGuardado));

        // 4. Refrescar el logo del header al instante
        actualizarLogoHeader(datos.url);

        alert('¡Foto actualizada con éxito!');
    } catch (error) {
        console.error('Error al subir la foto:', error);
        alert('No se pudo subir la foto. Intentá de nuevo.');
    }

    // Limpiamos el input para poder elegir la misma foto otra vez
    inputFoto.value = '';
});

// Reemplaza la pizza del header por la foto del local
function actualizarLogoHeader(url) {
    const logoImg   = document.getElementById('headerLogoImg');
    const logoEmoji = document.getElementById('headerLogoEmoji');
    if (logoImg && logoEmoji) {
        logoImg.src = url;
        logoImg.hidden = false;
        logoEmoji.hidden = true;
    }
}

// ===========================================
//   MODAL CAMBIO DE PLAN
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnCambiarPlan = document.getElementById('btn-cambiar-plan');
    const modalPlanes = document.getElementById('modal-planes');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');

    if (!btnCambiarPlan || !modalPlanes) return;

    btnCambiarPlan.addEventListener('click', () => {
        modalPlanes.classList.add('visible');
    });

    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', () => {
            modalPlanes.classList.remove('visible');
        });
    }

    modalPlanes.addEventListener('click', (e) => {
        if (e.target === modalPlanes) {
            modalPlanes.classList.remove('visible');
        }
    });
});

