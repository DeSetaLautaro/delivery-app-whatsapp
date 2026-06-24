# 🍔 WhatsApp Delivery App MVP

[cite_start]Una aplicación Full-Stack diseñada para digitalizar y optimizar la toma de pedidos en locales gastronómicos y comercios de barrio[cite: 114, 117]. 

[cite_start]Este proyecto busca resolver el desorden de los pedidos manuales ofreciendo una interfaz liviana para el usuario [cite: 2, 7][cite_start], la cual genera automáticamente un mensaje estructurado hacia el WhatsApp del local[cite: 11, 118]. [cite_start]Simultáneamente, el sistema guarda cada transacción en una base de datos propia para permitir un análisis de datos profundo[cite: 3, 11].

## ✨ Características Principales

* [cite_start]**Pedidos sin fricción:** Interfaz web rápida que no requiere descargas ni registros molestos por parte del cliente[cite: 7, 38].
* [cite_start]**Integración con WhatsApp:** Generación de enlaces dinámicos (`wa.me`) que abren el WhatsApp del cliente con el pedido prearmado, claro y sin faltas de ortografía[cite: 3, 11].
* [cite_start]**Persistencia de Datos:** Registro automático de la fecha, cliente, productos y montos de cada pedido antes de ser enviado al local[cite: 11].
* [cite_start]**Digitalización con IA (En desarrollo):** Procesamiento automático de fotos o PDFs de menús físicos utilizando Inteligencia Artificial para extraer títulos, descripciones y precios[cite: 161, 163, 164].

## 🛠️ Stack Tecnológico

[cite_start]El proyecto está dividido en dos ecosistemas principales[cite: 192]:

* [cite_start]**Frontend (Interfaz Cliente):** *(Ej: React / HTML, CSS, JS)* para una navegación fluida que se siente como una app nativa[cite: 89].
* [cite_start]**Backend (Lógica y API):** Node.js [cite: 196] [cite_start]encargado de procesar la Inteligencia Artificial y gestionar las transacciones[cite: 162].
* [cite_start]**Base de Datos:** MongoDB o PostgreSQL para el almacenamiento estructurado y análisis de las ventas[cite: 164, 191].

## 📂 Estructura del Proyecto

El repositorio está organizado de la siguiente manera para separar responsabilidades:

[cite_start]├── /frontend # Contiene la interfaz liviana para el cliente y el armado del catálogo[cite: 195].
[cite_start]├── /backend  # Contiene el código Node.js, procesamiento de la IA y conexión a la DB[cite: 196].
[cite_start]└── README.md # Documentación del proyecto[cite: 197].


## 🚀 Instalación y Uso Local

1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/TU_USUARIO/delivery-app-whatsapp.git](https://github.com/TU_USUARIO/delivery-app-whatsapp.git)
