let listaPlatosGlobal = [];

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
        listaPlatosGlobal = listaDePlatos;
        const tbody = document.getElementById("lista-platos");
        
        tbody.innerHTML = ''; // Vaciamos la tabla antes de rellenarla

        // 3. Recorremos el array y pasamos el "plato" entero a tu función dibujadora
        listaDePlatos.forEach(plato => {
            cargarHTMLListaDePlatos(plato);
        });
        generarCheckboxesCategorias();
        
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

// =============== FUNCIÓN OCULTAR PLATO ===========================

async function ocultarPlato(idPlato) {
    try {
        const res = await peticionAPI(`/api/platos/${idPlato}`, 'PATCH');
        
        // Si peticionAPI falló (devuelve null/undefined o error 4xx/5xx)
        if (!res || !res.ok) {
            console.error("No se pudo cambiar la disponibilidad del plato.");
            return false; 
        }

        return true; 
    } catch (error) {
        console.error("Error en ocultarPlato:", error);
        return false;
    }
}

async function cargarGruposEnSelect() {
    const select = document.getElementById('selectNombreGrupo');

    // 1. Buscamos los datos usando tu función peticionAPI
    // (Asegurate de que la URL coincida con donde pusiste la ruta GET)
    const respuesta = await peticionAPI('/api/toppings/misToppings', 'GET');
    
    // Si la respuesta falló o devolvió null, frenamos acá
    if (!respuesta) return; 

    const grupos = await respuesta.json();

    // 2. Limpiamos el select, pero dejamos las dos opciones obligatorias
    select.innerHTML = `
        <option value="" disabled selected>Seleccioná un grupo...</option>
        <option value="CREAR_NUEVO" style="font-weight: bold;">➕ Crear nuevo grupo...</option>
    `;

    // 3. Recorremos los grupos de la base de datos y creamos un <option> para cada uno
    grupos.forEach(grupo => {
        const opcionHtml = document.createElement('option');
        opcionHtml.value = grupo.nombre;
        opcionHtml.textContent = grupo.nombre;
        
        // Magia: Inserta la opción nueva JUSTO ANTES de la opción "➕ Crear nuevo..."
        select.insertBefore(opcionHtml, select.lastElementChild);
    });
}


// FUNCIÓN PARA CARGAR BLOQUE DE HTML CON LA LISTA DE PLATOS CARGADOS EN LA BD
/**
 * 
 *   @param {object} datosPlato - Objeto que contiene los datos nuevos tipeados por el usuario (ej: { nombre: "Pizza", precio: 5000 }).
 */
