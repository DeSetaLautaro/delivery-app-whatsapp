const mongoose = require('mongoose');

// ---------------------------------------------------------
// 1. SUBDOCUMENTOS (Estructuras hijas)
// ---------------------------------------------------------

// A. El esquema para una opción individual (Ej: "Cheddar" - $500)
const opcionToppingSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 }
});

// B. El esquema para el grupo entero (Ej: "Agregados para Hamburguesas")
const grupoToppingSchema = new mongoose.Schema({
    nombre: { type: String, required: true }, // Título del grupo
    categoriaDestino: { type: String, required: true }, // A qué categoría aplica (ej: "Hamburguesas")
    esMultiselect: { type: Boolean, default: true }, // true = puede elegir varios, false = elige solo 1
    opciones: [opcionToppingSchema] // Lista de las opciones definidas arriba
});

// C. Extraemos tu esquema de platos para que quede más limpio
const platoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String },
    precio: { type: Number, required: true },
    categoria: { type: String, required: true },
    disponible: { type: Boolean, default: true }
});


// ---------------------------------------------------------
// 2. ESQUEMA PRINCIPAL (El Padre)
// ---------------------------------------------------------
const usuarioSchema = new mongoose.Schema({
    // Datos del local
    nombreDelLocal: { type: String, required: true},
    email: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    password: { type: String, required: true },
    fechaRegistro: { type: Date, default: Date.now },
    
    // Perfil
    horarios: { type: String, default: "" },
    horariosEstructurados: [{
        dia: { type: String },
        apertura: { type: String },
        cierre: { type: String }
    }],
    telefono: { type: String, default: "" },
    direccion: { type: String, default: "" },
    abierto: { type: Boolean, default: true },
    slug: { type: String, required: true, unique: true },

    // Listas (Subdocumentos)
    platos: [platoSchema],
    
    // 👇 ¡LO NUEVO! La lista de grupos de toppings
    gruposToppings: [grupoToppingSchema]
});

// PONÉ ESTA LÍNEA:
module.exports = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);