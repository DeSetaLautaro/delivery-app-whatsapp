
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
        <td>${datosPlato.categoria}</td>
        <td class="tdBotones">
            <!-- Desktop: botones normales -->
            <div class="acciones-desktop">
                <button class="btn-accion btn-editar"
                    data-id="${datosPlato.id}"
                    data-nombre="${datosPlato.nombre}"
                    data-precio="${datosPlato.precio}"
                    data-categoria="${datosPlato.categoria}">
                    Editar
                </button>
                <button class="btn-accion btn-borrar"
                    data-id="${datosPlato.id}"
                    data-nombre="${datosPlato.nombre}"
                    data-precio="${datosPlato.precio}"
                    data-categoria="${datosPlato.categoria}">
                    Borrar
                </button>
            </div>
            <!-- Mobile: tres puntos -->
            <div class="acciones-mobile">
                <button class="btn-tres-puntos" onclick="toggleMenuTresPuntos(this)">&#8942;</button>
                <div class="menu-tres-puntos" hidden>
                    <button class="btn-accion btn-editar"
                        data-id="${datosPlato.id}"
                        data-nombre="${datosPlato.nombre}"
                        data-precio="${datosPlato.precio}"
                        data-categoria="${datosPlato.categoria}">
                        ✏️ Editar
                    </button>
                    <button class="btn-accion btn-borrar"
                        data-id="${datosPlato.id}"
                        data-nombre="${datosPlato.nombre}"
                        data-precio="${datosPlato.precio}"
                        data-categoria="${datosPlato.categoria}">
                        🗑️ Borrar
                    </button>
                </div>
            </div>
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



// Agregamos async aquí para poder usar await
async function cargarCategorias() {
    // 1. Obtenemos el elemento select
    const selectFiltro = document.getElementById('filtroCat');
    if (!selectFiltro) return;

    try {
        // 2. Traemos los platos del servidor
        const respuesta = await peticionAPI('/api/platos', 'GET');
        if (!respuesta) return;
        platos = await respuesta.json();

        // 3. Obtenemos categorías únicas (¡esto de Claude está excelente!)
        const catUnicas = new Set(platos.map(p => p.categoria));
        console.log(`cat unicas: ${catUnicas}`);

        // 4. Limpiamos y preparamos el select
        //selectFiltro.innerHTML = '<option value="todas"> Todas </option>';

        // 5. Agregamos las opciones
        catUnicas.forEach(categoria => {
            const opcion = document.createElement('option');
            opcion.value = categoria;
            opcion.textContent = categoria; // ¡Te faltó esto! Sin texto, el usuario ve opciones vacías
            selectFiltro.appendChild(opcion);
        });
    } catch (error) {
        console.error("Error al cargar categorías:", error);
    }
}




// Abre/cierra el menú de tres puntos en mobile.
// Cierra cualquier otro que esté abierto primero.
function toggleMenuTresPuntos(btn) {
    const menu = btn.nextElementSibling;
    const estabaAbierto = !menu.hidden;
    // Cerrar todos
    document.querySelectorAll('.menu-tres-puntos').forEach(m => m.hidden = true);
    // Abrir solo si estaba cerrado
    if (!estabaAbierto) menu.hidden = false;
}
// Cerrar al clickear fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.acciones-mobile')) {
        document.querySelectorAll('.menu-tres-puntos').forEach(m => m.hidden = true);
    }
});

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

    cargarCategorias();
    

const modalOverlay = document.getElementById('modalOverlay');
const btnCargaManual = document.getElementById('btnCargaManual');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const modalExcel = document.getElementById("modalExcel");
    
if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            cerrarSesion(); // Llamamos a la función que guardamos en api.js
        });
    }

// 4. Cuando el usuario hace click en carga manual se abre el modal
btnCargaManual.addEventListener('click', () => {
        document.getElementById("tituloModal").innerText = "Crear Plato";
        document.getElementById("btnGuardarPlato").innerText = "Guardar Plato";
        modalOverlay.hidden = false; 
    });

// 5. Cuando el modal está activado y usuario hace click en la cruz este se cierra.
// 1. Agarramos a TODOS los botones de cerrar de la página de un plumazo
const botonesCerrar = document.querySelectorAll('.modal-close');

