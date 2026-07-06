// ============================================================
// ESTADO GLOBAL DE LA APLICACION
// Todos los datos que cambian en tiempo real viven acá.
// ============================================================

/**
 * El carrito es un objeto donde cada key es el nombre del plato
 * y el valor tiene el detalle. Usamos objeto en vez de array
 * para poder buscar y actualizar items en O(1) por nombre.
 *
 * Ejemplo:
 * {
 *   "Hamburguesa clásica": { plato, descripcion, precio, categoria, cantidad }
 * }
 */
let carrito = {};


// ============================================================
// INICIO: Cargar el menú al abrir la página
// ============================================================

/**
 * PROPOSITO:
 *   Pide el menú al backend (GET /menu), lo agrupa por categoría
 *   y renderiza cada sección dinámicamente en el HTML.
 *   Se ejecuta automáticamente cuando la página termina de cargar.
 */
async function cargarMenu() {
    const contenedor = document.getElementById('menu-contenedor');

    try {
        // Pedirle al backend el menú guardado
        const respuesta = await fetch('/menu');

        if (!respuesta.ok) {
            contenedor.innerHTML = '<p class="menu-error">Menú no disponible por el momento. Volvé a intentarlo más tarde.</p>';
            return;
        }

        const platos = await respuesta.json();

        if (platos.length === 0) {
            contenedor.innerHTML = '<p class="menu-error">El menú está vacío.</p>';
            return;
        }

        // Agrupar los platos por categoría
        // Reduce transforma el array en un objeto { "Hamburguesas": [...], "Pizzas": [...] }
        const porCategoria = platos.reduce((grupos, plato) => {
            const cat = plato.categoria || 'Varios';
            if (!grupos[cat]) grupos[cat] = [];
            grupos[cat].push(plato);
            return grupos;
        }, {});

        // Renderizar cada categoría como una sección
        contenedor.innerHTML = Object.entries(porCategoria)
            .map(([categoria, items]) => crearSeccionCategoria(categoria, items))
            .join('');

    } catch (error) {
        console.error('[ERROR] No se pudo cargar el menú:', error);
        contenedor.innerHTML = '<p class="menu-error">Error al conectar con el servidor.</p>';
    }
}


// ============================================================
// RENDERIZADO DEL MENU
// ============================================================

/**
 * PROPOSITO:
 *   Genera el HTML completo de una sección de categoría con sus productos.
 *
 * @param {string} categoria  - Nombre de la categoría (ej: "Hamburguesas")
 * @param {Array}  items      - Array de platos de esa categoría
 * @returns {string}          - HTML de la sección lista para insertar
 */
function crearSeccionCategoria(categoria, items) {
    const idCategoria = categoria.toLowerCase().replace(/\s+/g, '-');

    return `
        <section class="category-section" aria-labelledby="cat-${idCategoria}">
            <h2 class="category-title" id="cat-${idCategoria}">
                ${obtenerEmoji(categoria)} ${categoria}
            </h2>
            <div class="products-grid" role="list">
                ${items.map(plato => crearTarjetaPlato(plato)).join('')}
            </div>
        </section>
    `;
}

/**
 * PROPOSITO:
 *   Genera el HTML de la tarjeta individual de un plato.
 *
 * @param {Object} plato - { plato, descripcion, precio, categoria }
 * @returns {string}     - HTML de la tarjeta
 */
function crearTarjetaPlato(plato) {
    // Sanitizar el nombre para usarlo como atributo HTML sin romper las comillas
    const nombreSeguro = plato.plato.replace(/"/g, '&quot;');

    return `
        <article class="product-card" role="listitem">
            <div class="product-info">
                <h3 class="product-name">${plato.plato}</h3>
                ${plato.descripcion ? `<p class="product-desc">${plato.descripcion}</p>` : ''}
                <p class="product-price">$${Number(plato.precio).toLocaleString('es-AR')}</p>
            </div>
            <button
                class="btn-agregar"
                onclick="agregarAlCarrito('${nombreSeguro}')"
                aria-label="Agregar ${nombreSeguro} al carrito"
            >
                + Agregar
            </button>
        </article>
    `;
}

/**
 * PROPOSITO:
 *   Devuelve un emoji representativo según el nombre de la categoría.
 *   Si no matchea ninguna, devuelve un emoji genérico.
 *
 * @param {string} categoria
 * @returns {string} emoji
 */
function obtenerEmoji(categoria) {
    const cat = categoria.toLowerCase();
    if (cat.includes('hamburguesa') || cat.includes('burger')) return '🍔';
    if (cat.includes('pizza'))                                  return '🍕';
    if (cat.includes('bebida') || cat.includes('drink'))        return '🥤';
    if (cat.includes('postre') || cat.includes('dulce'))        return '🍰';
    if (cat.includes('empanada'))                               return '🥟';
    if (cat.includes('sandwich') || cat.includes('sándwich'))   return '🥪';
    if (cat.includes('ensalada'))                               return '🥗';
    if (cat.includes('pasta') || cat.includes('fideos'))        return '🍝';
    if (cat.includes('pollo') || cat.includes('chicken'))       return '🍗';
    return '🍽️';
}


// ============================================================
// LOGICA DEL CARRITO
// ============================================================

/**
 * PROPOSITO:
 *   Busca el plato en la lista del menú cargado y lo agrega al carrito.
 *   Si el plato ya estaba, incrementa la cantidad en 1.
 *
 * @param {string} nombrePlato - Nombre del plato a agregar
 */
async function agregarAlCarrito(nombrePlato) {

    // Buscar los datos completos del plato en el backend
    // (precio, descripcion, etc.) para no depender de lo que está en el DOM
    const respuesta = await fetch('/menu');
    const platos    = await respuesta.json();
    const plato     = platos.find(p => p.plato === nombrePlato);

    if (!plato) return;

    if (carrito[nombrePlato]) {
        // Si ya existe, solo sumamos 1 a la cantidad
        carrito[nombrePlato].cantidad += 1;
    } else {
        // Si es nuevo, lo agregamos con cantidad 1
        carrito[nombrePlato] = { ...plato, cantidad: 1 };
    }

    actualizarUI();
    mostrarToast(`${nombrePlato} agregado al carrito 🛒`);
}

/**
 * PROPOSITO:
 *   Disminuye la cantidad de un item en el carrito.
 *   Si la cantidad llega a 0, elimina el item del carrito.
 *
 * @param {string} nombrePlato
 */
function quitarDelCarrito(nombrePlato) {
    if (!carrito[nombrePlato]) return;

    carrito[nombrePlato].cantidad -= 1;

    if (carrito[nombrePlato].cantidad === 0) {
        delete carrito[nombrePlato];
    }

    actualizarUI();
}


// ============================================================
// ACTUALIZACION DE LA INTERFAZ
// ============================================================

/**
 * PROPOSITO:
 *   Sincroniza toda la interfaz con el estado actual del carrito.
 *   Se llama cada vez que el carrito cambia.
 */
function actualizarUI() {
    const items      = Object.values(carrito);
    const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0);
    const totalPrecio = items.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);

    // Actualizar el badge del botón flotante
    document.getElementById('fabBadge').textContent = totalItems;
    document.getElementById('fabTotal').textContent = '$' + totalPrecio.toLocaleString('es-AR');

    // Habilitar/deshabilitar el botón flotante según si hay items
    const fabBtn = document.getElementById('fabBtn');
    fabBtn.disabled = totalItems === 0;

    // Actualizar la lista dentro del modal
    actualizarListaModal(items, totalPrecio);
}

