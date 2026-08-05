let html5QrcodeScanner = null;

document.addEventListener('DOMContentLoaded', () => {
    // Si no hay nadie o es la primera vez, se inicia en 0
    if (!localStorage.getItem('racionesPAE')) {
        localStorage.setItem('racionesPAE', '0');
    }
    if (!localStorage.getItem('entregadosPAE')) {
        localStorage.setItem('entregadosPAE', '0');
    }
    verificarEstadoSesion();
});

function obtenerIniciales(nombre) {
    if (!nombre) return "--";
    const partes = nombre.trim().split(" ");
    if (partes.length >= 2) {
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0][0].toUpperCase();
}

function verificarEstadoSesion() {
    const usuarioGuardado = localStorage.getItem('usuarioJunaWeb');

    const previewVisita = document.getElementById('preview-visita');
    const tarjetaQR = document.getElementById('tarjeta-qr-usuario');
    const tarjetaSupervisor = document.getElementById('tarjeta-supervisor-camara');
    const tarjetaDireccion = document.getElementById('tarjeta-direccion-pae');
    const tarjetaPerfilInferior = document.getElementById('perfil-usuario-main');

    // Cargar y mostrar las raciones reales acumuladas
    actualizarContadorRaciones();

    if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado);

        if (previewVisita) previewVisita.classList.add('d-none');

        // 1. SI ES MARÍA JOSÉ TORRES (Directora / Cocina)
        if (usuario.rol === 'director') {
            if (tarjetaQR) tarjetaQR.classList.add('d-none');
            if (tarjetaSupervisor) tarjetaSupervisor.classList.add('d-none');
            if (tarjetaDireccion) tarjetaDireccion.classList.remove('d-none');
        } 
        // 2. SI ES DANNY HERNÁNDEZ (Supervisor / Cámara)
        else if (usuario.rol === 'admin') {
            if (tarjetaQR) tarjetaQR.classList.add('d-none');
            if (tarjetaDireccion) tarjetaDireccion.classList.add('d-none');
            if (tarjetaSupervisor) {
                tarjetaSupervisor.classList.remove('d-none');
                iniciarCamaraQR();
            }
        } 
        // 3. SI ES ESTUDIANTE (Dante Canales o nuevos registrados)
        else {
            if (tarjetaSupervisor) tarjetaSupervisor.classList.add('d-none');
            if (tarjetaDireccion) tarjetaDireccion.classList.add('d-none');
            if (tarjetaQR) {
                document.getElementById('qr-nombre-usuario').innerText = usuario.nombre;
                document.getElementById('qr-rol-usuario').innerText = usuario.rolNombre || "Estudiante";
                document.getElementById('qr-avatar-usuario').innerText = obtenerIniciales(usuario.nombre);
                tarjetaQR.classList.remove('d-none');
            }
        }

        // Cargar datos del perfil abajo
        if (tarjetaPerfilInferior) {
            document.getElementById('main-nombre').innerText = usuario.nombre;
            document.getElementById('main-rut').innerText = usuario.rut;
            document.getElementById('main-rol').innerText = usuario.rolNombre || "Estudiante";
            document.getElementById('main-curso').innerText = usuario.curso || "Estudiante";
            document.getElementById('main-avatar').innerText = obtenerIniciales(usuario.nombre);
            tarjetaPerfilInferior.classList.remove('d-none');
        }

    } else {
        if (previewVisita) previewVisita.classList.remove('d-none');
        if (tarjetaQR) tarjetaQR.classList.add('d-none');
        if (tarjetaSupervisor) tarjetaSupervisor.classList.add('d-none');
        if (tarjetaDireccion) tarjetaDireccion.classList.add('d-none');
        if (tarjetaPerfilInferior) tarjetaPerfilInferior.classList.add('d-none');
    }
}