async function cargarHTMLListaDePlatos(datosPlato){

    const listaPlatos = document.getElementById("lista-platos");
    // Evaluamos si está disponible
    const estaDisponible = datosPlato.disponible !== false;

    // Definimos el texto inicial (Emoji + Palabra)
    const emojiBotonOcultar = estaDisponible ? "👁️ Ocultar" : "🙈 Mostrar";
    const textoBotonOcultar = estaDisponible ? "Ocultar" : " Mostrar";
    const claseFila = datosPlato.disponible === false ? 'fila-oculta' : '';
    
    
        const bloqueHTML = `
    <tr class = ${claseFila}>
        <td>
            ${datosPlato.nombre}
            ${datosPlato.enPromocion ? `<span class="badge-promo">🔥 ${datosPlato.porcentajeDescuento != null ? datosPlato.porcentajeDescuento + '% OFF' : 'En Promoción'}</span>` : ''}
            ${datosPlato.esEspecialidad ? '<span class="badge-especialidad">⭐ Especialidad</span>' : ''}
            ${datosPlato.esMenuDelDia ? '<span class="badge-menu-dia">☀️ Menú del Día</span>' : ''}
        </td>
        <td>$ ${datosPlato.precio}</td>
        <td>${datosPlato.categoria}</td>
        <td class="tdBotones">
            <!-- Desktop: botones normales -->
            <div class="acciones-desktop">
                                <button class="btn-accion btn-editar"
                    data-id="${datosPlato._id}"
                    data-nombre="${datosPlato.nombre}"
                    data-precio="${datosPlato.precio}"
                    data-categoria="${datosPlato.categoria}"
                    data-foto="${datosPlato.fotoUrl || ''}"
                    data-menu-del-dia="${datosPlato.esMenuDelDia}"
                    data-especialidad="${datosPlato.esEspecialidad}"
                    data-en-promocion="${datosPlato.enPromocion}"
                    data-porcentaje-descuento="${datosPlato.porcentajeDescuento ?? ''}">
                    Editar
                </button>
                <button class="btn-accion btn-ocultar ${estaDisponible ? '' : 'plato-oculto'}"
                    data-id="${datosPlato._id}"
                    data-disponible="${estaDisponible}">
                    ${textoBotonOcultar}
                </button>
                <button class="btn-accion btn-borrar"
                    data-id="${datosPlato._id}"
                    data-nombre="${datosPlato.nombre}"
                    data-precio="${datosPlato.precio}"
                    data-categoria="${datosPlato.categoria}">
                    Eliminar
                </button>
            </div>
            <!-- Mobile: tres puntos -->
            <div class="acciones-mobile">
                <button class="btn-tres-puntos" onclick="toggleMenuTresPuntos(this)">&#8942;</button>
                <div class="menu-tres-puntos" hidden>
                    <button class="btn-accion btn-editar"
                        data-id="${datosPlato._id}"
                        data-nombre="${datosPlato.nombre}"
                        data-precio="${datosPlato.precio}"
                        data-categoria="${datosPlato.categoria}"
                        data-foto="${datosPlato.fotoUrl || ''}"
                        data-menu-del-dia="${datosPlato.esMenuDelDia}"
                        data-especialidad="${datosPlato.esEspecialidad}"
                        data-en-promocion="${datosPlato.enPromocion}"
                        data-porcentaje-descuento="${datosPlato.porcentajeDescuento ?? ''}">
                        ✏️ Editar
                    </button>
                   <button class="btn-accion btn-ocultar ${estaDisponible ? '' : 'plato-oculto'}"
                    data-id="${datosPlato._id}"
                    data-disponible="${estaDisponible}">
                    ${emojiBotonOcultar}
                </button>
                <button class="btn-accion btn-borrar"
                        data-id="${datosPlato._id}"
                        data-nombre="${datosPlato.nombre}"
                        data-precio="${datosPlato.precio}"
                        data-categoria="${datosPlato.categoria}">
                        🗑️ Eliminar
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



// Función que va a buscar  a MongoDB el valor del switch Abierto/Cerrado
async function sincronizarSwitch() {
    try {
        // Hacemos un GET a la ruta que acabamos de crear
        const respuesta = await peticionAPI('/api/usuarios/estadoLocal', 'GET');
        if (!respuesta) return;

        if (respuesta.ok) {
            // Movemos el switch visualmente según lo que diga la base de datos
            switchAbierto.checked = respuesta.abierto;
            
            // Opcional: Cambiar algún texto visual (Ej: "Abierto" en verde o "Cerrado" en rojo)
            const textoEstado = document.getElementById('textoEstadoLocal');
            if (textoEstado) {
                textoEstado.innerText = resultado.abierto ? "Recibiendo pedidos" : "Local cerrado";
                textoEstado.style.color = resultado.abierto ? "green" : "red";
            }
        }
    } catch (error) {
        console.error("Error al sincronizar el switch:", error);
    }
}

async function cargarEstadoDesdeMongoDB() {
    try {
        // 1. Buscamos el paquete a MongoDB
        const respuesta = await peticionAPI('/api/usuarios/estadoLocal', 'GET');
        
        if (!respuesta || !respuesta.ok) return;

        // ¡LA CLAVE ESTÁ ACÁ! 🔑
        // 2. "Abrimos" el paquete crudo para transformarlo en datos de JavaScript
        const datos = await respuesta.json(); 

        // 3. Agarramos los elementos del HTML
        const switchAbierto = document.getElementById('toggleEstado'); 
        const textoEstado = document.getElementById('textoEstadoLocal');

        // 4. Movemos el switch usando los DATOS limpios (no la respuesta cruda)
        switchAbierto.checked = datos.abierto;
            
        // 5. (Opcional) Cambiamos el texto
        if (textoEstado) {
            textoEstado.innerText = datos.abierto ? "Recibiendo pedidos" : "Local cerrado";
            textoEstado.style.color = datos.abierto ? "green" : "red";
        }

    } catch (error) {
        console.error("Error al traer el estado desde MongoDB:", error);
    }
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

    cargarCategorias();
    cargarGruposEnSelect();

  
    cargarEstadoDesdeMongoDB();
    setInterval(cargarEstadoDesdeMongoDB, 60000);
    

const modalOverlay = document.getElementById('modalOverlay');
const btnCargaManual = document.getElementById('btnCargaManual');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const modalExcel = document.getElementById("modalExcel");

// Botón eliminar todos los platos
const btnBorrarTodosPlatos = document.getElementById('btnBorrarTodosPlatos');
if (btnBorrarTodosPlatos) {
    btnBorrarTodosPlatos.addEventListener('click', async () => {
        const confirmar = confirm('¿Estás seguro de querer borrar TODOS tus platos? Esta acción no se puede deshacer.');
        if (!confirmar) return;

        const respuesta = await peticionAPI('/api/platos/todos', 'DELETE');
        if (respuesta && respuesta.ok) {
            const data = await respuesta.json().catch(() => ({}));
            alert(data.mensaje || 'Todos los platos fueron eliminados');
            limpiarFiltros();
            cargarListaDePlatos();
        } else {
            alert('No se pudo borrar los platos. Intentalo de nuevo.');
        }
    });
}

if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            cerrarSesion(); // Llamamos a la función que guardamos en api.js
        });
    }

// 4. Cuando el usuario hace click en carga manual se abre el modal
btnCargaManual.addEventListener('click', () => {
        document.getElementById("tituloModal").innerText = "Crear Plato";
        document.getElementById("btnGuardarPlato").innerText = "Guardar Plato";
        // Limpiar campos de marketing
        document.getElementById('checkMenuDelDia').checked = false;
        document.getElementById('checkEspecialidad').checked = false;
        document.getElementById('checkEnPromocion').checked = false;
        const inputPorcentaje = document.getElementById('porcentajeDescuento');
        if (inputPorcentaje) inputPorcentaje.value = '';
        const promoContainerEl = document.getElementById('promoContainer');
        if (promoContainerEl) promoContainerEl.style.display = 'none';
        const precioFinalCalcEl = document.getElementById('precioFinalCalc');
        if (precioFinalCalcEl) precioFinalCalcEl.textContent = 'Precio final calculado: $0';
        modalOverlay.hidden = false;
        limpiarCamposFoto();
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
            
            if (modalPadre.id === 'modalGestionarToppings') {
                resetearModalGestionarToppings();
            }
            
        }
        
    });
    
});
    
});



// ================= BTN CERRAR SESIÓN =================
/**
 * proppósito: enciar al usuario a la página del login, eliminar el token de localstorage
 */



// ============================================================
// SUBIR FOTO DE PLATO (selector de archivo)
// ============================================================
const inputFotoPlato       = document.getElementById('inputFotoPlato');
const previewFotoPlato     = document.getElementById('previewFotoPlato');
const fotoUploadTexto      = document.getElementById('fotoUploadTexto');
const labelAplicarCategoria = document.getElementById('labelAplicarCategoria');
const checkAplicarCategoria = document.getElementById('checkAplicarCategoria');

/** Sube el archivo al backend y devuelve la URL. También actualiza UI. */
async function subirFotoSeleccionada() {
    const archivo = inputFotoPlato.files[0];
    if (!archivo) return null;

    // Actualizamos el texto del área mientras sube
    fotoUploadTexto.textContent = 'Subiendo...';

    const formData = new FormData();
    formData.append('foto', archivo);

    const token = localStorage.getItem('token');
    const res = await fetch('/api/platos/subir-foto', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });

    if (!res.ok) {
        fotoUploadTexto.textContent = 'Error al subir. Intentá de nuevo.';
        return null;
    }

    const data = await res.json();

    // Guardamos la URL en el hidden
    document.getElementById('fotoUrlPlato').value = data.url;

    // Mostramos nombre del archivo en el área
    fotoUploadTexto.textContent = archivo.name;

    // Mostramos la vista previa
    previewFotoPlato.innerHTML = `<img src="${data.url}" alt="Vista previa" />`;

    // Mostramos el checkbox de "aplicar a categoría"
    labelAplicarCategoria.style.display = 'flex';

    return data.url;
}

/** Limpia todos los campos de foto del modal */
function limpiarCamposFoto() {
    inputFotoPlato.value         = '';
    document.getElementById('fotoUrlPlato').value = '';
    previewFotoPlato.innerHTML   = '';
    fotoUploadTexto.textContent  = 'Elegir imagen del ordenador';
    labelAplicarCategoria.style.display = 'none';
    checkAplicarCategoria.checked = false;
}

/** Aplica la foto a todos los platos de la categoría sin foto */
async function aplicarFotoACategoria(fotoUrl) {
    const categoria = document.querySelector('input[name="categoria"]').value;
    if (!categoria || !fotoUrl) return;

    const token = localStorage.getItem('token');
    const res = await fetch('/api/platos/aplicar-foto-categoria', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fotoUrl, categoria })
    });

    if (res.ok) {
        const data = await res.json();
        if (data.actualizados > 0) {
            alert(`¡Foto aplicada a ${data.actualizados} plato(s) más de "${categoria}" que no tenían foto!`);
        }
    }
}

// Cuando el usuario elige un archivo → subir automáticamente
inputFotoPlato.addEventListener('change', async () => {
    const url = await subirFotoSeleccionada();
    if (!url) {
        fotoUploadTexto.textContent = 'Elegir imagen del ordenador';
    }
});

// ============= BOTÓN GUARDAR PLATO ===============
const btnGuardar = document.getElementById("btnGuardarPlato");
const listaPlatos = document.getElementById("lista-platos");

/**
 * PROPÓSITO: Al hacer clic en guardar plato, este se guarda en la BD
 * y además se mostrará en pantalla la lista de los platos del dashboard
 */

btnGuardar.addEventListener('click', async (e) => {
    e.preventDefault(); // frenar recarga de la página

    const formPlato = document.getElementById("formCrearPlato");
    const datosForm = new FormData(formPlato);
    
    // Capturamos la URL que generó la subida (si es que hubo) o la vieja
    const urlFotoSubida = document.getElementById('fotoUrlPlato').value;
    
    // Obtenemos la foto que ya tenía el plato antes de ser editado 
    // Ojo: Asegurate de que tu input hidden para recuperar fotos viejas se llame 'foto' 
    // en tu HTML (o cambialo por el nombre que estés usando)
    const fotoExistente = datosForm.get('foto'); 

    // El flujo correcto:
    const descripcion = datosForm.get('descripción') || datosForm.get('descripcion') || '';
    const enPromocion = document.getElementById('checkEnPromocion').checked;
    const porcentajeDescuento = enPromocion
        ? (parseFloat(document.getElementById('porcentajeDescuento').value) || 0)
        : 0;

    const datosPlato = {
        nombre: datosForm.get('nombre'),
        precio: Number(datosForm.get('precio')),
        categoria: datosForm.get('categoria'),
        descripcion: descripcion,
        esMenuDelDia: document.getElementById('checkMenuDelDia').checked,
        esEspecialidad: document.getElementById('checkEspecialidad').checked,
        enPromocion: enPromocion,
        porcentajeDescuento: porcentajeDescuento,
        // Si hay una foto subida recientemente, usamos esa.
        // Si no, usamos la foto que ya existía (si estaba editando un plato).
        fotoUrl: urlFotoSubida || fotoExistente || "",
        id: datosForm.get('id')
    };

    const idOculto = datosPlato.id;

     // Si el checkbox está tildado, aplicamos la foto a toda la categoría
    if (checkAplicarCategoria.checked && datosPlato.fotoUrl) {
        await aplicarFotoACategoria(datosPlato.fotoUrl);
    }

    if (idOculto === "") {
        await crearPlato(datosPlato, formPlato);
    } else {
        await editarPlato(idOculto, datosPlato, formPlato);
    }

    
    cargarHTMLListaDePlatos(datosPlato);
    terminarYRedibujar(formPlato);
});

// ==========================================
// LÓGICA DE PROMOCIONES (porcentaje)
// ==========================================
const checkEnPromo = document.getElementById('checkEnPromocion');
const promoContainerDiv = document.getElementById('promoContainer');
const inputPorcentajePromo = document.getElementById('porcentajeDescuento');
const inputPrecioPlato = document.querySelector('input[name="precio"]');
const precioFinalCalcSpan = document.getElementById('precioFinalCalc');

if (checkEnPromo && promoContainerDiv && inputPorcentajePromo && inputPrecioPlato && precioFinalCalcSpan) {
    function actualizarPromoUI() {
        const enPromo = checkEnPromo.checked;
        promoContainerDiv.style.display = enPromo ? 'block' : 'none';
        const precio = parseFloat(inputPrecioPlato.value);
        const porciento = parseFloat(inputPorcentajePromo.value);
        if (!isNaN(precio)) {
            let mostrar = precio;
            if (enPromo && !isNaN(porciento) && porciento > 0) {
                mostrar = precio - (precio * (porciento / 100));
            }
            precioFinalCalcSpan.textContent = 'Precio final calculado: $' + mostrar.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            precioFinalCalcSpan.textContent = 'Precio final calculado: $0,00';
        }
    }
    checkEnPromo.addEventListener('change', actualizarPromoUI);
    inputPrecioPlato.addEventListener('input', actualizarPromoUI);
    inputPorcentajePromo.addEventListener('input', actualizarPromoUI);
    actualizarPromoUI();
}



//================== BOTÓN EDITAR ===============================
/** 
 * Propósito: Abrir el modal y colocar en cada input el valor correspondiente según el plato seleccionado.
 * 
 */

// 1. Capturamos la tabla entera (el contenedor)
const tbodyPlatos = document.getElementById("lista-platos");

// 2. evento
tbodyPlatos.addEventListener('click', async (e) => {
    
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
        const fotoPlato = btnEditar.getAttribute('data-foto') || '';

        // 5. Autocompletamos los inputs del modal con esos datos
        document.querySelector('input[name="id"]').value = idPlato;        
        document.querySelector('input[name="nombre"]').value = nombrePlato;
        document.querySelector('input[name="precio"]').value = precioPlato;
        document.querySelector('input[name="categoria"]').value = catPlato;
        document.querySelector('input[name="foto"]').value = fotoPlato;

        // Mostramos la vista previa si el plato ya tiene foto
        const preview = document.getElementById('previewFotoPlato');
        if (fotoPlato) {
            preview.innerHTML = `<img src="${fotoPlato}" alt="Vista previa" />`;
        } else {
            preview.innerHTML = '';
        }
        //limpiarCamposFoto(); // limpiamos selector, preview y checkbox

        // ---- Destacar Marketing ----
        const menuDelDia = btnEditar.getAttribute('data-menu-del-dia') === 'true';
        const especialidad = btnEditar.getAttribute('data-especialidad') === 'true';
        const enPromocion = btnEditar.getAttribute('data-en-promocion') === 'true';
        const porcentaje = btnEditar.getAttribute('data-porcentaje-descuento') || '';

        document.getElementById('checkMenuDelDia').checked = menuDelDia;
        document.getElementById('checkEspecialidad').checked = especialidad;
        document.getElementById('checkEnPromocion').checked = enPromocion;
        const inputPorcentaje = document.getElementById('porcentajeDescuento');
        if (inputPorcentaje) inputPorcentaje.value = porcentaje;

        const promoContainerEl = document.getElementById('promoContainer');
        if (promoContainerEl) promoContainerEl.style.display = enPromocion ? 'block' : 'none';

        const precioFinalCalcEl = document.getElementById('precioFinalCalc');
        const precioNum = parseFloat(precioPlato);
        const porcNum = parseFloat(porcentaje);
        if (precioFinalCalcEl) {
            if (!isNaN(precioNum)) {
                let mostrar = precioNum;
                if (enPromocion && !isNaN(porcNum) && porcNum > 0) {
                    mostrar = precioNum - (precioNum * (porcNum / 100));
                }
                precioFinalCalcEl.textContent = 'Precio final calculado: $' + mostrar.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                precioFinalCalcEl.textContent = 'Precio final calculado: $0,00';
            }
        }

        // 6. Abrimos el modal
        modalOverlay.hidden = false;
        
        // Cambiamos el título y el texto del botón
        document.getElementById("tituloModal").innerText = "Editar Plato";
        document.getElementById("btnGuardarPlato").innerText = "Guardar Cambios";
    }

    // ==========================================
    // LÓGICA DE BORRAR 
    // ==========================================
    const botonBorrar = e.target.closest('.btn-borrar');
    if (botonBorrar) {
        const idPlato = botonBorrar.getAttribute('data-id');
        const nombrePlato = botonBorrar.getAttribute('data-nombre');

        const confirmacion = confirm(`¿Estás 100% seguro de que querés borrar el plato "${nombrePlato}"?\nEsta acción no se puede deshacer.`);

        if (confirmacion) {
           await borrarPlato(idPlato);
        }
    }


    // ==========================================
    // LÓGICA DE OCULTAR 
    // ==========================================
    const botonOcultar = e.target.closest(".btn-ocultar");
    if(botonOcultar){
        const idPlato = botonOcultar.getAttribute('data-id');
        const confirmacion = await ocultarPlato(idPlato);
        if(confirmacion){

            cargarListaDePlatos();
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
        // 3. UN SOLO VIAJE: Mandamos las fotos. El backend habla con la IA y guarda en MongoDB.
        const token = localStorage.getItem('token'); // Buscamos la pulserita VIP
        
        const respuestaIA = await fetch('/api/platos/procesar-ia', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}` // Se lo pasamos al patovica del backend
                // Nota: NO se pone 'Content-Type': 'application/json' cuando mandamos FormData
            },
            body: formData 
        });

        if (!respuestaIA.ok) {
            throw new Error("Error al procesar las fotos con la IA.");
        }

        // Si llegó hasta acá, es porque el backend hizo todo perfecto
        alert("¡Platos procesados y guardados con éxito!");
        
        // Refrescamos la pantalla para que el Dashboard dibuje los platos nuevos
        location.reload();

    } catch (error) {
        console.error("Error en el proceso:", error);
        alert("Hubo un problema: " + error.message);
    } finally {
        // 4. Devolvemos el botón a la normalidad
        btnProcesarIADef.textContent = textoOriginalBoton;
        btnProcesarIADef.disabled = false;
        modalIA.hidden = true;
    }
});