/**
 * PROPOSITO:
 *   Renderiza la lista de items dentro del modal del carrito.
 *
 * @param {Array}  items        - Array de items del carrito
 * @param {number} totalPrecio  - Precio total acumulado
 */
function actualizarListaModal(items, totalPrecio) {
    const lista    = document.getElementById('cartList');
    const msgVacio = document.getElementById('cartEmptyMsg');
    const btnWsp   = document.getElementById('btnWhatsapp');
    const total    = document.getElementById('summaryTotal');

    total.textContent   = '$' + totalPrecio.toLocaleString('es-AR');
    btnWsp.disabled     = items.length === 0;
    msgVacio.style.display = items.length === 0 ? 'block' : 'none';

    lista.innerHTML = items.map(item => `
        <li class="cart-item">
            <div class="cart-item-info">
                <span class="cart-item-name">${item.plato}</span>
                <span class="cart-item-price">$${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
            </div>
            <div class="cart-item-controls">
                <button onclick="quitarDelCarrito('${item.plato.replace(/'/g, "\\'")}')" aria-label="Quitar uno">−</button>
                <span>${item.cantidad}</span>
                <button onclick="agregarAlCarrito('${item.plato.replace(/'/g, "\\'")}')" aria-label="Agregar uno">+</button>
            </div>
        </li>
    `).join('');
}


// ============================================================
// WHATSAPP
// ============================================================

/**
 * PROPOSITO:
 *   Genera un mensaje de texto bien formateado con el pedido completo
 *   y abre WhatsApp con ese mensaje listo para enviar.
 *
 *   El número de WhatsApp del local se lee del .env a través de
 *   una ruta GET /config que expondremos en el backend (sin exponer la key).
 */
function enviarPorWhatsapp() {
    const items = Object.values(carrito);
    if (items.length === 0) return;

    // Armar el texto del pedido línea por línea
    const lineas = items.map(item =>
        `• ${item.cantidad}x ${item.plato} — $${(item.precio * item.cantidad).toLocaleString('es-AR')}`
    );

    const total   = items.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    const mensaje = [
        '🛒 *Nuevo pedido*',
        '',
        ...lineas,
        '',
        `*Total: $${total.toLocaleString('es-AR')}*`
    ].join('\n');

    // Leer el número del local desde el backend para no hardcodearlo acá
    fetch('/config')
        .then(r => r.json())
        .then(config => {
            const url = `https://wa.me/${config.whatsappNumero}?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
        })
        .catch(() => {
            // Si no hay config, igual abrimos WhatsApp sin número (el cliente elige)
            const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
        });
}


// ============================================================
// TOAST (notificacion flotante temporal)
// ============================================================

/**
 * PROPOSITO:
 *   Muestra un mensaje pequeño en pantalla por 2 segundos y desaparece.
 *   Sirve para confirmarle al usuario que su acción funcionó.
 *
 * @param {string} mensaje - Texto a mostrar
 */
function mostrarToast(mensaje) {
    const toast = document.getElementById('cartToast');
    toast.textContent   = mensaje;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
}


// ============================================================
// EVENTOS DE LOS BOTONES DEL MODAL
// ============================================================

// Abrir el modal al clickear el botón flotante
document.getElementById('fabBtn').addEventListener('click', () => {
    document.getElementById('modalOverlay').removeAttribute('hidden');
});

// Cerrar el modal con el botón X
document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('modalOverlay').setAttribute('hidden', '');
});

// Cerrar el modal clickeando fuera del contenido
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.setAttribute('hidden', '');
    }
});

// Botón "Enviar por WhatsApp"
document.getElementById('btnWhatsapp').addEventListener('click', enviarPorWhatsapp);

// Botón "Vaciar carrito"
document.getElementById('btnClear').addEventListener('click', () => {
    carrito = {};
    actualizarUI();
});


// ============================================================
// ARRANCAR LA APP
// ============================================================
cargarMenu();
