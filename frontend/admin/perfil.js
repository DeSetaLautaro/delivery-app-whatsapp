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






});

// ===========================================
//             EVENTOS
// ===========================================
const btnGuardar = document.getElementById('btnGuardarCambios');
btnGuardar.addEventListener('click', async (e) =>{
    e.preventDefault();


    // 1. capturar los valores del html
    const nombreLocal = document.getElementById('nombreLocal').value;
    const whatsappNumero = document.getElementById('whatsappNumero').value;
    const direccion = document.getElementById('direccion').value;

    //2. armar el paquete de datos
    const datosNuevos = 
    {
        nombre: nombreLocal,
        telefono: whatsappNumero,
        direccion: direccion

    }
    // 3.Buscamos el token en localStorage (En realidad no es necesario porque ya lo hacemos en la función peticionAPI)
    //const token = localStorage.getItem('token');

    // 4.Hacemos la petición
    try {
        const resultado = await peticionAPI('/api/usuarios/modificarDatos', 'PATCH', datosNuevos);

        const respuesta = await resultado.json();


        // verificación
        if (respuesta.ok) {
            alert("¡Perfil actualizado con éxito!");

            
        } else{
            alert("Hubo un error: " + respuesta.mensaje);        }
        
    } catch (error) {
        console.error("Error al conectar con el servidor:", error);
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

//=====================================
//      SWITCH ABIERTO/CERRADO
//=====================================

const switchAbierto = document.getElementById('switchLabel');

switchAbierto.addEventListener('change', async (e) => {
    const estaAbierto = e.target.checked; // true si está prendido, false si está apagado

    // 1. Bloqueamos el switch un segundo para que no haga spam de clics
    switchAbierto.disabled = true; 

    // 2. Mandamos la actualización a la base de datos
    const respuesta = await peticionAPI('/api/usuarios/estadoLocal', 'PATCH', {
        abierto: estaAbierto
    });

    const resultado = await respuesta.json();

    // 3. Volvemos a habilitar el switch
    switchAbierto.disabled = false;

    if (!respuesta.ok) {
        alert("Error al cambiar el estado: " + resultado.error);
        // Si falló, volvemos el switch a como estaba antes
        e.target.checked = !estaAbierto; 
    }
});