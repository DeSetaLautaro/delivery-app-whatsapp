// ==========================================
// GESTIÓN DE AGENTES
// ==========================================

let empresasDelAdmin = [];

// ==========================================
// 1. FUNCIONES PRINCIPALES
// ==========================================

async function cargarAgentes() {
    const contenedor = document.getElementById('contenedorAgentes');
    if (!contenedor) return;

    try {
        contenedor.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#888;">Cargando agentes...</p>';

        const resp = await fetch('/api/agentes', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!resp.ok) {
            const error = await resp.json().catch(() => ({}));
            throw new Error(error.error || 'Error al cargar agentes');
        }

        const agentes = await resp.json();
        renderizarAgentes(agentes);
    } catch (error) {
        console.error('Error cargando agentes:', error);
        contenedor.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#dc2626;">${error.message}</p>`;
    }
}

function renderizarAgentes(agentes) {
    const contenedor = document.getElementById('contenedorAgentes');
    if (!contenedor) return;

    if (agentes.length === 0) {
        contenedor.innerHTML = `
            <div class="agente-vacio">
                <p>No tenés agentes creados.</p>
                <button class="btn-accion" onclick="abrirFormularioAgente()">Crear el primero</button>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = '';

    agentes.forEach(agente => {
        const card = document.createElement('div');
        card.className = 'agente-card' + (agente.activo === false ? ' agente-inactivo' : '');

        const inicial = (agente.nombre || 'A').charAt(0).toUpperCase();
        const empresas = (agente.empresasAcceso || []);

        card.innerHTML = `
            <div class="agente-avatar">${inicial}</div>
            <div class="agente-info">
                <h3>${agente.nombre}</h3>
                <p class="agente-email">${agente.email}</p>
                <p class="agente-telefono">${agente.telefono || 'Sin teléfono'}</p>
                <span class="badge-empresas">${empresas.length} empresa(s)</span>
            </div>
            <div class="agente-acciones">
                <button class="btn-accion btn-toggle-agente" data-id="${agente._id}" data-activo="${agente.activo !== false}">
                    ${agente.activo === false ? 'Activar' : 'Desactivar'}
                </button>
                <button class="btn-accion btn-borrar-agente" data-id="${agente._id}" data-nombre="${agente.nombre}">
                    Borrar
                </button>
            </div>
        `;

        contenedor.appendChild(card);
    });
}

// ==========================================
// 2. CARGAR EMPRESAS PARA EL SELECTOR
// ==========================================

async function cargarEmpresasParaSelector() {
    const contenedor = document.getElementById('listaEmpresasCheckbox');
    if (!contenedor) return;

    try {
        const resp = await fetch('/api/agentes/mis-empresas', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!resp.ok) throw new Error('Error al cargar empresas');

        empresasDelAdmin = await resp.json();
        contenedor.innerHTML = '';

        if (empresasDelAdmin.length === 0) {
            contenedor.innerHTML = '<p class="topping-hint" style="grid-column:1/-1;">No tenés empresas asociadas.</p>';
            return;
        }

        empresasDelAdmin.forEach(emp => {
            const label = document.createElement('label');
            label.className = 'topping-checkbox-label';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = emp._id;
            checkbox.name = 'empresasAcceso';

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(emp.nombre));

            contenedor.appendChild(label);
        });
    } catch (error) {
        console.error('Error cargando empresas:', error);
        contenedor.innerHTML = '<p style="color:#dc2626;">No se pudieron cargar las empresas.</p>';
    }
}

// ==========================================
// 3. CREAR AGENTE
// ==========================================

async function crearAgente(datos) {
    const resp = await fetch('/api/agentes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(datos)
    });

    return resp;
}

// ==========================================
// 4. TOGGLE ACTIVAR / DESACTIVAR
// ==========================================

async function toggleAgente(id, nombre, activoActual) {
    const confirmar = confirm(`¿${activoActual ? 'Desactivar' : 'Activar'} al agente "${nombre}"?`);
    if (!confirmar) return;

    try {
        const resp = await fetch(`/api/agentes/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ activo: !activoActual })
        });

        if (!resp.ok) {
            const error = await resp.json().catch(() => ({}));
            throw new Error(error.error || 'Error al actualizar agente');
        }

        alert('Agente actualizado correctamente');
        cargarAgentes();
    } catch (error) {
        alert(error.message);
    }
}

