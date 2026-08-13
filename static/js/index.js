let html5QrcodeScanner = null;
let modalQRInstance = null;
let escaneoEnPausa = false;

document.addEventListener('DOMContentLoaded', () => {
    // Inyectar estilos visuales universales para todas las alertas flotantes
    inyectarEstilosPopup();

    // Verificar si ya pasaron 20 horas para reiniciar todos los contadores a 0
    verificarCiclo20Horas();

    if (!localStorage.getItem('racionesPAE')) {
        localStorage.setItem('racionesPAE', '0');
    }
    if (!localStorage.getItem('entregadosPAE')) {
        localStorage.setItem('entregadosPAE', '0');
    }
    if (!localStorage.getItem('escaneadosHoyPAE')) {
        localStorage.setItem('escaneadosHoyPAE', JSON.stringify([]));
    }
    verificarEstadoSesion();
});

// APAGADO AUTOMÁTICO DE CÁMARA AL CERRAR O NAVEGAR FUERA DE LA PÁGINA
window.addEventListener('beforeunload', () => {
    if (html5QrcodeScanner) {
        try {
            html5QrcodeScanner.clear().catch(err => console.error("Error al cerrar cámara:", err));
        } catch (e) {
            console.warn("Cámara ya liberada.", e);
        }
    }
});

// INYECCIÓN DINÁMICA DE ESTILOS CSS PARA MODALES Y ALERTAS FLOTANTES EN EL CENTRO
function inyectarEstilosPopup() {
    if (document.getElementById('css-popups-junaweb')) return;
    const style = document.createElement('style');
    style.id = 'css-popups-junaweb';
    style.innerHTML = `
        /* Overlay que oscurece la pantalla entera y centra el contenido */
        .custom-alert-overlay, .custom-popup-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.75) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 999999 !important;
            animation: fadeIn 0.25s ease-out;
        }

        /* Cajón modal elegante centrado */
        .custom-alert-box, .custom-popup-box {
            width: 90% !important;
            max-width: 420px !important;
            padding: 28px !important;
            border-radius: 20px !important;
            text-align: center !important;
            background: rgba(15, 23, 42, 0.95) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.15) !important;
            color: #ffffff !important;
        }

        .custom-alert-shield-icon {
            font-size: 2.8rem;
            margin-bottom: 12px;
            display: inline-block;
        }

        .custom-popup-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 0.85rem;
            letter-spacing: 0.5px;
        }

        .custom-popup-progress {
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            margin-top: 18px;
            overflow: hidden;
        }

        .custom-popup-bar {
            height: 100%;
            width: 100%;
            animation: shrinkProgress linear forwards;
        }

        @keyframes shrinkProgress { from { width: 100%; } to { width: 0%; } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
    `;
    document.head.appendChild(style);
}

// GENERADOR DE SONIDOS DE VALIDACIÓN
function emitirSonido(tipo) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (tipo === 'exito') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } else if (tipo === 'alerta') {
            [0, 0.12, 0.24].forEach((inicio) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(350, audioCtx.currentTime + inicio);

                gain.gain.setValueAtTime(0.2, audioCtx.currentTime + inicio);
                gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + inicio + 0.08);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(audioCtx.currentTime + inicio);
                osc.stop(audioCtx.currentTime + inicio + 0.08);
            });
        }
    } catch (e) {
        console.warn("No se pudo reproducir el efecto de sonido:", e);
    }
}

// REINICIO CADA 20 HORAS
function verificarCiclo20Horas() {
    const tiempo20HorasMS = 20 * 60 * 60 * 1000;
    const ahora = Date.now();
    const ultimaActualizacion = localStorage.getItem('ultimaActualizacionPAE');

    if (!ultimaActualizacion || (ahora - parseInt(ultimaActualizacion, 10)) >= tiempo20HorasMS) {
        localStorage.setItem('racionesPAE', '0');
        localStorage.setItem('entregadosPAE', '0');
        localStorage.setItem('escaneadosHoyPAE', JSON.stringify([]));
        localStorage.setItem('reservasUsuariosPAE', JSON.stringify({}));
        localStorage.setItem('ultimaActualizacionPAE', ahora.toString());
    }
}

function obtenerBloqueHorario() {
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const bloqueHoras = Math.floor(ahora.getHours() / 5);
    return `${fecha}-B${bloqueHoras}`;
}

