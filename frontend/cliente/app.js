


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

// Cache del menú: se llena al cargar para no repetir el fetch cada vez que
// el usuario toca "+ Agregar".
let platosCache = [];

// Slug del local (ej: "la-esquina"), sacado una sola vez de la URL.
const slugLocal = window.location.pathname.split('/')[2] || '';

let temaActualMenu = 'clasico';

// Plato que está esperando confirmación en el popup de toppings.
let platoPendiente = null;


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
        // 1. Sacamos el slug de la URL (Ej: familia-comidas)
        const urlActual = window.location.pathname; 
        const slugDelLocal = urlActual.split('/')[2]; 

        // 2. Hacemos la petición a la API
        const respuesta = await fetch(`/api/publico/menu/${slugDelLocal}`);
        let estaAbierto = await fetch(`/api/publico/estadoLocal/${slugDelLocal}`);

        if (!respuesta.ok) {
            contenedor.innerHTML = '<p class="menu-error">Menú no disponible por el momento. Volvé a intentarlo más tarde.</p>';
            return;
        }

        // 3. Convertimos la respuesta a JSON
        const platos = await respuesta.json();
        estaAbierto = await estaAbierto.json();

        // 4. Logo del header: si el local tiene foto, reemplazamos la pizza
        const perfilDelLocal = await (await fetch(`/api/publico/perfil/${slugDelLocal}`)).json();
        // Aplicar tema visual elegido por el local
        const temaActual = perfilDelLocal.temaMenu || 'clasico';
        document.body.classList.remove('tema-clasico', 'tema-elegante');
        document.body.classList.add(`tema-${temaActual}`);
        temaActualMenu = temaActual;

        // Forzar cambio de color de fondo si es elegante (fallback rápido)
        if (temaActual === 'elegante') {
            document.body.style.backgroundColor = '#F9FAFB';
        } else {
            document.body.style.backgroundColor = '';
        }
        const logoHeader     = document.getElementById('brandLogoImg');
        if (perfilDelLocal.fotoPerfil) {
            logoHeader.src    = perfilDelLocal.fotoPerfil;
            logoHeader.hidden = false;
            document.getElementById('brandLogoFallback').hidden = true;
        }

        // Nombre del local en el header y en la pestaña del navegador
        const nombreLocalBar = perfilDelLocal.nombre || '';
        const brandNameEl = document.getElementById('brandName');
        if (brandNameEl) brandNameEl.textContent = nombreLocalBar || 'Cargando...';
        document.title = (nombreLocalBar ? `${nombreLocalBar} | Menú Digital` : 'Cargando menú | Menú Digital');

        // Guardamos en caché para usarlos en agregarAlCarrito sin refetch
        platosCache = platos;

        // Actualizamos el badge de estado en el header
        const badgeEstado = document.getElementById('badgeEstadoLocal');
        if (badgeEstado) {
            if (estaAbierto.abierto) {
                badgeEstado.textContent = '● Abierto';
                badgeEstado.classList.add('badge-abierto');
                badgeEstado.classList.remove('badge-cerrado');
            } else {
                badgeEstado.textContent = '● Cerrado';
                badgeEstado.classList.add('badge-cerrado');
                badgeEstado.classList.remove('badge-abierto');
            }
        }

        // 4. Le pasamos los platos a la función dibujante
        dibujarPlatos(platos, estaAbierto.abierto);

    } catch (error) {
        console.error('[ERROR] No se pudo cargar el menú:', error);
        contenedor.innerHTML = '<p class="menu-error">Error al conectar con el servidor.</p>';
    }
}

