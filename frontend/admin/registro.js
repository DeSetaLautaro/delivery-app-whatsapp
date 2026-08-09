const formRegistro = document.getElementById('formRegistro');
const emailInput = document.getElementById('Email');
const confirmarInput = document.getElementById('ConfirmarContraseña');
const errorEmailSpan = document.getElementById('errorEmail');
const errorConfirmarSpan = document.getElementById('errorConfirmar');
const registroError = document.getElementById('registroError');
const telefonoInput = document.getElementById('Telefono');
const errorTelefono = document.getElementById('errorTelefono');
const codigoPaisSelect = document.getElementById('codigoPais');
const flagPais = document.getElementById('flagPais');

function validarFormatoEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return regex.test(email);
}

function marcarError(input, span, mensaje) {
    input.classList.add('error-input');
    span.textContent = mensaje;
}

function limpiarErrores() {
    emailInput.classList.remove('error-input');
    confirmarInput.classList.remove('error-input');
    telefonoInput.classList.remove('error-input');
    errorEmailSpan.textContent = '';
    errorConfirmarSpan.textContent = '';
    errorTelefono.textContent = '';
    registroError.textContent = '';
}

function validarTelefono(numero) {
    // Se eliminan espacios y guiones para quedarnos solo con los dígitos
    const soloDigitos = numero.replace(/[\s-]/g, '');
    return /^[0-9]{6,15}$/.test(soloDigitos);
}

function marcarErrorTelefono() {
    telefonoInput.classList.add('error-input');
    errorTelefono.textContent = 'Teléfono no válido';
}

function limpiarErrorTelefono() {
    telefonoInput.classList.remove('error-input');
    errorTelefono.textContent = '';
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
    if (existe === true) {
        marcarError(emailInput, errorEmailSpan, 'Ese email ya está registrado');
    }
});

// Validar el teléfono apenas se termina de escribir
telefonoInput.addEventListener('blur', () => {
    const numero = telefonoInput.value.trim();
    if (!numero) {
        limpiarErrorTelefono();
        return;
    }
    if (!validarTelefono(numero)) {
        marcarErrorTelefono();
    } else {
        limpiarErrorTelefono();
    }
});

// Actualizar la bandera visible según el país elegido
codigoPaisSelect.addEventListener('change', () => {
    const opcionSeleccionada = codigoPaisSelect.options[codigoPaisSelect.selectedIndex];
    if (opcionSeleccionada) {
        const texto = opcionSeleccionada.textContent.trim();
        const bandera = texto.split(' ')[0] || '🌍';
        flagPais.textContent = bandera;
    }
});

formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores();

    const nombre = document.getElementById('nombreDeUsuario').value;
    const email = emailInput.value.trim();
    const password = document.getElementById('Contraseña').value;
    const confirm = confirmarInput.value;
    const codigoPais = document.getElementById('codigoPais').value;
    const telefonoRaw = document.getElementById('Telefono').value.trim();
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

    // Validar teléfono
    if (!telefonoRaw || !validarTelefono(telefonoRaw)) {
        marcarErrorTelefono();
        return;
    }

    // Verificar que el email no esté ya registrado
    const existe = await verificarEmailExiste(email);
    if (existe === true) {
        marcarError(emailInput, errorEmailSpan, 'Ese email ya está registrado');
        return;
    }

    const telefono = `${codigoPais} ${telefonoRaw}`.trim();
    const payload = { nombre, email, password, telefono, codigoPais, nombreDelLocal };
    const respuesta = await peticionAPI('/api/registro', 'POST', payload);

    if (respuesta && respuesta.ok) {
        const resultado = await respuesta.json();
        alert(resultado.message || '¡Registro exitoso!');
    } else {
        const error = respuesta ? await respuesta.json().catch(() => ({})) : {};
        registroError.textContent = error.message || 'Error al registrar. Intentalo de nuevo.';
    }
});