function obtenerIniciales(nombre) {
    if (!nombre) return "--";
    const partes = nombre.trim().split(" ");
    if (partes.length >= 2) {
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0][0].toUpperCase();
}

function verificarEstadoSesion() {
    const usuarioRaw = localStorage.getItem('usuarioJunaWeb') || localStorage.getItem('junaweb_sesion_activa');

    const previewVisita = document.getElementById('preview-visita');
    const tarjetaQR = document.getElementById('tarjeta-qr-usuario');
    const tarjetaSupervisor = document.getElementById('tarjeta-supervisor-camara');
    const tarjetaDireccion = document.getElementById('tarjeta-direccion-pae');
    const tarjetaPerfilInferior = document.getElementById('perfil-usuario-main');
    const headerButtons = document.getElementById('header-buttons');

    actualizarContadorRaciones();

    if (usuarioRaw) {
        const usuario = JSON.parse(usuarioRaw);

        if (headerButtons) headerButtons.classList.add('d-none');

        const rolLower = (usuario.rol || '').toLowerCase();

        if (rolLower.includes('director') || rolLower.includes('cocina')) {
            if (previewVisita) previewVisita.classList.add('d-none');
            if (tarjetaQR) tarjetaQR.classList.add('d-none');
            if (tarjetaSupervisor) tarjetaSupervisor.classList.add('d-none');
            if (tarjetaDireccion) tarjetaDireccion.classList.remove('d-none');
        } 
        else if (rolLower.includes('admin') || rolLower.includes('supervisor')) {
            if (previewVisita) previewVisita.classList.add('d-none');
            if (tarjetaQR) tarjetaQR.classList.add('d-none');
            if (tarjetaDireccion) tarjetaDireccion.classList.add('d-none');
            if (tarjetaSupervisor) {
                tarjetaSupervisor.classList.remove('d-none');
                iniciarCamaraQR();
            }
        } 
        else {
            if (tarjetaSupervisor) tarjetaSupervisor.classList.add('d-none');
            if (tarjetaDireccion) tarjetaDireccion.classList.add('d-none');

            const rutUser = usuario.rutLimpio || usuario.rut;
            const reservasHechas = JSON.parse(localStorage.getItem('reservasUsuariosPAE') || '{}');

            if (reservasHechas[rutUser]) {
                if (previewVisita) previewVisita.classList.add('d-none');
                
                if (tarjetaQR) {
                    tarjetaQR.classList.remove('d-none');
                    const elemNombre = document.getElementById('qr-nombre-usuario');
                    const elemRol = document.getElementById('qr-rol-usuario');
                    const elemAvatar = document.getElementById('qr-avatar-usuario');

                    if (elemNombre) elemNombre.innerText = usuario.nombre;
                    if (elemRol) elemRol.innerText = usuario.rolNombre || usuario.rol || "Estudiante";
                    if (elemAvatar) elemAvatar.innerText = obtenerIniciales(usuario.nombre);

                    generarCodigoQR(usuario);
                }
            } else {
                if (tarjetaQR) tarjetaQR.classList.add('d-none');
                if (previewVisita) previewVisita.classList.remove('d-none');
            }
        }

        if (tarjetaPerfilInferior) {
            const mNombre = document.getElementById('main-nombre');
            const mRut = document.getElementById('main-rut');
            const mRol = document.getElementById('main-rol');
            const mCurso = document.getElementById('main-curso');
            const mAvatar = document.getElementById('main-avatar');

            if (mNombre) mNombre.innerText = usuario.nombre;
            if (mRut) mRut.innerText = usuario.rutOriginal || usuario.rut || "--";
            if (mRol) mRol.innerText = usuario.rolNombre || usuario.rol || "Estudiante";
            if (mCurso) mCurso.innerText = usuario.curso || "Estudiante";
            if (mAvatar) mAvatar.innerText = obtenerIniciales(usuario.nombre);

            tarjetaPerfilInferior.classList.remove('d-none');
        }

    } else {
        if (previewVisita) previewVisita.classList.remove('d-none');
        if (headerButtons) headerButtons.classList.remove('d-none');
        if (tarjetaQR) tarjetaQR.classList.add('d-none');
        if (tarjetaSupervisor) tarjetaSupervisor.classList.add('d-none');
        if (tarjetaDireccion) tarjetaDireccion.classList.add('d-none');
        if (tarjetaPerfilInferior) tarjetaPerfilInferior.classList.add('d-none');
    }
}

