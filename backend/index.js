require('dotenv').config();
const express   = require('express');
const multer    = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const fs        = require('fs');
const path      = require('path');

const app    = express();
const PUERTO = process.env.PUERTO || 3000;

app.use(express.json());

// Sirve los archivos del frontend (HTML, CSS, JS) como archivos estaticos.
// Esto permite abrirlos desde http://localhost:3000/ en vez de file://
// que bloquea el fetch() por politica de seguridad del navegador (CORS).
app.use(express.static(path.join(__dirname, '../frontend')));

// Multer: guarda los archivos recibidos en la carpeta /uploads
const upload = multer({ dest: 'uploads/' });

// Ruta donde se va a guardar el menu procesado por la IA.
// __dirname es la carpeta del archivo actual (backend/)
// El archivo se llama menu.json y vive dentro de backend/
const MENU_PATH = path.join(__dirname, 'menu.json');

// Claude: inicializa el cliente con la key del .env
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });




// ============================================================
// RUTA: POST /subir-menu
// ============================================================
/**
 * PROPOSITO:
 *   Recibe una imagen del menu del local, la convierte a Base64
 *   y se la manda a Claude para que extraiga los platos y precios
 *   en formato JSON estructurado.
 *
 * BODY (form-data):
 *   - archivoMenu (File): Imagen del menu (JPG, PNG, etc)
 *
 * RESPUESTA EXITOSA (200):
 *   { "mensaje": "Menu analizado con exito", "datos": [ {plato, descripcion, precio, categoria}, ... ] }
 *
 * ERRORES:
 *   - 400: No se envio archivo
 *   - 500: Error al leer el archivo o al llamar a la API de Claude
 */
app.post('/subir-menu', upload.single('archivoMenu'), async (req, res) => {

    // Validacion: verificar que llego un archivo
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibio ningun archivo.' });
    }

    try {
        // Paso 1: Leer la imagen como Base64
        // Las imagenes son datos binarios. Base64 los convierte a texto
        // para que puedan viajar dentro del JSON que le mandamos a Claude.
        const filePath   = req.file.path;
        const fileBuffer = fs.readFileSync(filePath);        // Lee el archivo como binario (Buffer)
        const base64Data = fileBuffer.toString('base64');    // Convierte a texto Base64
        const mimeType   = req.file.mimetype;                // Ej: "image/jpeg", "image/png"

        console.log(`[INFO] Imagen recibida: ${req.file.originalname} (${mimeType})`);

        // Paso 2: Llamar a Claude con la imagen embebida
        // Claude recibe los mensajes como un array de "content blocks".
        // Un bloque puede ser texto o imagen. Acá mandamos los dos juntos.
        const respuesta = await claude.messages.create({
            model:      'claude-haiku-4-5-20251001', // Modelo economico con vision de imagenes
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            // Bloque 1: la imagen en Base64
                            type:   'image',
                            source: {
                                type:       'base64',
                                media_type: mimeType,
                                data:       base64Data
                            }
                        },
                        {
                            // Bloque 2: las instrucciones en texto
                            type: 'text',
                            text: `
                                Sos un asistente que lee menus de restaurantes a partir de imagenes.
                                Analiza la imagen y devuelve UNICAMENTE un array JSON valido, sin explicaciones ni markdown.

                                Estructura requerida por cada plato:
                                [
                                  { "plato": "Nombre del plato", "descripcion": "Descripcion breve o cadena vacia si no hay", "precio": 000, "categoria": "Categoria o Varios si no se puede determinar" }
                                ]

                                Si no ves un menu en la imagen, devuelve un array vacio: []
                            `
                        }
                    ]
                }
            ]
        });

        // Paso 3: Limpiar la respuesta y convertirla a JSON real
        // Claude a veces envuelve el JSON en ```json ... ```, hay que sacarlo
        let respuestaTexto = respuesta.content[0].text;
        respuestaTexto = respuestaTexto.replace(/```json|```/g, '').trim();

        const menuJSON = JSON.parse(respuestaTexto);

                console.log(`[INFO] Menu procesado: ${menuJSON.length} platos encontrados.`);

        // Paso 4: Guardar el menu en menu.json
        // JSON.stringify con (null, 2) formatea el archivo con indentacion
        // para que sea legible si alguien lo abre manualmente.
        // 'utf8' indica que se guarda como texto plano.
        fs.writeFileSync(MENU_PATH, JSON.stringify(menuJSON, null, 2), 'utf8');
        console.log(`[INFO] Menu guardado en ${MENU_PATH}`);

        // Paso 5: Responder al cliente con el menu estructurado
        res.status(200).json({
            mensaje: 'Menu analizado y guardado con exito',
            datos:   menuJSON
        });

    } catch (error) {
        console.error('[ERROR]', error.message);
        res.status(500).json({ error: 'Error procesando el menu: ' + error.message });
    }
});


// ============================================================
// RUTA: GET /config
// ============================================================
/**
 * PROPOSITO:
 *   Expone la configuracion publica del local (nombre, numero de WhatsApp).
 *   El frontend la usa para armar el link de WhatsApp sin hardcodear nada.
 *   IMPORTANTE: solo expone datos publicos, nunca la API key.
 *
 * RESPUESTA EXITOSA (200):
 *   { "nombreLocal": "La Esquina", "whatsappNumero": "5491112345678" }
 */
app.get('/config', (req, res) => {
    res.status(200).json({
        nombreLocal:      process.env.NOMBRE_LOCAL      || 'Mi Local',
        whatsappNumero:   process.env.WHATSAPP_NUMERO   || ''
    });
});


// ============================================================
// RUTA: GET /menu
// ============================================================
/**
 * PROPOSITO:
 *   Devuelve el menu guardado en menu.json.
 *   El frontend del cliente llama a esta ruta al cargar la pagina
 *   para obtener los platos y mostrarlos en pantalla.
 *
 * RESPUESTA EXITOSA (200):
 *   [ { plato, descripcion, precio, categoria }, ... ]
 *
 * ERRORES:
 *   - 404: Todavia no se subio ningun menu
 */
app.get('/menu', (req, res) => {

    // Verificar si el archivo menu.json existe
    if (!fs.existsSync(MENU_PATH)) {
        return res.status(404).json({ error: 'Todavia no hay ningun menu cargado.' });
    }

    // Leer el archivo y devolverlo como JSON
    const menuRaw  = fs.readFileSync(MENU_PATH, 'utf8');
    const menuJSON = JSON.parse(menuRaw);

    console.log(`[INFO] Menu enviado al cliente (${menuJSON.length} platos).`);
    res.status(200).json(menuJSON);
});


// ============================================================
// Iniciar el servidor
// ============================================================
app.listen(PUERTO, () => {
    console.log(`[SERVER] Corriendo en http://localhost:${PUERTO}`);
});