// 2. Los recorremos uno por uno para ponerles la oreja (el evento click)
botonesCerrar.forEach( boton => {
    
    boton.addEventListener('click', (evento) => {
        // EL TRUCO SENIOR: .closest()
        // Esto le dice al botón: "Buscá hacia arriba a tu 'padre' que tenga la clase 'modal'"
        const modalPadre = evento.target.closest('.modal-overlay');
        
        // Una vez que lo encuentra, lo esconde (le pone la clase que lo oculta)
        if (modalPadre) {
            modalPadre.hidden = true; // (O display='none', según cómo lo tengas en tu CSS)
            
            if (modalPadre.id === 'modalIA') {
                limpiarModalIA();
            }
            
        }
        
    });
    
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
        id: datosForm.get('id'),
        categoria : datosForm.get('categoria')
    };

    const idOculto = datosPlato.id;

    if (idOculto === "") {
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
    
    // 3. Atrapamos el botón de editar usando closest() (¡igual que el de borrar!)
    const btnEditar = e.target.closest('.btn-editar');
    
    // Si hicimos clic en algo que es (o está adentro de) un botón de editar...
    if (btnEditar) {
        
        // 4. ATENCIÓN ACÁ: Le sacamos los datos a 'btnEditar', ya no a 'e.target'
        const idPlato = btnEditar.getAttribute('data-id');
        console.log("1. Hice clic en editar. El ID de la mochila es:", idPlato);
        
        const nombrePlato = btnEditar.getAttribute('data-nombre');
        const precioPlato = btnEditar.getAttribute('data-precio');
        const catPlato = btnEditar.getAttribute('data-categoria');

        // 5. Autocompletamos los inputs del modal con esos datos
        document.querySelector('input[name="id"]').value = idPlato;        
        document.querySelector('input[name="nombre"]').value = nombrePlato;
        document.querySelector('input[name="precio"]').value = precioPlato;
        document.querySelector('input[name="categoria"]').value = catPlato;

        // 6. Abrimos el modal
        modalOverlay.hidden = false;
        
        // Cambiamos el título y el texto del botón
        document.getElementById("tituloModal").innerText = "Editar Plato";
        document.getElementById("btnGuardarPlato").innerText = "Guardar Cambios";
    }

    // ==========================================
    // LÓGICA DE BORRAR (Esto lo tenías perfecto)
    // ==========================================
    const botonBorrar = e.target.closest('.btn-borrar');
    if (botonBorrar) {
        const idPlato = botonBorrar.getAttribute('data-id');
        const nombrePlato = botonBorrar.getAttribute('data-nombre');

        const confirmacion = confirm(`¿Estás 100% seguro de que querés borrar el plato "${nombrePlato}"?\nEsta acción no se puede deshacer.`);

        if (confirmacion) {
            borrarPlato(idPlato);
        }
    }
});


// =====================================================
//                  LECTURA DE ARCHIVOS
//======================================================

// 1. Capturamos ambos elementos
const inputOculto = document.getElementById('inputArchivo');
const btnSubir = document.getElementById('btnSubirArchivo');
const btnSubirDefinitivo = document.getElementById("btnSubirExcel");
const btnProcesarIA = document.getElementById("btnSubirConIA");
const btnProcesarIADef = document.getElementById('btnProcesarIA')
const inputFotosIA = document.getElementById("inputFotosIA");
const btnElegirFotos = document.getElementById("btnElegirFotos");

// ==========================================
// PASO 1: ABRIR LA PANTALLITA DE WINDOWS
// ==========================================
btnSubir.addEventListener('click', () => {
    // Cuando el usuario hace clic en el BOTÓN, 
    // se manda un clic "fantasma" al input oculto.
    
   const modalExcel = document.getElementById("modalExcel");
   modalExcel.hidden = false;

});


btnProcesarIA.addEventListener('click', () => {
   const modalIA = document.getElementById("modalIA");
   modalIA.hidden = false;

});


btnSubirDefinitivo.addEventListener('click', () =>{
    inputOculto.click(); 
});

btnElegirFotos.addEventListener('click', () =>{
    inputFotosIA.click();

});
// ==========================================
// PASO 2: ATAJAR EL ARCHIVO CUANDO TERMINA
// ==========================================
inputOculto.addEventListener('change', (e) => {
    // Esto se ejecuta cuando el usuario le da "Abrir/Aceptar" en la pantallita de Windows
    
    const archivo = e.target.files[0];
    if (!archivo) return; // Si el usuario cerró la pantallita sin elegir nada, no hacemos nada

    console.log("¡Archivo atrapado! Se llama:", archivo.name);

    // Acá adentro va la lectura con el FileReader y SheetJS...
    const lector = new FileReader();
    lector.onload = async (evento) => {
        const datosCrudos = new Uint8Array(evento.target.result);
        const libro = XLSX.read(datosCrudos, { type: 'array' });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        
        const platosJSON = XLSX.utils.sheet_to_json(hoja); 
        console.log("El JSON listo:", platosJSON);
        
        const respuesta = await peticionAPI('/api/platos/bulk', 'POST', platosJSON);

        if (respuesta && respuesta.ok) {
            alert("¡Menú cargado con éxito!");
            // Acá podrías llamar a la función que actualiza la tablita visual
        } else {
            alert("Hubo un error al subir los platos.");
        }
    };

    lector.readAsArrayBuffer(archivo);

    // Truco extra: Vaciamos el input invisible para que el usuario 
    // pueda volver a subir el MISMO archivo si se equivocó y lo corrigió.
    e.target.value = ''; 
});

// Nuestro array que va a ACUMULAR las fotos
let fotosListasParaIA = [];


