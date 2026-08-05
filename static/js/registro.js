const baseDeDatosPAE = {
    "20.123.456-K": "Dante Canales",
    "18.765.432-1": "Danny Hernández",
    "15.432.198-7": "María José Torres"
};

function filtrarRut(input) {
    input.value = input.value.replace(/[^0-9.\-kK]/g, '');
}

function procesarRegistro(event) {
    event.preventDefault();

    const nombre = document.getElementById('registro-nombre').value.trim();
    const rut = document.getElementById('registro-rut').value.trim().toUpperCase();
    const curso = document.getElementById('registro-curso').value;
    const clave = document.getElementById('registro-password').value.trim();
    const alerta = document.getElementById('registro-alert');

    if (!nombre || !rut || !curso || !clave) {
        alerta.className = 'alert alert-warning py-2 mb-3 font-inter xsmall text-center';
        alerta.innerText = 'Por favor, completa todos los campos del formulario.';
        alerta.classList.remove('d-none');
        return;
    }

    if (clave.length < 4) {
        alerta.className = 'alert alert-warning py-2 mb-3 font-inter xsmall text-center';
        alerta.innerText = '⚠️ La contraseña debe tener mínimo 4 números.';
        alerta.classList.remove('d-none');
        return;
    }

    const usuariosRegistrados = JSON.parse(localStorage.getItem('usuariosRegistradosPAE') || '{}');
    const contrasenasGuardadas = JSON.parse(localStorage.getItem('contrasenasPAE') || '{}');

    if (baseDeDatosPAE[rut] || usuariosRegistrados[rut]) {
        alerta.className = 'alert alert-danger py-2 mb-3 font-inter xsmall text-center';
        alerta.innerText = 'Esta cuenta ya está creada. Por favor, dirígete a Iniciar Sesión.';
        alerta.classList.remove('d-none');
        return;
    }

    const nuevoUsuario = {
        nombre: nombre,
        rut: rut,
        rol: "alumno",
        rolNombre: "Estudiante",
        curso: curso
    };

    usuariosRegistrados[rut] = nuevoUsuario;
    localStorage.setItem('usuariosRegistradosPAE', JSON.stringify(usuariosRegistrados));

    contrasenasGuardadas[rut] = clave;
    localStorage.setItem('contrasenasPAE', JSON.stringify(contrasenasGuardadas));

    localStorage.setItem('usuarioJunaWeb', JSON.stringify(nuevoUsuario));

    let totalActual = parseInt(localStorage.getItem('racionesPAE') || '0');
    totalActual += 1;
    localStorage.setItem('racionesPAE', totalActual.toString());

    const reservasHechas = JSON.parse(localStorage.getItem('reservasUsuariosPAE') || '{}');
    reservasHechas[rut] = true;
    localStorage.setItem('reservasUsuariosPAE', JSON.stringify(reservasHechas));

    alerta.className = 'alert alert-success py-2 mb-3 font-inter xsmall text-center';
    alerta.innerText = `¡Cuenta creada con éxito! Redirigiendo...`;
    alerta.classList.remove('d-none');

    setTimeout(() => {
        window.location.href = '../index.html';
    }, 1200);
}