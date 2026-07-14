const express = require('express');
const router = express.Router(); 
const fs = require('fs');


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

module.exports = router;