const switchAbierto = document.getElementById('toggleEstado'); 
// ==========================================
// ACTUALIZAR LA BASE DE DATOS AL TOCAR EL SWITCH
// ==========================================
switchAbierto.addEventListener('change', async (e) => {
    // 1. Vemos si el dueño lo dejó prendido (true) o apagado (false)
    const abierto = e.target.checked; 


    try {
        // 3. ¡El disparo a MongoDB! Usamos la ruta inteligente que creaste
        const respuesta = await peticionAPI('/api/usuarios/modificarDatos', 'PATCH', {
            abierto: abierto
        });

        if (!respuesta.ok) {
            throw new Error("El servidor rechazó el cambio");
        }

        const datosDelBackend = await respuesta.json(); 

        localStorage.setItem('user', JSON.stringify(datosDelBackend.usuario));
        
        // Si todo salió bien, no hacemos nada más, ya está guardado y la luz está prendida/apagada.

    } catch (error) {
        console.error("Error al actualizar la BD:", error);
        
        // 4. Mecanismo de defensa: Si se cortó internet o falló el backend, revertimos el botón
        switchAbierto.checked = !nuevoEstado; 
        alert("Hubo un error de conexión y no se pudo cambiar el estado.");
    }
});


// ============================================================
// MODAL TOPPINGS
// ============================================================