inputFotosIA.addEventListener('change', (e) => {
    const nuevosArchivos = Array.from(e.target.files);
    if (nuevosArchivos.length === 0) return; 

    // REGLA: Verificamos si la suma de lo que ya había + lo nuevo pasa de 3
    if (fotosListasParaIA.length + nuevosArchivos.length > 3) {
        alert("¡Epa! Podés tener hasta 3 fotos como máximo. Borrá alguna si querés subir otra.");
        inputFotosIA.value = ''; 
        return;
    }

    // Si está todo bien, procesamos las NUEVAS fotos
    nuevosArchivos.forEach(archivo => {
        if (!archivo.type.startsWith('image/')) return;

        // 1. Guardamos el archivo físico en nuestra caja fuerte
        fotosListasParaIA.push(archivo);
        
        // 2. Llamamos a un ayudante para que dibuje la fotito
        dibujarMiniatura(archivo);
    });

    // 3. Revisamos si hay que apagar o prender los botones
    actualizarEstadoBotones();
    
    // Vaciamos el input para que pueda elegir más si quiere
    inputFotosIA.value = ''; 
});

// ==========================================
// FUNCIONES AYUDANTES
// ==========================================

function dibujarMiniatura(archivoFisico) {
    const lector = new FileReader();
    
    lector.onload = (evento) => {
        // 1. Creamos el contenedor
        const divWrapper = document.createElement('div');
        divWrapper.className = 'miniatura-wrapper';

        // 2. Creamos la imagen
        const img = document.createElement('img');
        img.src = evento.target.result;
        img.className = 'miniatura';

        // 3. Creamos el botón de la X
        const btnBorrar = document.createElement('button');
        btnBorrar.className = 'btn-borrar-foto';
        btnBorrar.innerHTML = '✖';

        // 4. ¿Qué pasa si el usuario aprieta la X?
        btnBorrar.addEventListener('click', () => {
            // A) Buscamos en qué posición del Array estaba esta foto y la borramos (.splice)
            const indice = fotosListasParaIA.indexOf(archivoFisico);
            if (indice > -1) {
                fotosListasParaIA.splice(indice, 1);
            }
            
            // B) Destruimos el HTML (la fotito) de la pantalla
            divWrapper.remove();
            
            // C) Volvemos a revisar los botones (capaz ahora bajó de 3 y hay que prender "Elegir fotos")
            actualizarEstadoBotones();
        });

        // Metemos la foto y el botón adentro del contenedor, y el contenedor a la pantalla
        divWrapper.appendChild(img);
        divWrapper.appendChild(btnBorrar);
        contenedorMiniaturas.appendChild(divWrapper);
    };

    lector.readAsDataURL(archivoFisico);
}

function actualizarEstadoBotones() {
    // Si llegó a 3 fotos, apagamos el botón de subir más
    btnElegirFotos.disabled = (fotosListasParaIA.length >= 3);
    
    // Si no hay ninguna foto, apagamos el botón de procesar IA
    //btnProcesarIA.disabled = (fotosListasParaIA.length === 0);
}

function limpiarModalIA() {
    // 1. Vaciamos la memoria (el array)
    fotosListasParaIA = [];
    
    // 2. Destruimos las fotitos de la pantalla
    contenedorMiniaturas.innerHTML = '';
    
    // 3. Vaciamos el input invisible por las dudas
    inputFotosIA.value = '';
    
    // 4. Llamamos a nuestra directora de orquesta para que apague y prenda los botones
    actualizarEstadoBotones();
}



btnProcesarIADef.addEventListener('click', async () => {
    // 1. Cambiamos el botón para avisar que está trabajando
    const textoOriginalBoton = btnProcesarIADef.textContent;
    btnProcesarIADef.textContent = "Procesando y guardando... (esto tarda unos segunditos)";
    btnProcesarIADef.disabled = true;

    // 2. Preparamos las fotos
    const formData = new FormData();
    fotosListasParaIA.forEach((foto, index) => {
        formData.append(`foto${index}`, foto);
    });

    try {
        // 3. Mandamos a procesar con la IA
        const respuestaIA = await fetch('/api/platos/procesar-ia', {
            method: 'POST',
            body: formData 
        });

        if (!respuestaIA.ok) throw new Error("Error al procesar las fotos con la IA.");

        // Extraemos los platos que armó la IA
        const { platos } = await respuestaIA.json(); 
    
        // 4. Como ya no hay modal, los mandamos a guardar directamente
        await peticionAPI('/api/platos/procesar-ia/', 'POST', { nuevosPlatos: platos });
        
        alert("¡Platos procesados y guardados con éxito!");
        
        // Opcional: Recargar la página para que la tabla principal muestre los platos nuevos
        // location.reload();

    } catch (error) {
        console.error("Error en el proceso:", error);
        alert("Hubo un problema: " + error.message);
    } finally {
        // 5. Devolvemos el botón a la normalidad
        btnProcesarIADef.textContent = textoOriginalBoton;
        btnProcesarIADef.disabled = false;
        modalIA.hidden = true;
    }
});



    


