
// ==========================================
// 1. ZONA DE FUNCIONES
// ==========================================


//============CARGAR LA LISTA DE PLATOS===========

/**
 * @Propósito: Poner la lista de todos los platos cargados en la base de datos en la lista del dashbord.
 * @Parámetros: no tiene.
 * @Retorna: nada.
 */
async function cargarListaDePlatos() {
    try {
        // 1. Pedimos TODOS los platos (solo la ruta genérica, sin ID ni datos)
        const respuesta = await peticionAPI('/api/platos', 'GET');

        // 2. atajamos un posible null:
        if (!respuesta) return;

        const listaDePlatos = await respuesta.json();
        const tbody = document.getElementById("lista-platos");
        
        tbody.innerHTML = ''; // Vaciamos la tabla antes de rellenarla

        // 3. Recorremos el array y pasamos el "plato" entero a tu función dibujadora
        listaDePlatos.forEach(plato => {
            cargarHTMLListaDePlatos(plato);
        });
        
    } catch (error) {
        console.error('Error al cargar platos:', error);
    }
}



// ==== FUNCIÓN CREAR PLATO ======
/**
 * Envía la petición al backend para guardar el plato nuevo creado de un plato existente.
 * @param {object} datosPlato - Objeto que contiene los datos nuevos tipeados por el usuario (ej: { nombre: "Pizza", precio: 5000 }).
 * @param {HTMLElement} formPlato - El elemento HTML del formulario en sí, necesario para limpiarlo (.reset()) cuando terminamos.
 */
async function crearPlato(datosPlato, formPlato) {
    const respuesta = await peticionAPI('/api/platos', 'POST', datosPlato);
    
    if (respuesta && respuesta.ok) {
        alert("Plato guardado");
        terminarYRedibujar(formPlato);
    } else {
        alert("Error al guardar el plato");
    }
}


// ========== FUNCIÓN EDITAR PLATO ==========
/**
 * Envía la petición al backend para guardar los cambios de un plato existente.
 * 
 * @param {string} idOculto - El ID del plato que vamos a editar (sacado del input invisible).
 * @param {object} datosPlato - Objeto que contiene los datos nuevos tipeados por el usuario (ej: { nombre: "Pizza", precio: 5000 }).
 * @param {HTMLElement} formPlato - El elemento HTML del formulario en sí, necesario para limpiarlo (.reset()) cuando terminamos.
 */
async function editarPlato(idOculto, datosPlato, formPlato) {
    const respuesta = await peticionAPI(`/api/platos/${idOculto}`, 'PUT', datosPlato);
    
    if (respuesta && respuesta.ok) {
        alert("¡Plato editado con éxito!");
        document.getElementById('platoId').value = ""; // Vaciamos la bandera
        document.getElementById("tituloModal").innerText = "Crear Plato";
        document.getElementById("btnGuardarPlato").innerText = "Guardar Plato";
        terminarYRedibujar(formPlato);
    } else {
        alert("Error al editar el plato");
    }
}


// =================== FUNCIÓN BORRAR PLATO ===========================
/**
 * @Propósito: Envía la orden al backend para eliminar un plato y recarga la tabla.
 * @Parámetros: idPlato (el número de ID a borrar)
 */
async function borrarPlato(idPlato) {
    const respuesta = await peticionAPI(`/api/platos/${idPlato}`, 'DELETE');
    
    // Validamos que la sesión no haya caducado y que el borrado haya sido exitoso
    if (respuesta && respuesta.ok) {
        alert("🗑️ Plato borrado exitosamente");
        // Volvemos a pedir la lista al backend para que la lista se actualice sola
        cargarListaDePlatos(); 
    } else {
        alert("Hubo un error al intentar borrar el plato");
    }
}


// FUNCIÓN PARA CARGAR BLOQUE DE HTML CON LA LISTA DE PLATOS CARGADOS EN LA BD
/**
 * 
 *   @param {object} datosPlato - Objeto que contiene los datos nuevos tipeados por el usuario (ej: { nombre: "Pizza", precio: 5000 }).
 */
async function cargarHTMLListaDePlatos(datosPlato){

    const listaPlatos = document.getElementById("lista-platos");
    
    const bloqueHTML = `
    <tr>
        <td>${datosPlato.nombre}</td>
        <td>$ ${datosPlato.precio}</td>
        <td>
            <button class="btn-accion btn-editar" 
                data-id="${datosPlato.id}"
                data-nombre="${datosPlato.nombre}" 
                data-precio="${datosPlato.precio}">
                Editar
            </button>
            <button class="btn-accion btn-borrar" 
                data-id="${datosPlato.id}"
                data-nombre="${datosPlato.nombre}" 
                data-precio="${datosPlato.precio}">Borrar</button>
        </td>
    </tr>
`;
    listaPlatos.insertAdjacentHTML('beforeend',bloqueHTML);
    
}