// ── 1. ABRIR / CERRAR con Event Delegation ──────────────────
// Interceptamos clics en todo el documento para no depender
// de que el botón exista al cargar el script.
document.addEventListener('click', (e) => {

    // ABRIR: el botón "Toppings por Categoría" arriba de la tabla
    if (e.target.closest('#btnAbrirModalToppings')) {
        document.getElementById('modalToppings').removeAttribute('hidden');
        // Generamos los checkboxes CADA VEZ que se abre
        // para reflejar si se agregaron platos nuevos desde que cargó la página.
        
        return;
    }

    // CERRAR: botón ✖ del modal
    if (e.target.closest('#btnCerrarModalToppings')) {
        document.getElementById('modalToppings').setAttribute('hidden', '');
        return;
    }

    // CERRAR: clic en el fondo oscuro (overlay), no en el contenido
    if (e.target.id === 'modalToppings') {
        e.target.setAttribute('hidden', '');
        return;
    }

    // ELIMINAR FILA: usamos delegation para capturar el clic en cualquier
    // botón .btn-eliminar-fila, tanto en la fila inicial como en las dinámicas.
    if (e.target.closest('.btn-eliminar-fila')) {
        const fila = e.target.closest('.fila-opcion');
        // Solo borramos si hay más de una fila (no dejamos el contenedor vacío)
        const totalFilas = document.querySelectorAll('#contenedorOpcionesTopping .fila-opcion').length;
        if (totalFilas > 1) {
            fila.remove();
        }
    }
});


// ── 2. GENERAR CHECKBOXES DE CATEGORÍAS ─────────────────────
/**
 * Lee `listaPlatosGlobal` (array global cargado en cargarListaDePlatos),
 * extrae las categorías únicas y genera un checkbox por cada una
 * dentro del contenedor #contenedorCategoriasTopping.
 */
