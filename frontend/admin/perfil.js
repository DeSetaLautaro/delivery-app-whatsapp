const cartelitoEstado = document.getElementById('cartelEstado');

function actualizarVisibilidadTransferencia() {
    const marcado = document.getElementById('pagoTransferencia').checked;
    document.getElementById('datosTransferencia').classList.toggle('oculto', !marcado);
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


document.addEventListener('DOMContentLoaded', ()=>{
    const token = localStorage.getItem("token");
    const userDataJS = localStorage.getItem("user");

    if (!token || !userDataJS){
        window.location.href="/admin/login.html";
        return;
    }

    cargarHeader(userDataJS);

    const userData = JSON.parse(userDataJS);
  

    // Modificar los placeholder con la información del local
    document.getElementById('nombreUsuario').value = userData.nombre || '';
    document.getElementById('nombreLocal').value = userData.nombreDelLocal || '';
    userData.nombreLocal ? document.getElementById('nombreLocal').placeholder = '' : document.getElementById('nombreLocal').placeholder ='Agrega un nombre';
    document.getElementById('whatsappNumero').value = userData.telefono || '';
    document.getElementById('direccion').value = userData.direccion || '';
    userData.direccion ? document.getElementById('direccion').placeholder = '' : document.getElementById('direccion').placeholder ='Agrega una dirección';
    // 1. Agarramos la base de la página (Ej: "http://localhost:3000" o "https://miapp.com")
    const baseUrl = window.location.origin;

    if (userData.slug) {
        // Pegamos la base + una barra + el slug
        const urlCompleta = `${baseUrl}/${userData.slug}`;
        document.getElementById('url').value = urlCompleta;
    } else {
        document.getElementById('url').value = '';
    };

        leerEstadoParaElPerfil();
    setInterval(leerEstadoParaElPerfil, 60000);

    // Cargar métodos de pago guardados
    if (userData.metodosPago && userData.metodosPago.length) {
        const tipos = userData.metodosPago.map(m => m.tipo);
        document.getElementById('pagoEfectivo').checked     = tipos.includes('efectivo');
        document.getElementById('pagoTransferencia').checked = tipos.includes('transferencia');
        document.getElementById('pagoTarjeta').checked      = tipos.includes('tarjeta');

        const transf = userData.metodosPago.find(m => m.tipo === 'transferencia');
        if (transf) {
            document.getElementById('transAlias').value    = transf.alias    || '';
            document.getElementById('transTitular').value  = transf.titular  || '';
        }
    }
    actualizarVisibilidadTransferencia();

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
    const whatsappNumero = document.getElementById('whatsappNumero').value;
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

    const datosNuevos = {nombre: nombreUsuario,  nombreDelLocal: nombreLocal, telefono: whatsappNumero, direccion, metodosPago };

    try {
        const resultado = await peticionAPI('/api/usuarios/modificarDatos', 'PATCH', datosNuevos);
        const respuesta = await resultado.json();

        if (resultado.ok) {
            // Actualizamos el localStorage para que la info sea fresca
            const userGuardado = JSON.parse(localStorage.getItem('user'));
            Object.assign(userGuardado, { nombre: nombreUsuario, nombreDelLocal: nombreLocal, telefono: whatsappNumero, direccion, metodosPago });
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