// Un mini-helper para no repetir el cierre del modal:
function terminarYRedibujar(formPlato) {
    formPlato.reset();
    document.getElementById("modalOverlay").hidden = true;
    cargarListaDePlatos();
}


// ==========================================
// 2. ZONA DE EJECUCIÓN 
// ==========================================

// ========== DOM CONTENT LOADED =================

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuarioDataString = localStorage.getItem('user');

    if (!token || !usuarioDataString) {
        window.location.href = '/admin/login.html';
        return; 
    }

    // 1. PRIMERO cargamos el componente del Header
    cargarHeader(usuarioDataString);

    // 2. Verificamos el acceso
    verificarAcceso(); 
   
    // 3. Cargamos los platos de la base de datos
    cargarListaDePlatos();
    

const modalOverlay = document.getElementById('modalOverlay');
const btnCargaManual = document.getElementById('btnCargaManual');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    
if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            cerrarSesion(); // Llamamos a la función que guardamos en api.js
        });
    }

// 4. Cuando el usuario hace click en carga manual se abre el modal
btnCargaManual.addEventListener('click', () => {
        modalOverlay.hidden = false; 
    });

// 5. Cuando el modal está activado y usuario hace click en la cruz este se cierra.
btnCerrarModal.addEventListener('click', () =>{
    modalOverlay.hidden = true;
});
    
});



// ================= BTN CERRAR SESIÓN =================
/**
 * proppósito: enciar al usuario a la página del login, eliminar el token de localstorage
 */


// 1. LA PUERTA DE CALLE (Se ejecuta sola al instante)
function verificarAcceso() {
    const token = localStorage.getItem('token');
    
    // Si directamente no hay token (entró escribiendo la URL a mano), lo pateamos
    if (!token) {
        window.location.href = '/admin/login.html';
    }
}





// ============= BOTÓN GUARDAR PLATO ===============
const btnGuardar = document.getElementById("btnGuardarPlato");
const listaPlatos = document.getElementById("lista-platos");

/**
 * PROPÓSITO: Al hacer clicj en guardar plato este se guarda en la BD y además se mostrará en pantalla 
 * la lista de los platos del dashbord
 */

btnGuardar.addEventListener('click', async (e) => {
    e.preventDefault(); // frenar recarga de la página

    const formPlato = document.getElementById("formCrearPlato");
    const datosForm = new FormData(formPlato);
    
    
    const datosPlato = {
        nombre: datosForm.get('nombre'),
        precio: Number(datosForm.get('precio')),
        id: Number(datosForm.get('id'))
    };

    const idOculto = datosPlato.id;

    if (idOculto === 0) {
        await crearPlato(datosPlato, formPlato);
    } else {
        await editarPlato(idOculto, datosPlato, formPlato);
    }
    
    cargarHTMLListaDePlatos(datosPlato);
    terminarYRedibujar(formPlato)
    
});



//================== BOTÓN EDITAR ===============================
/** 
 * Propósito: Abrir el modal y colocar en cada input el valor correspondiente según el plato seleccionado.
 * 
 */

// 1. Capturamos la tabla entera (el contenedor)
const tbodyPlatos = document.getElementById("lista-platos");

// 2. evento
tbodyPlatos.addEventListener('click', (e) => {
    
    // 3. Nos fijamos si el clic fue EXACTAMENTE en un elemento con la clase 'btn-editar'
    if (e.target.classList.contains('btn-editar')) {
        
        // 4. Le sacamos los datos de las "mochilas" al botón que clickeamos
        const idPlato = e.target.getAttribute('data-id');
        console.log("1. Hice clic en editar. El ID de la mochila es:", idPlato);
        document.querySelector('input[name="id"]').value = idPlato;        
        const nombrePlato = e.target.getAttribute('data-nombre');
        const precioPlato = e.target.getAttribute('data-precio');

        // 5. Autocompletamos los inputs del modal con esos datos
        document.querySelector('input[name="nombre"]').value = nombrePlato;
        document.querySelector('input[name="precio"]').value = precioPlato;
        document.querySelector('input[name="id"]').value = idPlato

        // 6. Abrimos el modal
        modalOverlay.hidden = false;
        
        // cambiamos el título y el texto del botón
        document.getElementById("tituloModal").innerText = "Editar Plato";
        document.getElementById("btnGuardarPlato").innerText = "Guardar Cambios";
    }

    const botonBorrar = e.target.closest('.btn-borrar');
    if (botonBorrar) {
        const idPlato = botonBorrar.getAttribute('data-id');
        const nombrePlato = botonBorrar.getAttribute('data-nombre');

        // La regla de oro: Confirmación nativa de JavaScript
        const confirmacion = confirm(`¿Estás 100% seguro de que querés borrar el plato "${nombrePlato}"?\nEsta acción no se puede deshacer.`);

        if (confirmacion) {
            borrarPlato(idPlato);
        }
    }
});