// ── 2. GENERAR CHECKBOXES DE CATEGORÍAS ─────────────────────
/**
 * Lee `listaPlatosGlobal`, extrae las categorías únicas y genera 
 * un checkbox por cada una para AMBOS modales (Crear y Editar).
 */
function generarCheckboxesCategorias() {
    // Apuntamos a los dos contenedores
    const contenedorCrear = document.getElementById('contenedorCategoriasTopping');
    const contenedorEditar = document.getElementById('contenedorEditarCategoriasTopping'); 

    // Limpiamos ambos
    contenedorCrear.innerHTML = ''; 
    contenedorEditar.innerHTML = ''; 

    const categoriasUnicas = [...new Set(listaPlatosGlobal.map(p => p.categoria).filter(Boolean))];

    if (categoriasUnicas.length === 0) {
        const msj = '<p class="topping-hint">No hay categorías todavía. Cargá platos primero.</p>';
        contenedorCrear.innerHTML = msj;
        contenedorEditar.innerHTML = msj;
        return;
    }

    categoriasUnicas.forEach(cat => {
        // Armamos el label y el checkbox original
        const label = document.createElement('label');
        label.className = 'topping-checkbox-label';

        const checkbox = document.createElement('input');
        checkbox.type  = 'checkbox';
        checkbox.value = cat;
        checkbox.name  = 'categoriaDestino';

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(cat));
        
        // 1. Lo metemos en el modal de CREAR
        contenedorCrear.appendChild(label);
        
        // 2. Le sacamos una "fotocopia" y lo metemos en el modal de EDITAR
        const labelClonado = label.cloneNode(true);
        contenedorEditar.appendChild(labelClonado);
    });
}


// ── 3. AGREGAR FILA DINÁMICA ─────────────────────────────────
/**
 * Cada clic en "+ Sumar otra opción" crea una nueva fila con
 * input de nombre, input de precio y botón de eliminar.
 * El botón de eliminar se maneja con delegation (ver punto 1).
 */
document.getElementById('btnAgregarFilaTopping').addEventListener('click', () => {
    const contenedor = document.getElementById('contenedorOpcionesTopping');

    const nuevaFila = document.createElement('div');
    nuevaFila.className = 'fila-opcion';
    nuevaFila.innerHTML = `
        <input type="text"   class="topping-nombre" placeholder="Ej: Panceta" />
        <input type="number" class="topping-precio" placeholder="Precio (0 = gratis)" min="0" />
        <button type="button" class="btn-eliminar-fila" title="Eliminar fila">🗑️</button>
    `;

    contenedor.appendChild(nuevaFila);
    // Foco automático en el input de nombre de la nueva fila
    nuevaFila.querySelector('.topping-nombre').focus();
});


// 4)
//-----------------------------------------------------------------------------------
//===================== LÓGICA DE GUARDAR TOPPINGS ==================================
//------------------------------------------------------------------------------------

const formCrearToppings = document.getElementById('formCrearToppings');
formCrearToppings.addEventListener('submit', async (e)=>{
    e.preventDefault();
    
    //a) nombre del grupo
    let nombreGrupoTopping = selectNombreGrupo.value;

    if (nombreGrupoTopping === 'CREAR_NUEVO') {
        // Si quiso crear uno nuevo, pisamos la variable con lo que escribió en el input
        nombreGrupoTopping = inputNuevoGrupoTopping.value.trim();
    }

    // Pequeña seguridad por si algo falla
    if (!nombreGrupoTopping) {
        alert("Por favor, ingresá o seleccioná un nombre para el grupo.");
        return; 
    }
    // b) Categorías destino: filtramos solo los checkboxes tildados
    const chekedForms = document.querySelectorAll('#contenedorCategoriasTopping input[type=checkbox]:checked');
    
    // c) Metemos los valores de cada checkbox en un array
    const listaCategorias = [];
    chekedForms.forEach(cheked => {listaCategorias.push(cheked.value)});

    //d) Opciones del grupo: recorremos las filas y descartamos las vacías
    const filas = document.querySelectorAll('#contenedorOpcionesTopping .fila-opcion');
    const opciones = Array.from(filas).map(fila =>({
        nombre: fila.querySelector('.topping-nombre').value,
        precio: Number(fila.querySelector('.topping-precio').value) || 0

    })).filter(opcion => opcion.nombre !== "");

    //e) Construir el body que vamos a mandar en la petición

    let body = {
    nombre: nombreGrupoTopping,      // Matchea con 'nombre' del Schema
    categoriaDestino: listaCategorias, // Matchea con 'categoriaDestino' del Schema
    opciones: opciones                 // Matchea con 'opciones' del Schema
    };

    //f) hacer la petición
    const respuesta = await peticionAPI('/api/toppings/crearToppings', 'POST', body)
    
    
    // Resetear formulario y cerrar modal
    document.getElementById('formCrearToppings').reset();
    // En vez de borrar el HTML, simplemente destildamos todos los checkboxes
    const checkboxes = document.querySelectorAll('#contenedorCategoriasTopping input[type="checkbox"]');
    checkboxes.forEach(chk => {
        chk.checked = false;
    });
    document.getElementById('contenedorOpcionesTopping').innerHTML = `
        <div class="fila-opcion">
            <input type="text"   class="topping-nombre" placeholder="Ej: Cheddar" />
            <input type="number" class="topping-precio" placeholder="Precio (0 = gratis)" min="0" />
            <button type="button" class="btn-eliminar-fila" title="Eliminar fila">🗑️</button>
        </div>
    `;
    document.getElementById('modalToppings').setAttribute('hidden', '');

    cargarGruposEnSelect();
    

    console.log("lo que salió es", body);


   
    
});

//===========================================
// Acá cambiamos el select del toping por el input para crear uno nuevo
//=========================================
// 1. Capturamos el select y el input oculto
const selectNombreGrupo = document.getElementById('selectNombreGrupo');
const inputNuevoGrupoTopping = document.getElementById('inputNuevoGrupoTopping');