function generarCodigoQR(usuario) {
    const qrContainer = document.getElementById('qr-code-placeholder');
    if (!qrContainer) return;

    qrContainer.innerHTML = "";

    const rutText = usuario.rutLimpio || usuario.rut || "SIN-RUT";
    const bloque = obtenerBloqueHorario();
    const payloadQR = `PAE-PASE:${rutText}:${usuario.nombre}:${bloque}`;

    try {
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: payloadQR,
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    } catch (e) {
        console.error("Error al generar el QR:", e);
    }
}

function abrirModalQR() {
    const usuarioRaw = localStorage.getItem('usuarioJunaWeb') || localStorage.getItem('junaweb_sesion_activa');
    if (!usuarioRaw) return;

    const usuario = JSON.parse(usuarioRaw);
    const modalElement = document.getElementById('modalQR');
    
    const elemModalNombre = document.getElementById('modal-qr-nombre');
    const elemModalRut = document.getElementById('modal-qr-rut');
    if (elemModalNombre) elemModalNombre.innerText = usuario.nombre;
    if (elemModalRut) elemModalRut.innerText = `RUT: ${usuario.rutOriginal || usuario.rut}`;

    const containerModalQR = document.getElementById('qr-code-modal');
    if (containerModalQR) {
        containerModalQR.innerHTML = "";
        const rutText = usuario.rutLimpio || usuario.rut || "SIN-RUT";
        const bloque = obtenerBloqueHorario();
        const payloadQR = `PAE-PASE:${rutText}:${usuario.nombre}:${bloque}`;

        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(containerModalQR, {
                    text: payloadQR,
                    width: 250,
                    height: 250,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    if (modalElement && typeof bootstrap !== 'undefined') {
        if (!modalQRInstance) {
            modalQRInstance = new bootstrap.Modal(modalElement);
        }
        modalQRInstance.show();
    }
}

function actualizarContadorRaciones() {
    const totalRaciones = parseInt(localStorage.getItem('racionesPAE') || '0');
    const entregados = parseInt(localStorage.getItem('entregadosPAE') || '0');

    const elemTotal = document.getElementById('total-raciones-hoy');
    const elemEntregados = document.getElementById('entregados-raciones');

    if (elemTotal) elemTotal.innerText = totalRaciones;
    if (elemEntregados) elemEntregados.innerText = `${entregados} / ${totalRaciones}`;

    const progressBar = document.querySelector('#tarjeta-direccion-pae .progress-bar');
    if (progressBar) {
        const porcentaje = totalRaciones > 0 ? Math.round((entregados / totalRaciones) * 100) : 0;
        progressBar.style.width = `${porcentaje}%`;
    }
}

// INICIO Y LOGICA CONTINUA DEL LECTOR QR
function iniciarCamaraQR() {
    if (html5QrcodeScanner) return;

    if (!document.getElementById('css-camera-fix')) {
        const style = document.createElement('style');
        style.id = 'css-camera-fix';
        style.innerHTML = `
            #reader video, #reader canvas {
                transform: scaleX(-1) !important;
                -webkit-transform: scaleX(-1) !important;
                -moz-transform: scaleX(-1) !important;
                -ms-transform: scaleX(-1) !important;
            }
        `;
        document.head.appendChild(style);
    }

    if (typeof Html5QrcodeScanner !== 'undefined') {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { 
            fps: 10, 
            qrbox: { width: 220, height: 220 } 
        });

        html5QrcodeScanner.render((decodedText) => {
            if (escaneoEnPausa) return;
            escaneoEnPausa = true;

            const DURACION_ALERTA_MS = 2500;
            const partes = decodedText.split(':');

            if (partes.length < 4 || partes[0] !== 'PAE-PASE') {
                emitirSonido('alerta');
                mostrarPopupEscaneo('invalido', 'Código QR no válido o desactualizado.', DURACION_ALERTA_MS);

                setTimeout(() => { escaneoEnPausa = false; }, DURACION_ALERTA_MS);
                return;
            }

            const rutUser = partes[1];
            const nombreUsuario = partes[2];
            const bloqueQR = partes[3];

            const idUnicoEscaneo = `${rutUser}_${bloqueQR}`;
            let listaEscaneados = JSON.parse(localStorage.getItem('escaneadosHoyPAE') || '[]');

            if (listaEscaneados.includes(idUnicoEscaneo)) {
                emitirSonido('alerta');
                mostrarPopupEscaneo('alerta', `El pase de <strong>${nombreUsuario}</strong> ya fue registrado para este turno.`, DURACION_ALERTA_MS);

                setTimeout(() => { escaneoEnPausa = false; }, DURACION_ALERTA_MS);
                return;
            }

            emitirSonido('exito');
            listaEscaneados.push(idUnicoEscaneo);
            localStorage.setItem('escaneadosHoyPAE', JSON.stringify(listaEscaneados));

            mostrarPopupEscaneo('exito', `Acceso concedido para <strong>${nombreUsuario}</strong>.`, DURACION_ALERTA_MS);

            let entregados = parseInt(localStorage.getItem('entregadosPAE') || '0');
            let total = parseInt(localStorage.getItem('racionesPAE') || '0');
            
            if (entregados < total) {
                entregados += 1;
                localStorage.setItem('entregadosPAE', entregados.toString());
                actualizarContadorRaciones();
            }

            setTimeout(() => {
                escaneoEnPausa = false;
            }, DURACION_ALERTA_MS);

        }, (errorMessage) => {});
    }
}

function cerrarSesion() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => console.error(error));
        html5QrcodeScanner = null;
    }
    localStorage.removeItem('usuarioJunaWeb');
    localStorage.removeItem('junaweb_sesion_activa');
    window.location.reload();
}

