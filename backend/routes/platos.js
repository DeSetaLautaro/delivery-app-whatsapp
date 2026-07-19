require('dotenv').config();
const express = require('express');
const router = express.Router(); 
const fs = require('fs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const Anthropic = require('@anthropic-ai/sdk');
const path      = require('path');
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });




/*
-PROPÓSITO: se envía el plato nuevo que se agrega en la DB
*/

router.post('/', async (req, res) => {
    
    const { nombre, precio } = req.body;

    const platoNuevo = {
        id: Date.now(),
        nombre: nombre,
        precio: precio
    };

    try {
        if (!(fs.existsSync('platos.json'))) {
            fs.writeFileSync('platos.json', '[]');
        } 

        const archivo = fs.readFileSync('platos.json', 'utf8');
        const listaDePlatos = JSON.parse(archivo);

        listaDePlatos.push(platoNuevo);
        fs.writeFileSync('platos.json', JSON.stringify(listaDePlatos, null, 2));

        res.status(200).json(listaDePlatos);

    } catch (error) {
        console.error("Error guardando el plato:", error);
        res.status(500).json({ error: "No se pudo guardar el plato" });
    }
})



/*
-PROPÓSITO: Cuando se realiza una petición  se devuelve la lista de platos guardadas en la DB.
*/ 
router.get('/', (req, res) => {
    try {
        // 1. Si el archivo no existe mandamos una lista vacía al frontend
        if (!fs.existsSync('platos.json')) {
            return res.status(200).json([]);
        }

        // 2. Si existe, se abre y se lee
        const archivo = fs.readFileSync('platos.json', 'utf8');
        const listaDePlatos = JSON.parse(archivo);

        // 3. se manda el array completo al frontend
        res.status(200).json(listaDePlatos);

    } catch (error) {
        console.error("Error al leer los platos:", error);
        res.status(500).json({ error: "No se pudieron cargar los platos" });
    }
});




// Atrapamos las peticiones PUT que apuntan a un ID específico
router.put('/:id', (req, res) => {
    console.log("pase por aca");
    try {
        // 1. Capturamos el ID de la URL y los datos nuevos del body
        const idPlato = req.params.id; 
        const datosNuevos = req.body; // Esto trae el { nombre: "...", precio: ... }

        // 2. Abrimos la "caja fuerte" y leemos lo que hay
        const archivo = fs.readFileSync('platos.json', 'utf8');
        let listaDePlatos = JSON.parse(archivo);

        // 3. Buscamos en qué número de renglón (índice) está nuestro plato
        // Usamos == en vez de === porque el ID de la URL llega como Texto y el del JSON es un Número
        const indice = listaDePlatos.findIndex(plato => plato.id == idPlato);

        // Si findIndex nos devuelve -1, significa que no lo encontró
        if (indice === -1) {
            return res.status(404).json({ error: "Plato no encontrado" });
        }

        // 4. Modificamos únicamente los datos de ESE renglón específico
        listaDePlatos[indice].nombre = datosNuevos.nombre;
        listaDePlatos[indice].precio = datosNuevos.precio;
        listaDePlatos[indice].categoria = datosNuevos.categoria;

        // 5. Volvemos a convertir todo a texto y lo guardamos aplastando el archivo anterior
        fs.writeFileSync('platos.json', JSON.stringify(listaDePlatos, null, 2));

        // Le avisamos al frontend que todo salió perfecto
        res.status(200).json({ mensaje: "Plato actualizado con éxito" });

    } catch (error) {
        console.error("Error al editar el plato:", error);
        res.status(500).json({ error: "No se pudo actualizar el plato" });
    }
});


// Atrapamos las peticiones DELETE que apuntan a un ID específico
router.delete('/:id', (req, res) => {
    try {
        const idPlato = req.params.id; 

        // 1. Abrimos el archivo
        const archivo = fs.readFileSync('platos.json', 'utf8');
        let listaDePlatos = JSON.parse(archivo);

        // 2. Filtar: guardamos todos los platos cuyo ID sea DISTINTO (!=) al de la URL
        const nuevaLista = listaDePlatos.filter(plato => plato.id != idPlato);

        // 3. Verificamos si realmente borramos algo
        if (listaDePlatos.length === nuevaLista.length) {
            return res.status(404).json({ error: "Plato no encontrado" });
        }

        // 4. Guardamos la nueva lista limpia aplastando el archivo anterior
        fs.writeFileSync('platos.json', JSON.stringify(nuevaLista, null, 2));

        res.status(200).json({ mensaje: "Plato eliminado con éxito" });

    } catch (error) {
        console.error("Error al borrar el plato:", error);
        res.status(500).json({ error: "No se pudo borrar el plato" });
    }
});