// 2. Escuchamos cada vez que cambia el valor del select
selectNombreGrupo.addEventListener('change', (e) => {
    if (e.target.value === 'CREAR_NUEVO') {
        // Si elige crear nuevo: mostramos el input, lo hacemos obligatorio y le damos el foco
        inputNuevoGrupoTopping.style.display = 'block';
        inputNuevoGrupoTopping.required = true;
        inputNuevoGrupoTopping.focus(); // 👈 Esto pone el cursor titilando ahí automáticamente
    } else {
        // Si elige otra cosa: escondemos el input, le sacamos lo obligatorio y lo limpiamos
        inputNuevoGrupoTopping.style.display = 'none';
        inputNuevoGrupoTopping.required = false;
        inputNuevoGrupoTopping.value = ''; 
    }
});


// ==========================================
// LÓGICA DEL MODAL GESTIONAR TOPPINGS
// ==========================================

const btnGestionarToppings = document.getElementById('btnGestionarToppings');
const modalGestionarToppings = document.getElementById('modalGestionarToppings');

btnGestionarToppings.addEventListener('click', async (e)=>{
    e.preventDefault();
    // Reset del modal para que no queden datos de una sesión anterior
    resetearModalGestionarToppings();
    cargarGruposParaGestionar();
    modalGestionarToppings.removeAttribute('hidden');
});

// Al hacer clic en el fondo oscuro también se cierra y resetea
modalGestionarToppings.addEventListener('click', (e) => {
    if (e.target === modalGestionarToppings) {
        modalGestionarToppings.setAttribute('hidden', '');
        resetearModalGestionarToppings();
    }
});

// Variable global para guardar los toppings y no tener que pedirselos al backend a cada rato
let listaGruposToppings = [];

// 1. LÓGICA DE LAS PESTAÑAS (TABS)
const tabPorTopping = document.getElementById('tabPorTopping');
const tabPorCategoria = document.getElementById('tabPorCategoria');
const vistaPorTopping = document.getElementById('vistaPorTopping');
const vistaPorCategoria = document.getElementById('vistaPorCategoria');

tabPorTopping.addEventListener('click', () => {
    // Estilos visuales
    tabPorTopping.classList.add('activo');
    tabPorTopping.style.opacity = '1';
    tabPorCategoria.classList.remove('activo');
    tabPorCategoria.style.opacity = '0.6';
    // Mostrar/Ocultar
    vistaPorTopping.style.display = 'block';
    vistaPorCategoria.style.display = 'none';
});

tabPorCategoria.addEventListener('click', () => {
    // Estilos visuales
    tabPorCategoria.classList.add('activo');
    tabPorCategoria.style.opacity = '1';
    tabPorTopping.classList.remove('activo');
    tabPorTopping.style.opacity = '0.6';
    // Mostrar/Ocultar
    vistaPorCategoria.style.display = 'block';
    vistaPorTopping.style.display = 'none';
    
    // Al abrir esta pestaña, llenamos el select de categorías
    cargarSelectCategoriasFiltro();
});


// 2. CARGAR LOS DATOS EN EL SELECT DE "EDITAR"
async function cargarGruposParaGestionar() {
    const respuesta = await peticionAPI('/api/toppings/misToppings', 'GET');
    if (!respuesta) return;

    listaGruposToppings = await respuesta.json(); // Guardamos en la variable global
    const select = document.getElementById('selectEditarGrupo');
    
    select.innerHTML = '<option value="" disabled selected>Elegí un grupo...</option>';

    listaGruposToppings.forEach(grupo => {
        const opcion = document.createElement('option');
        opcion.value = grupo.nombre;
        opcion.textContent = grupo.nombre;
        select.appendChild(opcion);
    });
}

/**
 * RESETEA COMPLETAMENTE EL MODAL GESTIONAR TOPPINGS
 * para que no queden datos de una sesión anterior.
 */
function resetearModalGestionarToppings() {
    // Selector de grupo
    const selectEditar = document.getElementById('selectEditarGrupo');
    if (selectEditar) selectEditar.value = '';

    // Checkboxes de categorías
    document.querySelectorAll('#contenedorEditarCategoriasTopping input[type="checkbox"]')
        .forEach(chk => chk.checked = false);

    // Opciones (filas)
    const contenedorOpciones = document.getElementById('contenedorEditarOpcionesTopping');
    if (contenedorOpciones) contenedorOpciones.innerHTML = '';

    // Resultados de la pestaña "Por Categoría"
    const contenedorResultados = document.getElementById('contenedorResultadosCategoria');
    if (contenedorResultados) {
        contenedorResultados.innerHTML = '<p class="topping-hint" style="text-align: center;">Seleccioná una categoría para ver qué toppings tiene asociados.</p>';
    }
    const selectCategoria = document.getElementById('selectFiltroCategoria');
    if (selectCategoria) selectCategoria.value = '';

    // Reset de las pestañas a "Por Topping"
    const tabTopping = document.getElementById('tabPorTopping');
    const tabCategoria = document.getElementById('tabPorCategoria');
    const vistaTopping = document.getElementById('vistaPorTopping');
    const vistaCategoria = document.getElementById('vistaPorCategoria');
    if (tabTopping) {
        tabTopping.classList.add('activo');
        tabTopping.style.opacity = '1';
    }
    if (tabCategoria) {
        tabCategoria.classList.remove('activo');
        tabCategoria.style.opacity = '0.6';
    }
    if (vistaTopping) vistaTopping.style.display = 'block';
    if (vistaCategoria) vistaCategoria.style.display = 'none';
}

// 3. CUANDO EL USUARIO ELIGE UN GRUPO PARA EDITAR
const selectEditarGrupo = document.getElementById('selectEditarGrupo');
selectEditarGrupo.addEventListener('change', (e) => {
    const nombreElegido = e.target.value;
    // Buscamos el grupo en nuestra lista global
    const grupo = listaGruposToppings.find(g => g.nombre === nombreElegido);
    
    if (!grupo) return;

    // A) Llenar los checkboxes de categorías
    // Traemos el contenedor (que ahora ya tiene los checkboxes clonados desde el principio)
    const contenedorCheckboxesEditar = document.getElementById('contenedorEditarCategoriasTopping');
    
    // Ahora tildamos solo los que este grupo ya tiene asignados
    const checkboxes = contenedorCheckboxesEditar.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(chk => {
        if (grupo.categoriaDestino.includes(chk.value)) {
            chk.checked = true;
        } else {
            chk.checked = false;
        }
    });

    // B) Llenar las opciones (Cheddar $500, Bacon $600, etc)
    const contenedorOpciones = document.getElementById('contenedorEditarOpcionesTopping');
    contenedorOpciones.innerHTML = ''; // Limpiamos

    grupo.opciones.forEach(opcion => {
        const disponible = opcion.disponible !== false;
        contenedorOpciones.insertAdjacentHTML('beforeend', `
            <div class="fila-opcion ${disponible ? '' : 'inactiva'}">
                <input type="text" class="topping-nombre" value="${opcion.nombre}" required />
                <input type="number" class="topping-precio" value="${opcion.precio}" min="0" required />
                <button type="button" class="btn-toggle-disponibilidad-topping" data-id-grupo="${grupo._id}" data-id-opcion="${opcion._id}" data-disponible="${disponible}" title="${disponible ? 'Ocultar opción' : 'Mostrar opción'}">
                    ${disponible ? '👁️' : '🙈'}
                </button>
                <button type="button" class="btn-eliminar-fila" title="Eliminar fila">🗑️</button>
            </div>
        `);
    });
});