async function intentarReservar() {
    const usuarioRaw = localStorage.getItem('usuarioJunaWeb') || localStorage.getItem('junaweb_sesion_activa');

    if (!usuarioRaw) {
        const alerta = document.getElementById('alerta-reserva');
        if (alerta) {
            alerta.classList.remove('d-none');
            setTimeout(() => {
                window.location.href = 'page/iniciar_sesion.html';
            }, 1500);
        }
    } else {
        const usuario = JSON.parse(usuarioRaw);
        const rolLower = (usuario.rol || '').toLowerCase();

        if (rolLower.includes('admin') || rolLower.includes('supervisor') || rolLower.includes('director')) {
            await mostrarAlertaEstetica('Acceso No Requerido', 'Tu perfil no requiere realizar reserva de almuerzo.', 'Aceptar', 'ℹ️');
            return;
        }

        const rutUser = usuario.rutLimpio || usuario.rut;
        const reservasHechas = JSON.parse(localStorage.getItem('reservasUsuariosPAE') || '{}');

        const previewVisita = document.getElementById('preview-visita');
        const tarjetaQR = document.getElementById('tarjeta-qr-usuario');

        if (reservasHechas[rutUser]) {
            await mostrarAlertaEstetica('Reserva Ya Realizada', `¡Hola <strong>${usuario.nombre}</strong>! Ya reservaste tu almuerzo. Tu código QR se encuentra disponible en pantalla.`, 'Aceptar', '🍱');
        } else {
            reservasHechas[rutUser] = true;
            localStorage.setItem('reservasUsuariosPAE', JSON.stringify(reservasHechas));

            let totalActual = parseInt(localStorage.getItem('racionesPAE') || '0');
            totalActual += 1;
            localStorage.setItem('racionesPAE', totalActual.toString());

            actualizarContadorRaciones();

            if (previewVisita) previewVisita.classList.add('d-none');
            if (tarjetaQR) {
                tarjetaQR.classList.remove('d-none');
                generarCodigoQR(usuario);
            }

            await mostrarAlertaEstetica('Reserva Confirmada', `¡Excelente, <strong>${usuario.nombre}</strong>! Tu cupo ha sido reservado con éxito.`, 'Aceptar', '✅');
        }
    }
}

async function reiniciarRacionesConClave() {
    const CLAVE_CORRECTA = "1234";

    const claveIngresada = await mostrarPromptEstetico("Autorización Requerida", "Ingrese la clave de administrador para reiniciar el contador de raciones:");

    if (claveIngresada === null) return;

    if (claveIngresada === CLAVE_CORRECTA) {
        localStorage.setItem('racionesPAE', '0');
        localStorage.setItem('entregadosPAE', '0');
        localStorage.setItem('escaneadosHoyPAE', JSON.stringify([]));
        localStorage.setItem('reservasUsuariosPAE', JSON.stringify({}));
        localStorage.setItem('ultimaActualizacionPAE', Date.now().toString());

        actualizarContadorRaciones();

        await mostrarAlertaEstetica('Reinicio Completado', 'Las raciones y reservas del día han sido reiniciadas a cero.', 'Aceptar', '🔄');
    } else {
        await mostrarAlertaEstetica('Clave Incorrecta', 'No tienes permisos de autorización para realizar esta acción.', 'Aceptar', '❌');
    }
}