// ==========================================
// 5. BORRAR AGENTE
// ==========================================

async function borrarAgente(id, nombre) {
    const confirmar = confirm(`¿Estás seguro de querer borrar al agente "${nombre}"?\nEsta acción no se puede deshacer.`);
    if (!confirmar) return;

    try {
        const resp = await fetch(`/api/agentes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!resp.ok) {
            const error = await resp.json().catch(() => ({}));
            throw new Error(error.error || 'Error al borrar agente');
        }

        alert('Agente borrado correctamente');
        cargarAgentes();
    } catch (error) {
        alert(error.message);
    }
}

// ==========================================
// 6. UI ABRIR / CERRAR FORMULARIO
// ==========================================

function abrirFormularioAgente() {
    const formCard = document.getElementById('agenteFormCard');
    if (formCard) formCard.hidden = false;
    cargarEmpresasParaSelector();
    document.getElementById('inputNombreAgente').focus();
}

function cerrarFormularioAgente() {
    const formCard = document.getElementById('agenteFormCard');
    if (formCard) formCard.hidden = true;
    document.getElementById('formNuevoAgente').reset();
}

// ==========================================
// 7. EVENTOS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuarioDataString = localStorage.getItem('user');

    if (!token || !usuarioDataString) {
        window.location.href = '/admin/login.html';
        return;
    }

    // Header
    cargarHeader(usuarioDataString);

    // Cargar agentes
    cargarAgentes();

    // Botón nuevo agente
    const btnNuevo = document.getElementById('btnNuevoAgente');
    if (btnNuevo) btnNuevo.addEventListener('click', abrirFormularioAgente);

    // Cerrar formulario
    const btnCerrar = document.getElementById('btnCerrarFormAgente');
    if (btnCerrar) btnCerrar.addEventListener('click', cerrarFormularioAgente);

    const btnCancelar = document.getElementById('btnCancelarAgente');
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarFormularioAgente);

    // Submit del formulario
    const form = document.getElementById('formNuevoAgente');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombre = document.getElementById('inputNombreAgente').value.trim();
            const email = document.getElementById('inputEmailAgente').value.trim();
            const password = document.getElementById('inputPasswordAgente').value;
            const telefono = document.getElementById('inputTelefonoAgente').value.trim();

            // Empresas seleccionadas
            const empresasSeleccionadas = Array.from(
                document.querySelectorAll('#listaEmpresasCheckbox input[type="checkbox"]:checked')
            ).map(cb => cb.value);

            const datos = {
                nombre,
                email,
                password,
                telefono,
                empresasAcceso: empresasSeleccionadas
            };

            try {
                const resp = await crearAgente(datos);

                if (!resp.ok) {
                    const error = await resp.json().catch(() => ({}));
                    throw new Error(error.error || 'Error al crear agente');
                }

                const data = await resp.json();
                alert(`Agente creado con éxito.\n\nPIN del CRM: ${data.pinGenerado}\n\nGuardalo porque no se vuelve a mostrar.`);

                cerrarFormularioAgente();
                cargarAgentes();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // Delegación para toggle y borrar
    const contenedor = document.getElementById('contenedorAgentes');
    if (contenedor) {
        contenedor.addEventListener('click', async (e) => {
            const btnToggle = e.target.closest('.btn-toggle-agente');
            if (btnToggle) {
                const id = btnToggle.dataset.id;
                const nombre = btnToggle.closest('.agente-card').querySelector('h3').textContent;
                const activoActual = btnToggle.dataset.activo === 'true';
                await toggleAgente(id, nombre, activoActual);
                return;
            }

            const btnBorrar = e.target.closest('.btn-borrar-agente');
            if (btnBorrar) {
                const id = btnBorrar.dataset.id;
                const nombre = btnBorrar.dataset.nombre;
                await borrarAgente(id, nombre);
            }
        });
    }
});