function dibujarPlatos(todosLosPlatos, abierto) { // <-- Ahora recibe si está abierto o no
    const contenedor = document.getElementById('menu-contenedor');


    // Validación por si el local no tiene platos cargados
    if (!todosLosPlatos || todosLosPlatos.length === 0) {
        contenedor.innerHTML = '<p class="menu-error">El menú está vacío.</p>';
        return;
    }
    const platos = todosLosPlatos.filter(plato => plato.disponible === true);

    // Agrupar los platos por categoría usando reduce
    const porCategoria = platos.reduce((grupos, plato) => {
        const cat = plato.categoria || 'Varios';
        if (!grupos[cat]) grupos[cat] = [];
        grupos[cat].push(plato);
        return grupos;
    }, {});

    // Generar botones para el carrusel sticky de categorías
    const categorias = Object.keys(porCategoria);
    const carrusel = document.getElementById('categoriasCarrusel');
    if (carrusel) {
        if (categorias.length === 0) {
            carrusel.style.display = 'none';
        } else {
            carrusel.style.display = '';
            carrusel.innerHTML = categorias.map(cat => {
                const idCat = 'cat-' + cat.toLowerCase().replace(/\s+/g, '-');
                return `<button class="categoria-chip" data-target="${idCat}" onclick="irACategoria('${idCat}')">${obtenerEmoji(cat)} ${cat}</button>`;
            }).join('');
        }
    }

    // Armamos SOLO el HTML de las tarjetas de los platos
    const htmlPlatos = Object.entries(porCategoria)
        .map(([categoria, items]) => crearSeccionCategoria(categoria, items))
        .join('');

    // --- ACÁ ENTRA LA MAGIA DEL LOCAL CERRADO ---
    if (!abierto) {
        // 1. Armamos el banner rojo (sin bloquear)
        const bannerHtml = `
            <div class="banner-cerrado">
                El local se encuentra cerrado en este momento.<br>
                <small>Podés mirar el menú, pero no se pueden hacer pedidos.</small>
            </div>
        `;
        
        // 2. Inyectamos el banner, y envolvemos los platos en un div bloqueado
        contenedor.innerHTML = bannerHtml + `<div class="menu-bloqueado">${htmlPlatos}</div>`;
    } else {
        // Si está abierto, inyectamos los platos normalmente
        contenedor.innerHTML = htmlPlatos;
    }

    // Aplicar filtro de búsqueda si ya hay algo escrito
    if (document.getElementById('buscadorPlatos')) {
        filtrarPlatosBuscador();
    }
}