function mostrarPromptEstetico(titulo, mensaje) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';

        overlay.innerHTML = `
            <div class="custom-alert-box">
                <div class="custom-alert-shield-icon">🔒</div>
                <div class="custom-alert-title text-white fw-bold mb-2">${titulo}</div>
                <div class="custom-alert-message mb-3 text-light">${mensaje}</div>
                <input type="password" id="input-prompt-clave" class="form-control text-center mb-3 bg-dark text-white border-secondary" placeholder="••••" maxlength="10" style="border-radius: 10px;">
                <div class="d-flex gap-2">
                    <button id="btn-cancelar-prompt" class="btn btn-outline-light w-50 py-2 fw-bold" style="border-radius: 10px;">Cancelar</button>
                    <button id="btn-aceptar-prompt" class="btn btn-success w-50 py-2 fw-bold" style="border-radius: 10px;">Confirmar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const input = document.getElementById('input-prompt-clave');
        input.focus();

        document.getElementById('btn-aceptar-prompt').addEventListener('click', () => {
            const valor = input.value;
            overlay.remove();
            resolve(valor);
        });

        document.getElementById('btn-cancelar-prompt').addEventListener('click', () => {
            overlay.remove();
            resolve(null);
        });
    });
}

// ALERTA EMERGENTE EN CENTRO DE PANTALLA
function mostrarAlertaEstetica(titulo, mensaje, textoBoton = "Aceptar", icono = "🛡️") {
    return new Promise((resolve) => {
        const antigua = document.getElementById('junaweb-modal-alerta');
        if (antigua) antigua.remove();

        const overlay = document.createElement('div');
        overlay.id = 'junaweb-modal-alerta';
        overlay.className = 'custom-alert-overlay';
        
        overlay.innerHTML = `
            <div class="custom-alert-box">
                <div class="custom-alert-shield-icon">${icono}</div>
                <h3 class="custom-alert-title text-white fw-bold h4 mb-2">${titulo}</h3>
                <p class="custom-alert-message text-light mb-4" style="opacity: 0.9; font-size: 0.95rem;">${mensaje}</p>
                <button id="btn-cerrar-alerta" class="btn btn-success w-100 py-2.5 fw-bold" style="border-radius: 12px; font-size: 0.9rem;">${textoBoton}</button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-cerrar-alerta').onclick = () => {
            overlay.remove();
            resolve();
        };
    });
}

// POPUP EMERGENTE TEMPORIZADO PARA ESCANEO DE QR
function mostrarPopupEscaneo(estado, mensajeHTML, duracionMs = 2500) {
    const previo = document.getElementById('junaweb-popup-escaneo');
    if (previo) previo.remove();

    const overlay = document.createElement('div');
    overlay.id = 'junaweb-popup-escaneo';
    overlay.className = 'custom-popup-overlay';

    const CONFIGS = {
        exito: { color: '#10b981', border: '#059669', bg: 'rgba(16, 185, 129, 0.2)', titulo: '✅ ACCESO CONCEDIDO' },
        alerta: { color: '#f59e0b', border: '#d97706', bg: 'rgba(245, 158, 11, 0.2)', titulo: '⚠️ PASE YA REGISTRADO' },
        invalido: { color: '#ef4444', border: '#dc2626', bg: 'rgba(239, 68, 68, 0.2)', titulo: '❌ CÓDIGO INVÁLIDO' }
    };

    const cfg = CONFIGS[estado] || CONFIGS.exito;

    overlay.innerHTML = `
        <div class="custom-popup-box" style="border-color: ${cfg.border}; border: 1px solid ${cfg.border};">
            <div class="custom-popup-badge" style="background: ${cfg.bg}; color: ${cfg.color}; border: 1px solid ${cfg.border};">
                ${cfg.titulo}
            </div>
            <div class="custom-popup-body text-white mt-3 fs-6">
                ${mensajeHTML}
            </div>
            <div class="custom-popup-progress">
                <div class="custom-popup-bar" style="background: ${cfg.color}; animation-duration: ${duracionMs}ms;"></div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.remove();
        }
    }, duracionMs);
}