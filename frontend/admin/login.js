// login.js
const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    const email = document.getElementById('usuario').value; // O email
    const password = document.getElementById('password').value;

    // Enviamos los datos al backend
    const respuesta = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const resultado = await respuesta.json();
    
    if (respuesta.ok) {
        alert('¡Bienvenido!');
        // Acá guardarías el token (la "pulserita VIP")
    } else {
        alert('Error: ' + resultado.message);
    }
});