// Función global para salto suave a una categoría
function irACategoria(id) {
    const destino = document.getElementById(id);
    if (destino) {
        destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                ${items.map(plato => crearTarjetaPlato(plato, categoria)).join('')}
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
function crearTarjetaPlato(plato, categoria) {
    // 1. Escudo para el nombre: Probamos si viene como 'nombre' o como 'plato'
    const nombreDelPlato = plato.nombre || plato.nombre || 'Plato sin nombre';
    
    // 2. Ahora sí sanitizamos el texto con total seguridad
    const nombreSeguro = nombreDelPlato.replace(/"/g, '&quot;');

    // 3. Escudo para el precio: Si no hay precio, mostramos 0
    const precioSeguro = plato.precio ? Number(plato.precio).toLocaleString('es-AR') : '0';

    // 4. Foto del plato: si hay URL la mostramos, si no, el emoji de la categoría
    const emojiCategoria = obtenerEmoji(categoria || plato.categoria || '');
    const fotoelegante = plato.fotoUrl
        ? `<div class="product-img"><img src="${plato.fotoUrl}" alt="${nombreDelPlato}" loading="lazy" /></div>`
        : `<div class="product-img product-img-emoji">${emojiCategoria}</div>`;

    // 5. Construir tarjeta según el tema del local
    if (temaActualMenu === 'elegante') {
        return `
            <article class="product-card" data-categoria="${categoria.toLowerCase()}" role="listitem">
                ${fotoelegante}
                <div class="product-info">
                    <h3 class="product-name">${nombreDelPlato}</h3>
                    <p class="product-desc">${plato.descripcion || 'Sin descripción'}</p>
                    <p class="product-price">$${precioSeguro}</p>
                </div>
                <div class="qty-control">
                    <button type="button" class="qty-btn qty-minus" aria-label="Quitar uno de ${nombreSeguro}" onclick="quitarDelCarrito('${nombreSeguro}')">−</button>
                    <span class="qty-value" data-nombre="${nombreSeguro}">0</span>
                    <button type="button" class="qty-btn qty-plus" aria-label="Agregar ${nombreSeguro} al carrito" onclick="agregarAlCarrito('${nombreSeguro}', '${plato.categoria || categoria || ''}')">+</button>
                </div>
            </article>
        `;
    }

    // Versión clásica (vertical)
    const imgClasica = plato.fotoUrl
        ? `<img src="${plato.fotoUrl}" alt="${nombreDelPlato}" loading="lazy" />`
        : `<span style="font-size:2.6rem;color:#ff6b35;">${emojiCategoria}</span>`;

    return `
        <div class="tarjeta-clasica" data-categoria="${categoria.toLowerCase()}">
            <div class="clasica-img-container">${imgClasica}</div>
            <div class="clasica-info">
                <h3 class="clasica-nombre product-name">${nombreDelPlato}</h3>
                <p class="clasica-desc product-desc">${plato.descripcion || 'Sin descripción'}</p>
                <span class="clasica-precio product-price">$${precioSeguro}</span>
            </div>
            <div class="clasica-controles">
                <button type="button" class="qty-btn qty-minus" aria-label="Quitar uno de ${nombreSeguro}" onclick="quitarDelCarrito('${nombreSeguro}')">−</button>
                <span class="qty-value" data-nombre="${nombreSeguro}">0</span>
                <button type="button" class="qty-btn qty-plus" aria-label="Agregar ${nombreSeguro} al carrito" onclick="agregarAlCarrito('${nombreSeguro}', '${plato.categoria || categoria || ''}')">+</button>
            </div>
        </div>
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
/**
 * Cuando el usuario toca "+ Agregar":
 *   - Consulta si la categoría del plato tiene toppings públicos.
 *   - SI tiene → abre el popup de personalización.
 *   - NO tiene → agrega directo al carrito (comportamiento anterior).
 */
async function agregarAlCarrito(nombrePlato, categoria) {
    // Buscamos en el caché (sin fetch extra)
    const plato = platosCache.find(p => p.nombre === nombrePlato);
    if (!plato) return;

    try {
        const res = await fetch(`/api/publico/toppings/${slugLocal}/${encodeURIComponent(categoria)}`);
        const grupos = res.ok ? await res.json() : [];

        if (grupos.length > 0) {
            // Hay toppings: guardamos el plato y abrimos el popup
            platoPendiente = plato;
            abrirModalToppings(plato, grupos);
        } else {
            // Sin toppings: agregamos directo
            _sumarAlCarrito(plato);
        }
    } catch (error) {
        console.error('Error al buscar toppings:', error);
        _sumarAlCarrito(plato); // Si falla, no bloqueamos al usuario
    }
}

/**
 * Escribe en el carrito. Es la única función que modifica `carrito`.
 * Crea una clave única que incluye los toppings elegidos, así la misma
 * hamburguesa con y sin cheddar quedan como entradas separadas.
 */
function _sumarAlCarrito(plato, toppings = []) {
    const extraPrecio = toppings.reduce((sum, t) => sum + (t.precio || 0), 0);

    const clave = toppings.length
        ? `${plato.nombre} (${toppings.map(t => t.opcionNombre).join(', ')})`
        : plato.nombre;

    if (carrito[clave]) {
        carrito[clave].cantidad += 1;
    } else {
        carrito[clave] = { ...plato, nombre: clave, precio: plato.precio + extraPrecio, cantidad: 1, toppings: toppings.map(t => ({...t})) };
    }

    actualizarUI();
    mostrarToast(`${plato.nombre} agregado al carrito 🛒`);
}


// ============================================================
// POPUP DE TOPPINGS
// ============================================================

function abrirModalToppings(plato, grupos) {
    document.getElementById('toppingModalSubtitulo').textContent = plato.nombre;

    const contenido = document.getElementById('toppingsContenido');
    contenido.innerHTML = grupos.map(grupo => `
        <div class="topping-grupo">
            <h3 class="topping-grupo-titulo">${grupo.nombre}</h3>
            <ul class="topping-opciones-lista">
                ${grupo.opciones.filter(op => op.disponible !== false).map(op => `
                    <li class="topping-opcion-item">
                        <label class="topping-opcion-label">
                            <input
                                type="${grupo.esMultiselect ? 'checkbox' : 'radio'}"
                                name="topping-${grupo._id}"
                                value="${op.nombre}"
                                data-grupo="${grupo.nombre}"
                                data-precio="${op.precio || 0}"
                            />
                            <span class="topping-opcion-nombre">${op.nombre}</span>
                            ${op.precio
                                ? `<span class="topping-opcion-precio">+$${Number(op.precio).toLocaleString('es-AR')}</span>`
                                : `<span class="topping-opcion-gratis">Gratis</span>`
                            }
                        </label>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');

    document.getElementById('modalToppings').removeAttribute('hidden');
}

function cerrarModalToppings() {
    document.getElementById('modalToppings').setAttribute('hidden', '');
    document.getElementById('toppingsContenido').innerHTML = '';
    platoPendiente = null;
}

document.getElementById('cerrarModalToppings').addEventListener('click', cerrarModalToppings);

document.getElementById('modalToppings').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalToppings();
});

document.getElementById('btnConfirmarToppings').addEventListener('click', () => {
    if (!platoPendiente) return;

    const seleccionados = [...document.querySelectorAll('#toppingsContenido input:checked')]
        .map(input => ({
            grupoNombre:  input.dataset.grupo,
            opcionNombre: input.value,
            precio:       Number(input.dataset.precio)
        }));

    _sumarAlCarrito(platoPendiente, seleccionados);
    cerrarModalToppings();
});

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

/**
 * PROPOSITO:
 *   Suma +1 a un item del carrito usando su clave compuesta completa
 *   (ej: "Hamburguesa (Cheddar, Bacon)"). NO re-abre el popup ni busca
 *   en el caché: solo incrementa la cantidad del item tal y como está.
 *
 * @param {string} claveItem - Clave compuesta con la que se guardó el item.
 */
function sumarUnoAlCarrito(claveItem) {
    if (!carrito[claveItem]) return;

    carrito[claveItem].cantidad += 1;
    actualizarUI();
    mostrarToast(`${claveItem} agregado al carrito 🛒`);
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

    // Actualizar contadores en las tarjetas del menú
    document.querySelectorAll('.qty-value').forEach(el => {
        const nombre = el.getAttribute('data-nombre');
        const cantidad = carrito[nombre] ? carrito[nombre].cantidad : 0;
        el.textContent = cantidad;
    });

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
                <span class="cart-item-name">${item.nombre}</span>
                ${item.toppings && item.toppings.length ? `<span class="cart-item-toppings">➕ ${item.toppings.map(t => t.opcionNombre).join(', ')}</span>` : ''}
                <span class="cart-item-price">$${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
            </div>
            <div class="cart-item-controls">
                <button onclick="quitarDelCarrito('${item.nombre.replace(/'/g, "\\'")}')" aria-label="Quitar uno">−</button>
                <span>${item.cantidad}</span>
                <button onclick="sumarUnoAlCarrito('${item.nombre.replace(/'/g, "\\'")}')" aria-label="Agregar uno">+</button>
            </div>
        </li>
    `).join('');
}


/**
 * PROPOSITO:
 *   Filtra las tarjetas de productos que coincidan con el texto escrito
 *   en la barra de búsqueda. Se ejecuta en tiempo real con el evento 'input'.
 */
function filtrarPlatosBuscador() {
    const input = document.getElementById('buscadorPlatos');
    if (!input) return;

    const termino = input.value.toLowerCase().trim();

    document.querySelectorAll('.product-card, .tarjeta-clasica').forEach(tarjeta => {
        const nombre = (tarjeta.querySelector('.product-name, .clasica-nombre')?.textContent || '').toLowerCase();
        const desc = (tarjeta.querySelector('.product-desc, .clasica-desc')?.textContent || '').toLowerCase();
        const categoria = (tarjeta.dataset.categoria || '').toLowerCase();
        const coincide = !termino || nombre.includes(termino) || desc.includes(termino) || categoria.includes(termino);
        tarjeta.style.display = coincide ? '' : 'none';
    });

    // Ocultar las secciones de categoría que no tienen ninguna tarjeta visible
    document.querySelectorAll('.category-section').forEach(seccion => {
        const algunaVisible = [...seccion.querySelectorAll('.product-card, .tarjeta-clasica')].some(c => c.style.display !== 'none');
        seccion.style.display = algunaVisible ? '' : 'none';
    });

    // Mensaje de "no hay resultados"
    const hayResultados = [...document.querySelectorAll('.product-card, .tarjeta-clasica')].some(c => c.style.display !== 'none');
    const mensaje = document.getElementById('searchNoResults');
    if (mensaje) mensaje.hidden = hayResultados || !termino;
}


// ============================================================
// WHATSAPP
// ============================================================

function enviarPorWhatsapp() {
    const items = Object.values(carrito);
    if (items.length === 0) return;

    // 1. Leer los inputs de Dirección, Notas y Teléfono
    const direccionInput = document.getElementById('direccionEntrega');
    const notasInput     = document.getElementById('notasPedido');
    const telefonoInput  = document.getElementById('telefonoEntrega') || document.getElementById('telefonoCliente');
    const nombreClienteInput = document.getElementById('nombreCliente');

    const direccion = direccionInput ? direccionInput.value.trim() : '';
    const notas     = notasInput ? notasInput.value.trim() : '';
    const telefonoCliente = telefonoInput ? telefonoInput.value.trim() : '';

    // Validar que hayan puesto la dirección
    if (!direccion) {
        alert("Por favor, ingresá tu dirección para la entrega.");
        if (direccionInput) direccionInput.focus();
        return;
    }

    // Guardamos los datos en localStorage para la próxima visita
    if (nombreClienteInput) localStorage.setItem('nombreCliente', nombreClienteInput.value.trim());
    if (telefonoInput)      localStorage.setItem('telefonoCliente', telefonoCliente);
    if (direccionInput)     localStorage.setItem('direccionCliente', direccion);

    // 2. Leer el método de pago seleccionado
    const metodoPagoInput = document.querySelector('input[name="metodo_pago"]:checked');
    const valorMetodoPago = metodoPagoInput ? metodoPagoInput.value : 'efectivo';
    const metodoPago = valorMetodoPago === 'transferencia' 
        ? 'Transferencia 🏦' 
        : valorMetodoPago === 'tarjeta' 
            ? 'Tarjeta 💳' 
            : 'Efectivo 💵';
    const metodoPagoEnvio = valorMetodoPago === 'transferencia' 
        ? 'Transferencia' 
        : valorMetodoPago === 'tarjeta' 
            ? 'Tarjeta' 
            : 'Efectivo';

    // 3. Armar las líneas del pedido
    const lineas = items.map(item =>
        `• ${item.cantidad}x ${item.nombre} — $${(item.precio * item.cantidad).toLocaleString('es-AR')}`
    );

    const total = items.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);

    // 4. Estructurar el mensaje para WhatsApp
    const mensajeArr = [
        '🛒 *Nuevo pedido*',
        '',
        ...lineas,
        '',
        `*Total: $${total.toLocaleString('es-AR')}*`,
        '',
        `📍 *Dirección:* ${direccion}`,
        `💳 *Método de Pago:* ${metodoPago}`
    ];

    // Si el cliente escribió notas, las agregamos
    if (notas) {
        mensajeArr.push(`📝 *Notas:* ${notas}`);
    }

    const mensaje = mensajeArr.join('\n');

    // 5. Guardar pedido en la base de datos y redirección dinámica
    const slug = slugLocal;
    const itemsParaGuardar = items.map(item => ({
        nombrePlato: item.nombre,
        cantidad: item.cantidad,
        precio: item.precio,
        toppings: item.toppings || []
    }));

    fetch(`/api/publico/perfil/${slug}`)
        .then(resp => resp.json())
        .then(async perfil => {
            const localId = perfil._id || null;
            const payloadPedido = {
                localId,
                slug,
                items: itemsParaGuardar,
                total,
                cliente: '',
                metodoPago: metodoPagoEnvio,
                direccion,
                notas,
                telefonoCliente
            };

            try {
                await fetch('/api/pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadPedido)
                });
            } catch (error) {
                console.error('No se pudo guardar el pedido:', error);
            }

            const numero = perfil.whatsappNumero || ''; 
            const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
            window.location.href = window.location.pathname;
        })
        .catch(() => {
            const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
            window.location.href = window.location.pathname;
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
    cargarMetodosPago();
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

// ==============================================================
// VERIFICAR SI EL LOCAL ESTÁ ABIERTO O NO
// ==============================================================






// ==============================================================
// MÉTODOS DE PAGO (dinámicos según lo que configuró el local)
// ==============================================================

// Guardamos los datos de transferencia para mostrarlos si el usuario elige esa opción
let datosTransferencia = { alias: '', titular: '' };

async function cargarMetodosPago() {
    const contenedor = document.getElementById('contenedorMetodosPago');
    if (!contenedor) return;

    try {
        const res  = await fetch(`/api/publico/perfil/${slugLocal}`);
        const data = res.ok ? await res.json() : {};
        const metodos = data.metodosPago || [];

        // Si el local no configuró nada todavía, mostramos efectivo por defecto
        const lista = metodos.length
            ? metodos
            : [{ tipo: 'efectivo' }];

        // Guardamos los datos de transferencia por si los necesitamos luego
        const transf = lista.find(m => m.tipo === 'transferencia');
        if (transf) datosTransferencia = { alias: transf.alias, titular: transf.titular };

        const iconos   = { efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia', tarjeta: '💳 Tarjeta' };
        const primero  = lista[0].tipo;

        contenedor.innerHTML = `
            <div class="payment-methods-container">
                <span class="payment-title">Método de pago</span>
                <div class="payment-segmented">
                    ${lista.map((m, i) => `
                        <label class="payment-chip ${i === 0 ? 'selected' : ''}">
                            <input type="radio" name="metodo_pago" value="${m.tipo}"
                                   ${i === 0 ? 'checked' : ''}
                                   onchange="cambiarPago(this)" />
                            ${iconos[m.tipo] || m.tipo}
                        </label>`).join('')}
                </div>
            </div>`;

        // Mostramos info de transferencia si es el primer método
        if (primero === 'transferencia') mostrarInfoTransferencia(true);

    } catch (e) {
        console.error('Error al cargar métodos de pago:', e);
    }
}

function cambiarPago(radioInput) {
    document.querySelectorAll('.payment-chip').forEach(c => c.classList.remove('selected'));
    radioInput.closest('.payment-chip').classList.add('selected');
    mostrarInfoTransferencia(radioInput.value === 'transferencia');
}

function mostrarInfoTransferencia(mostrar) {
    const div = document.getElementById('infoTransferencia');
    if (!div) return;
    if (mostrar) {
        document.getElementById('transferenciaAlias').textContent   = datosTransferencia.alias   || '(sin configurar)';
        document.getElementById('transferenciaTitular').textContent = datosTransferencia.titular || '(sin configurar)';
        div.style.display = 'flex';
    } else {
        div.style.display = 'none';
    }
}

// ============================================================
// ARRANCAR LA APP
// ============================================================
// Apenas carga la pantalla del cliente...
document.addEventListener('DOMContentLoaded', async () => {
    // Configurar la búsqueda en vivo
    const buscador = document.getElementById('buscadorPlatos');
    if (buscador) {
        buscador.addEventListener('input', filtrarPlatosBuscador);
    }

    // Autocompletar datos del cliente guardados en localStorage
    const llenarCampo = (id, key) => {
        const el = document.getElementById(id);
        const valor = localStorage.getItem(key);
        if (el && valor) el.value = valor;
    };
    llenarCampo('nombreCliente', 'nombreCliente');
    llenarCampo('telefonoCliente', 'telefonoCliente');
    llenarCampo('telefonoEntrega', 'telefonoCliente');
    llenarCampo('direccionCliente', 'direccionCliente');
    llenarCampo('direccionEntrega', 'direccionCliente');

    cargarMenu();
});
