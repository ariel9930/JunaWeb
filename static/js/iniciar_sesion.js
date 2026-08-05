// Base de datos de usuarios predeterminados
const usuariosEstaticos = {
    "20.123.456-K": { nombre: "Dante Canales", rut: "20.123.456-K", rol: "alumno", rolNombre: "Estudiante", curso: "4° Medio B" },
    "18.765.432-1": { nombre: "Danny Hernández", rut: "18.765.432-1", rol: "admin", rolNombre: "Supervisor PAE", curso: "Administración" },
    "15.432.198-7": { nombre: "María José Torres", rut: "15.432.198-7", rol: "director", rolNombre: "Directora / Cocina", curso: "Dirección PAE" }
};

document.addEventListener('DOMContentLoaded', () => {
    const inputRut = document.getElementById('login-rut');

    // Identificación dinámica en tiempo real
    if (inputRut) {
        inputRut.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/[^0-9.\-kK]/g, '');
            const rutIngresado = e.target.value.trim().toUpperCase();

            const usuariosNuevos = JSON.parse(localStorage.getItem('usuariosRegistradosPAE') || '{}');
            const usuarioEncontrado = usuariosEstaticos[rutIngresado] || usuariosNuevos[rutIngresado];

            const elemNombre = document.getElementById('info-nombre');
            const elemRut = document.getElementById('info-rut');
            const elemRol = document.getElementById('info-rol');
            const elemCurso = document.getElementById('info-curso');

            if (usuarioEncontrado) {
                if (elemNombre) elemNombre.innerText = usuarioEncontrado.nombre;
                if (elemRut) elemRut.innerText = usuarioEncontrado.rut || rutIngresado;
                if (elemRol) elemRol.innerText = usuarioEncontrado.rolNombre;
                if (elemCurso) elemCurso.innerText = usuarioEncontrado.curso;
            } else {
                if (elemNombre) elemNombre.innerText = "— Por identificar —";
                if (elemRut) elemRut.innerText = "—";
                if (elemRol) elemRol.innerText = "—";
                if (elemCurso) elemCurso.innerText = "—";
            }
        });
    }
});

function procesarLogin(event) {
    if (event) event.preventDefault();

    const rutInput = document.getElementById('login-rut');
    const passInput = document.getElementById('login-password');
    const alerta = document.getElementById('login-alert');

    if (!rutInput || !passInput) return false;

    const rut = rutInput.value.trim().toUpperCase();
    const clave = passInput.value.trim();

    const usuariosNuevos = JSON.parse(localStorage.getItem('usuariosRegistradosPAE') || '{}');
    const contrasenasGuardadas = JSON.parse(localStorage.getItem('contrasenasPAE') || '{}');

    // Buscar si existe el usuario
    const usuario = usuariosEstaticos[rut] || usuariosNuevos[rut];

    if (!usuario) {
        if (alerta) {
            alerta.className = 'alert alert-danger py-2 mb-3 font-inter xsmall text-center';
            alerta.innerText = 'RUT no registrado en el sistema PAE.';
            alerta.classList.remove('d-none');
        }
        return false;
    }

    // Contraseña maestra por defecto o la guardada en localStorage
    const claveEsperada = contrasenasGuardadas[rut] || "676767";

    if (clave !== claveEsperada && clave !== "676767") {
        if (alerta) {
            alerta.className = 'alert alert-danger py-2 mb-3 font-inter xsmall text-center';
            alerta.innerText = 'Contraseña incorrecta. (Usa: 676767)';
            alerta.classList.remove('d-none');
        }
        return false;
    }

    // Iniciar sesión
    localStorage.setItem('usuarioJunaWeb', JSON.stringify(usuario));

    if (alerta) {
        alerta.className = 'alert alert-success py-2 mb-3 font-inter xsmall text-center';
        alerta.innerText = `¡Bienvenido/a, ${usuario.nombre}! Ingresando...`;
        alerta.classList.remove('d-none');
    }

    setTimeout(() => {
        window.location.href = '../index.html';
    }, 800);

    return false;
}