// Actualizar el número de raciones en el panel de María José Torres
function actualizarContadorRaciones() {
    const totalRaciones = parseInt(localStorage.getItem('racionesPAE') || '0');
    const entregados = parseInt(localStorage.getItem('entregadosPAE') || '0');

    const elemTotal = document.getElementById('total-raciones-hoy');
    const elemEntregados = document.getElementById('entregados-raciones');

    if (elemTotal) elemTotal.innerText = totalRaciones;
    if (elemEntregados) elemEntregados.innerText = `${entregados} / ${totalRaciones}`;

    // Actualizar barra de progreso dinámicamente según lo entregado/solicitado
    const progressBar = document.querySelector('#tarjeta-direccion-pae .progress-bar');
    if (progressBar) {
        const porcentaje = totalRaciones > 0 ? Math.round((entregados / totalRaciones) * 100) : 0;
        progressBar.style.width = `${porcentaje}%`;
    }
}

// FUNCIONALIDAD DE LA CÁMARA PAE
function iniciarCamaraQR() {
    if (html5QrcodeScanner) return;

    html5QrcodeScanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 220, height: 220 } 
    });

    html5QrcodeScanner.render((decodedText, decodedResult) => {
        const resultContainer = document.getElementById('scanned-result');
        if (resultContainer) {
            resultContainer.className = "alert alert-success text-center text-dark font-inter fw-bold xsmall mb-0";
            resultContainer.innerHTML = `✅ ACCESO CONCEDIDO: ${decodedText}`;

            // Incrementar entregas cuando se escanea
            let entregados = parseInt(localStorage.getItem('entregadosPAE') || '0');
            let total = parseInt(localStorage.getItem('racionesPAE') || '0');
            if (entregados < total) {
                entregados += 1;
                localStorage.setItem('entregadosPAE', entregados.toString());
                actualizarContadorRaciones();
            }
        }
    }, (errorMessage) => {
        // En búsqueda activa de código...
    });
}

function cerrarSesion() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => console.error(error));
        html5QrcodeScanner = null;
    }
    localStorage.removeItem('usuarioJunaWeb');
    window.location.reload();
}

// RESERVAR RACIÓN (SUMA +1 AL TOTAL REAL)
function intentarReservar() {
    const usuarioGuardado = localStorage.getItem('usuarioJunaWeb');

    if (!usuarioGuardado) {
        const alerta = document.getElementById('alerta-reserva');
        if (alerta) {
            alerta.classList.remove('d-none');
            setTimeout(() => {
                window.location.href = 'page/iniciar_sesion.html';
            }, 1500);
        }
    } else {
        const usuario = JSON.parse(usuarioGuardado);

        if (usuario.rol === 'admin' || usuario.rol === 'director') {
            alert(`El perfil de ${usuario.rolNombre} no requiere reserva de almuerzo.`);
            return;
        }

        const reservasHechas = JSON.parse(localStorage.getItem('reservasUsuariosPAE') || '{}');

        // Si ya reservó este usuario
        if (reservasHechas[usuario.rut]) {
            alert(`¡Hola ${usuario.nombre}! Ya tienes tu ración reservada para el día de hoy. 🍱`);
        } else {
            reservasHechas[usuario.rut] = true;
            localStorage.setItem('reservasUsuariosPAE', JSON.stringify(reservasHechas));

            // Incrementar +1 al contador real partiendo de 0
            let totalActual = parseInt(localStorage.getItem('racionesPAE') || '0');
            totalActual += 1;
            localStorage.setItem('racionesPAE', totalActual.toString());

            actualizarContadorRaciones();
            alert(`🎉 ¡Excelente, ${usuario.nombre}! Tu reserva ha sido confirmada. Ración #${totalActual} registrada.`);
        }
    }
}

// BOTÓN OPCIONAL PARA REINICIAR TODO A 0 CUANDO QUIERAS
function reiniciarContadoresSistema() {
    localStorage.setItem('racionesPAE', '0');
    localStorage.setItem('entregadosPAE', '0');
    localStorage.removeItem('reservasUsuariosPAE');
    actualizarContadorRaciones();
    alert("El sistema de raciones se ha reseteado a 0.");
}