const registerForm = document.getElementById('formRegistro');

registerForm.addEventListener('submit', async (e) => 
{  e.preventDefault();
    const nombre = document.getElementById('nombreDeUsuario').value;
    const email = document.getElementById('Email').value;
    const password = document.getElementById('Contraseña').value;

    const respuesta = await fetch("http://localhost:3000/api/registro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({nombre, email, password })
    });
    
    const resultado = await respuesta.json();
    
    if (respuesta.ok) {
        alert('¡Bienvenido!');
        // Acá guardarías el token (la "pulserita VIP")
    } else {
        alert('Error: ' + resultado.message);
    }
});