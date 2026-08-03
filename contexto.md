# Contexto del Proyecto
Este es un proyecto de una App de Delivery para locales de barrio.
El objetivo es que sea súper liviana. El cliente del local tiene que enviar un wpp al local y este le pasa el link de esta aplicación webb
con un url que lo redirige al perfil de ese local. allí podrá ver todos los platos, armar su carrito y mandar un wpp con el pedido.

También hay un dashboard donde el dueño del local puede cargar sus platos, agregarle toppings a cada plato, editarlos y borrarlos. luego tiene su info de perfil y configuración para editar el formato del mensaje de wpp, poner la información de su local y establecer los horarios de apertura y cierre.

# Reglas de Programación
- El Frontend usa puramente Vanilla JS, HTML y CSS. NO usar React.
- El Backend usa Node.js, Express y MongoDB.
- Siempre que necesites hacer un llamado al backend desde el frontend, utilizá la función `PeticionApi` que está en el archivo `api.js`.
- Comentá el código en español (indicando requeremientos para la función o evento, contexto y sobre todo su propósito).