// 4. AGREGAR / ELIMINAR FILAS EN LA VISTA EDITAR
document.getElementById('btnAgregarFilaEditarTopping').addEventListener('click', () => {
    document.getElementById('contenedorEditarOpcionesTopping').insertAdjacentHTML('beforeend', `
        <div class="fila-opcion">
            <input type="text" class="topping-nombre" placeholder="Ej: Nueva opción" required />
            <input type="number" class="topping-precio" placeholder="Precio (0 = gratis)" min="0" required />
            <button type="button" class="btn-eliminar-fila" title="Eliminar fila">🗑️</button>
        </div>
    `);
});

// Delegación de eventos para los botones de eliminar fila y cambiar disponibilidad en el modal de edición
document.getElementById('contenedorEditarOpcionesTopping').addEventListener('click', async (e) => {
    const btnEliminar = e.target.closest('.btn-eliminar-fila');
    if (btnEliminar) {
        e.target.closest('.fila-opcion').remove();
        return;
    }

    const btnToggle = e.target.closest('.btn-toggle-disponibilidad-topping');
    if (btnToggle) {
        const idGrupo = btnToggle.getAttribute('data-id-grupo');
        const idOpcion = btnToggle.getAttribute('data-id-opcion');

        const respuesta = await peticionAPI(`/api/toppings/${idGrupo}/opcion/${idOpcion}`, 'PATCH');
        if (respuesta && respuesta.ok) {
            const data = await respuesta.json();
            btnToggle.setAttribute('data-disponible', data.disponible);
            btnToggle.textContent = data.disponible ? '👁️' : '🙈';
            btnToggle.title = data.disponible ? 'Ocultar opción' : 'Mostrar opción';
            const fila = btnToggle.closest('.fila-opcion');
            fila.classList.toggle('inactiva', data.disponible === false);
        } else {
            alert('No se pudo cambiar la disponibilidad de la opción.');
        }
    }
});


// 5. LÓGICA DE LA PESTAÑA "POR CATEGORÍA"
function cargarSelectCategoriasFiltro() {
    const select = document.getElementById('selectFiltroCategoria');
    // Tomamos todos los checkboxes que ya tenés renderizados en tu sistema para armar las opciones
    const checkboxes = document.querySelectorAll('#contenedorCategoriasTopping input[type="checkbox"]');
    
    select.innerHTML = '<option value="" disabled selected>Elegí una categoría...</option>';
    
    checkboxes.forEach(chk => {
        select.insertAdjacentHTML('beforeend', `<option value="${chk.value}">${chk.value}</option>`);
    });
}

document.getElementById('selectFiltroCategoria').addEventListener('change', (e) => {
    const categoriaElegida = e.target.value;
    const contenedorResultados = document.getElementById('contenedorResultadosCategoria');
    
    // Filtramos los grupos que incluyan esta categoría en su array
    const gruposAsociados = listaGruposToppings.filter(g => g.categoriaDestino.includes(categoriaElegida));
    
    if (gruposAsociados.length === 0) {
        contenedorResultados.innerHTML = `<p style="color: #666; text-align:center;">No hay toppings asignados a la categoría <b>${categoriaElegida}</b>.</p>`;
        return;
    }

    // Dibujamos el resultado
    let htmlResultados = `<h4 style="margin-bottom: 10px;">Toppings para ${categoriaElegida}:</h4><ul>`;
    gruposAsociados.forEach(grupo => {
        const nombresOpciones = grupo.opciones.map(op => op.nombre).join(', ');
        htmlResultados += `<li style="margin-bottom: 8px;">
            <b>${grupo.nombre}:</b> <span style="font-size: 0.9em; color: #555;">(${nombresOpciones})</span>
        </li>`;
    });
    htmlResultados += `</ul>`;
    
    contenedorResultados.innerHTML = htmlResultados;
});
// ==========================================
// ACCIONES: GUARDAR CAMBIOS Y ELIMINAR
// ==========================================

const formEditarToppings = document.getElementById('formEditarToppings');
const btnEliminarGrupoTopping = document.getElementById('btnEliminarGrupoTopping');

// 1. GUARDAR CAMBIOS (PUT)
formEditarToppings.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitamos que la página se recargue

    // a) Saber qué grupo estamos editando
    const nombreOriginal = document.getElementById('selectEditarGrupo').value;
    
    if (!nombreOriginal) {
        alert("Por favor, seleccioná un grupo para editar.");
        return;
    }

    // b) Recolectar las categorías tildadas
    const categoriasSeleccionadas = [];
    const checkboxes = document.querySelectorAll('#contenedorEditarCategoriasTopping input[type="checkbox"]:checked');
    checkboxes.forEach(chk => categoriasSeleccionadas.push(chk.value));

    // c) Recolectar las opciones y precios
    const opciones = [];
    const filas = document.querySelectorAll('#contenedorEditarOpcionesTopping .fila-opcion');
    
    let hayError = false;
    filas.forEach(fila => {
        const nombreOpcion = fila.querySelector('.topping-nombre').value.trim();
        const precioOpcion = parseFloat(fila.querySelector('.topping-precio').value);

        // Validamos que haya puesto nombre y un precio válido
        if (nombreOpcion && !isNaN(precioOpcion)) {
            opciones.push({ nombre: nombreOpcion, precio: precioOpcion });
        } else {
            hayError = true;
        }
    });

    if (hayError || opciones.length === 0) {
        alert("Asegurate de completar bien todas las opciones (nombre y precio).");
        return;
    }

    // d) Armar el paquete y enviarlo al Backend
    const body = {
        nombreOriginal: nombreOriginal,
        categoriaDestino: categoriasSeleccionadas,
        opciones: opciones
    };

    // Ojo: Asegurate de que la URL (/api/platos/editarToppings) coincida con donde creaste la ruta en el backend
    const respuesta = await peticionAPI('/api/toppings/editarToppings', 'PUT', body);

    if (respuesta) {
        // e) Si salió bien, actualizamos las cosas visuales
        cargarGruposParaGestionar(); // Refresca el select de este modal
        cargarGruposEnSelect();      // Refresca el select del modal de "Crear Topping" para que no quede desactualizado
        document.getElementById('modalGestionarToppings').setAttribute('hidden', '');
    }
});


