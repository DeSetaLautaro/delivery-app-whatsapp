// login.js
const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    const email = document.getElementById('usuario').value; // O email
    const password = document.getElementById('password').value;

    // Enviamos los datos al backend
    const respuesta = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const resultado = await respuesta.json();
    
    if (respuesta.ok) {
        // Opcional: podés dejar el alert o sacarlo para que entre más rápido
        // alert('¡Bienvenido!'); 

        // 1. Guardamos la pulserita VIP (el token) en el bolsillo del navegador
        // Asumimos que tu backend te manda el token dentro de "resultado.token"
        localStorage.setItem('token', resultado.token);
        localStorage.setItem('user', JSON.stringify(resultado.user))
        
        window.location.href = '/admin/dashboard';

    } else {
        alert('Error: ' + resultado.message);
    }
});