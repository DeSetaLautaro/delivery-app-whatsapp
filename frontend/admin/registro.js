const formRegistro = document.getElementById('formRegistro');
const emailInput = document.getElementById('Email');
const confirmarInput = document.getElementById('ConfirmarContraseña');
const errorEmailSpan = document.getElementById('errorEmail');
const errorConfirmarSpan = document.getElementById('errorConfirmar');
const registroError = document.getElementById('registroError');

function validarFormatoEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function marcarError(input, span, mensaje) {
    input.classList.add('error-input');
    span.textContent = mensaje;
}

function limpiarErrores() {
    emailInput.classList.remove('error-input');
    confirmarInput.classList.remove('error-input');
    errorEmailSpan.textContent = '';
    errorConfirmarSpan.textContent = '';
    registroError.textContent = '';
}

async function verificarEmailExiste(email) {
    try {
        const respuesta = await peticionAPI(`/api/existe-email?email=${encodeURIComponent(email)}`, 'GET');
        if (!respuesta || !respuesta.ok) return null;
        const data = await respuesta.json();
        return data.existe;
    } catch (error) {
        console.error('Error al verificar email:', error);
        return null;
    }
}

// Validar el email cuando el usuario termina de escribir
emailInput.addEventListener('blur', async () => {
    const email = emailInput.value.trim();
    limpiarErrores();

    if (!email) return;
    if (!validarFormatoEmail(email)) {
        marcarError(emailInput, errorEmailSpan, 'Email no válido');
        return;
    }

    const existe = await verificarEmailExiste(email);
    if (existe === false) {
        marcarError(emailInput, errorEmailSpan, 'Email no encontrado');
    }
});

formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores();

    const nombre = document.getElementById('nombreDeUsuario').value;
    const email = emailInput.value.trim();
    const password = document.getElementById('Contraseña').value;
    const confirm = confirmarInput.value;
    const telefono = document.getElementById('Telefono').value;
    const nombreDelLocal = document.getElementById('nombreDelLocal').value;

    // Validar formato de email
    if (!email || !validarFormatoEmail(email)) {
        marcarError(emailInput, errorEmailSpan, 'Email no válido');
        return;
    }

    // Validar que las contraseñas coincidan
    if (password !== confirm) {
        marcarError(confirmarInput, errorConfirmarSpan, 'Las contraseñas no coinciden');
        return;
    }

    // Verificar que el email exista (según lo pedido)
    const existe = await verificarEmailExiste(email);
    if (existe === false) {
        marcarError(emailInput, errorEmailSpan, 'Email no encontrado');
        return;
    }

    const payload = { nombre, email, password, telefono, nombreDelLocal };
    const respuesta = await peticionAPI('/api/registro', 'POST', payload);

    if (respuesta && respuesta.ok) {
        const resultado = await respuesta.json();
        alert(resultado.message || '¡Registro exitoso!');
    } else {
        const error = respuesta ? await respuesta.json().catch(() => ({})) : {};
        registroError.textContent = error.message || 'Error al registrar. Intentalo de nuevo.';
    }
});