// 2. ELIMINAR GRUPO (DELETE)
btnEliminarGrupoTopping.addEventListener('click', async () => {
    const nombreOriginal = document.getElementById('selectEditarGrupo').value;
    
    if (!nombreOriginal) {
        alert("Por favor, seleccioná un grupo primero.");
        return;
    }

    // Ventana de alerta nativa del navegador para evitar borrados accidentales
    const confirmacion = confirm(`¿Estás seguro de que querés eliminar el grupo "${nombreOriginal}" por completo?`);
    
    if (confirmacion) {
        // Enviamos el nombre por la URL como parámetro
        const respuesta = await peticionAPI(`/api/toppings/eliminarToppings/${nombreOriginal}`, 'DELETE');

        if (respuesta) {
            // Actualizamos visualmente
            cargarGruposParaGestionar(); 
            cargarGruposEnSelect(); 
            
            // Limpiamos los inputs del modal para que no quede la información "fantasma"
            formEditarToppings.reset();
            document.getElementById('contenedorEditarOpcionesTopping').innerHTML = '';
            
            document.getElementById('modalGestionarToppings').setAttribute('hidden', '');
        }
    }
});


// ==========================================
// ⚙️ GESTIÓN POR CATEGORÍA (Pestaña 2)
// ==========================================

// Función que dibuja la lista adentro del contenedorResultadosCategoria
function renderizarToppingsPorCategoria(categoriaSeleccionada) {
    const contenedorListado = document.getElementById('contenedorResultadosCategoria'); 
    contenedorListado.innerHTML = ''; // Limpiamos el contenedor

    // Filtramos qué grupos tienen esta categoría asignada
    const gruposDeEstaCategoria = listaGruposToppings.filter(g => g.categoriaDestino.includes(categoriaSeleccionada));

    if (gruposDeEstaCategoria.length === 0) {
        contenedorListado.innerHTML = '<p class="topping-hint" style="text-align: center;">No hay toppings vinculados a esta categoría.</p>';
        return;
    }

    // Dibujamos el título (ej: "Toppings para Coffee:")
    const titulo = document.createElement('h4');
    titulo.textContent = `Toppings para ${categoriaSeleccionada}:`;
    titulo.style.marginBottom = '10px';
    contenedorListado.appendChild(titulo);

    // Dibujamos la lista de grupos con los tachitos
    const ul = document.createElement('ul');
    ul.style.listStyleType = 'none'; // Le saco los puntitos para que el tachito quede más limpio
    ul.style.paddingLeft = '0';
    ul.style.margin = '0';

    gruposDeEstaCategoria.forEach(grupo => {
        const li = document.createElement('li');
        li.style.marginBottom = '10px';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.borderBottom = '1px solid #ddd';
        li.style.paddingBottom = '5px';

        // Armamos el texto: "salsas: (Cheddar, Bacon)"
        const opcionesTxt = grupo.opciones.map(o => o.nombre).join(', ');
        const texto = document.createElement('span');
        texto.innerHTML = `<strong>${grupo.nombre}:</strong> <em>(${opcionesTxt})</em>`;

        // Botón de eliminar individual
        const btnQuitar = document.createElement('button');
        btnQuitar.type = 'button';
        btnQuitar.innerHTML = '🗑️';
        btnQuitar.title = 'Quitar de esta categoría';
        btnQuitar.style.background = 'transparent';
        btnQuitar.style.border = 'none';
        btnQuitar.style.cursor = 'pointer';
        btnQuitar.style.fontSize = '16px';
        
        btnQuitar.addEventListener('click', async () => {
            if (confirm(`¿Quitar el grupo "${grupo.nombre}" de la categoría ${categoriaSeleccionada}?`)) {
                const body = { nombreGrupo: grupo.nombre, nombreCategoria: categoriaSeleccionada };
                // Llamamos a la ruta de desvincular individual
                const res = await peticionAPI('/api/toppings/desvincularCategoriaDeTopping', 'PUT', body);
                if (res) {
                    await cargarGruposParaGestionar(); // Refresca el array global
                    renderizarToppingsPorCategoria(categoriaSeleccionada); // Vuelve a dibujar esta lista
                }
            }
        });

        li.appendChild(texto);
        li.appendChild(btnQuitar);
        ul.appendChild(li);
    });

    contenedorListado.appendChild(ul);

    // Dibujamos el botón gigante de Eliminar Todos abajo
    const btnQuitarTodos = document.createElement('button');
    btnQuitarTodos.type = 'button';
    btnQuitarTodos.innerHTML = '🗑️ Eliminar TODOS de esta categoría';
    btnQuitarTodos.style.marginTop = '15px';
    btnQuitarTodos.style.backgroundColor = '#ff4d4d';
    btnQuitarTodos.style.color = 'white';
    btnQuitarTodos.style.border = 'none';
    btnQuitarTodos.style.padding = '8px 12px';
    btnQuitarTodos.style.borderRadius = '5px';
    btnQuitarTodos.style.cursor = 'pointer';
    btnQuitarTodos.style.width = '100%'; // Ocupa todo el ancho

    btnQuitarTodos.addEventListener('click', async () => {
        if (confirm(`¿Estás SEGURO de quitar absolutamente TODOS los toppings de la categoría ${categoriaSeleccionada}?`)) {
            const body = { nombreCategoria: categoriaSeleccionada };
            // Llamamos a la ruta de desvincular TODOS
            const res = await peticionAPI('/api/toppings/desvincularTodosDeCategoria', 'PUT', body);
            if (res) {
                await cargarGruposParaGestionar(); // Refresca el array global
                renderizarToppingsPorCategoria(categoriaSeleccionada); // Vuelve a dibujar (debería decir "No hay toppings")
            }
        }
    });

    contenedorListado.appendChild(btnQuitarTodos);
}

// Escuchador para cuando el usuario selecciona una categoría en el <select>
const selectFiltroCategoria = document.getElementById('selectFiltroCategoria'); 
if (selectFiltroCategoria) {
    selectFiltroCategoria.addEventListener('change', (e) => {
        renderizarToppingsPorCategoria(e.target.value);
    });
}