router.post('/bulk', (req, res) => {
    // 1. Recibimos los platos del Excel
    const platosDelExcel = req.body; 

    try {
        // ¡OJO ACÁ!: Como el Excel no tiene las columnas de "ID" internas, 
        // le inyectamos un ID único a cada plato antes de guardarlo, 
        // para que tus botones de Borrar y Editar sigan funcionando después.
        const platosListosParaGuardar = platosDelExcel.map((plato, index) => {
            return {
                id: Date.now().toString() + index, // Generamos un ID rápido
                ...plato // Le pegamos todos los datos del Excel (nombre, precio, etc)
            };
        });

        // 2. EL REEMPLAZO TOTAL: Aplastamos el platos.json anterior con la nueva lista
        fs.writeFileSync(rutaPlatosJSON, JSON.stringify(platosListosParaGuardar, null, 2), 'utf-8');

        // 3. Avisamos que todo salió de 10
        res.status(200).json({ mensaje: 'Menú actualizado por completo (Reemplazo total)' });

    } catch (error) {
        console.error("Error en carga masiva:", error);
        res.status(500).json({ error: 'Error al procesar el archivo' });
    }
});




async function procesarConIA(fotos)
{
    // Paso 1: Convertir todas las fotos a Base64
const bloquesDeImagen = fotos.map(file => ({
    type: 'image',
    source: {
        type: 'base64',
        media_type: file.mimetype,
        data: file.buffer.toString('base64') // Si usas memoryStorage, el archivo está en file.buffer
    }
}));
 const respuesta = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001', // Usá un modelo estable y económico
    max_tokens: 2048,
    // System message: Esto es lo más importante. Le define su "personalidad"
    system: "Sos un asistente experto en extracción de datos. Tu única tarea es convertir imágenes de menús en un array JSON estricto. No respondas nada más, no uses markdown, solo el JSON.",
    messages: [
        {
            role: 'user',
            content: [
                // Acá agregamos tantas imágenes como quieras, una por una
                ...bloquesDeImagen, 
                {
                    type: 'text',
                    text: `Analiza las imágenes proporcionadas y devuelve un array JSON de objetos con la siguiente estructura exacta: 
                    { "nombre": string, "descripcion": string, "precio": number, "categoria": string }. 
                    Si no hay descripción, usa cadena vacía. Si no hay categoría, usa 'Varios'. 
                    Solo responde con el JSON.`
                }
            ]
        }
    ]
});
        // Paso 3: Limpiar la respuesta y convertirla a JSON real
        let respuestaTexto = respuesta.content[0].text;
    respuestaTexto = respuestaTexto.replace(/```json|```/g, '').trim();
    return JSON.parse(respuestaTexto);
};


// La constante la dejamos afuera, arribita de todo, para que sea más ordenado
const MENU_PATH = path.join(__dirname, '../platos.json');

// 1. Agregamos "async" acá
router.post('/procesar-ia', upload.any(), async (req, res) => { 
    try {
        const fotos = req.files;
        
        // 1. Recibimos los platos de la IA (vienen sin ID)
        const platosDesdeIA = await procesarConIA(fotos); 
        
        // 2. ¡LA MAGIA ACÁ! Recorremos el array y le inyectamos un ID único a cada uno
        const menuJSON = platosDesdeIA.map(plato => {
            return {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
                nombre: plato.nombre,
                descripcion: plato.descripcion || '',
                precio: Number(plato.precio) || 0, // Nos aseguramos de que sea número
                categoria: plato.categoria || 'Varios'
            };
        });
        
        // 3. ¡EL GUARDADO FÍSICO! (Ahora sí se guardan con su ID)
        fs.writeFileSync(MENU_PATH, JSON.stringify(menuJSON, null, 2), 'utf8');
        console.log(`[ÉXITO] Archivo creado/actualizado en: ${MENU_PATH}`);

        // 4. Le avisamos al Frontend
        res.status(200).json({ 
            mensaje: 'Menú analizado y guardado con éxito',
            platos: menuJSON 
        });
        
    } catch (error) {
        console.error("Error en la ruta procesar-ia:", error);
        res.status(500).json({ error: "No pude procesar las fotos" });
    }
});

/*router.post('/guardar-ia', upload.any(), async(req,res) =>{
    
    fs.writeFileSync(MENU_PATH, JSON.stringify(menuJSON, null, 2), 'utf8');

});*/

module.exports = router;