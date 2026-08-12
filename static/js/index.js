let html5QrcodeScanner = null;
let modalQRInstance = null;
let temporizadorAlertaQR = null;
let escaneoEnPausa = false;

document.addEventListener('DOMContentLoaded', () => {
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

// FUNCIÓN PARA GENERAR SONIDOS DE VALIDACIÓN Y ALERTA
function emitirSonido(tipo) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        
        const audioCtx = new AudioCtx();

        // Asegurar que el contexto de audio esté activo
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // 1. SONIDO DE ÉXITO (Un solo beep agudo de 880 Hz)
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
        } 
        // 2. SONIDO DE ALERTA (3 beeps graves de 350 Hz repetidos)
        else if (tipo === 'alerta') {
            const tiempos = [0, 0.12, 0.24]; // Tiempos de inicio para los 3 pitidos

            tiempos.forEach((inicio) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = "sawtooth"; // Onda tipo sierra para sonar como alarma
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

// FUNCIÓN QUE REINICIA TODO EL PANEL Y RESERVAS CADA 20 HORAS
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

            const resultContainer = document.getElementById('scanned-result');
            if (!resultContainer) return;

            escaneoEnPausa = true;
            resultContainer.style.display = 'block';

            const partes = decodedText.split(':');
            
            if (partes.length < 4) {
                resultContainer.className = "alert alert-warning text-center font-inter xsmall mb-0";
                resultContainer.innerHTML = "⚠️ Código QR con formato inválido o expirado.";
                
                setTimeout(() => {
                    resultContainer.style.display = 'none';
                    escaneoEnPausa = false;
                }, 1500);
                return;
            }

            const rutUser = partes[1];
            const nombreUsuario = partes[2];
            const bloqueQR = partes[3];

            const idUnicoEscaneo = `${rutUser}_${bloqueQR}`;
            let listaEscaneados = JSON.parse(localStorage.getItem('escaneadosHoyPAE') || '[]');

            // --- ESCANEO REPETIDO (ALERTA) ---
            if (listaEscaneados.includes(idUnicoEscaneo)) {
                // Sonido de alerta triple
                emitirSonido('alerta');

                resultContainer.className = "alert alert-danger text-center font-inter fw-bold xsmall mb-0";
                resultContainer.innerHTML = `⚠️ ¡ALERTA! El pase de <strong>${nombreUsuario}</strong> ya fue registrado para este turno.`;
                
                setTimeout(() => {
                    resultContainer.style.display = 'none';
                    escaneoEnPausa = false;
                }, 2000);
                return;
            }

            // --- ESCANEO EXITOSO (ACCESO CONCEDIDO) ---
            // Sonido de pitido simple
            emitirSonido('exito');

            listaEscaneados.push(idUnicoEscaneo);
            localStorage.setItem('escaneadosHoyPAE', JSON.stringify(listaEscaneados));

            resultContainer.className = "alert alert-success text-center text-dark font-inter fw-bold xsmall mb-0";
            resultContainer.innerHTML = `✅ ACCESO CONCEDIDO: ${nombreUsuario}`;

            let entregados = parseInt(localStorage.getItem('entregadosPAE') || '0');
            let total = parseInt(localStorage.getItem('racionesPAE') || '0');
            
            if (entregados < total) {
                entregados += 1;
                localStorage.setItem('entregadosPAE', entregados.toString());
                actualizarContadorRaciones();
            }

            setTimeout(() => {
                resultContainer.style.display = 'none';
                escaneoEnPausa = false;
            }, 1500);

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
            await mostrarAlertaEstetica('Acceso No Requerido', 'Tu perfil no requiere realizar reserva de almuerzo.', 'ℹ️');
            return;
        }

        const rutUser = usuario.rutLimpio || usuario.rut;
        const reservasHechas = JSON.parse(localStorage.getItem('reservasUsuariosPAE') || '{}');

        const previewVisita = document.getElementById('preview-visita');
        const tarjetaQR = document.getElementById('tarjeta-qr-usuario');

        if (reservasHechas[rutUser]) {
            await mostrarAlertaEstetica('Reserva Ya Realizada', `¡Hola ${usuario.nombre}! Ya reservaste tu almuerzo. Tu código QR se encuentra disponible en pantalla.`, '🍱');
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

            await mostrarAlertaEstetica('¡Reserva Confirmada!', `🎉 ¡Excelente, ${usuario.nombre}! Tu cupo ha sido reservado con éxito.`, '✅');
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

        await mostrarAlertaEstetica('Reinicio Completado', 'Las raciones y reservas del día han sido reiniciadas a cero.', '🔄');
    } else {
        await mostrarAlertaEstetica('Clave Incorrecta', 'No tienes permisos de autorización para realizar esta acción.', '❌');
    }
}






/* Cambios de prueba */

// --- SISTEMA DE ALERTAS ESTÉTICAS CENTRADAS ---
function mostrarAlertaEstetica(titulo, mensaje, icono = '🔔') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        
        overlay.innerHTML = `
            <div class="custom-alert-box">
                <div class="custom-alert-icon">${icono}</div>
                <div class="custom-alert-title text-white">${titulo}</div>
                <div class="custom-alert-message">${mensaje}</div>
                <button id="btn-cerrar-alerta" class="btn btn-custom-primary w-100 py-2 font-poppins fw-bold glow-btn">
                    Aceptar
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-cerrar-alerta').addEventListener('click', () => {
            overlay.remove();
            resolve();
        });
    });
}

// --- PROMPT PERSONALIZADO PARA CLAVE DE REINICIO ---
function mostrarPromptEstetico(titulo, mensaje) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';

        overlay.innerHTML = `
            <div class="custom-alert-box">
                <div class="custom-alert-icon">🔒</div>
                <div class="custom-alert-title text-white">${titulo}</div>
                <div class="custom-alert-message">${mensaje}</div>
                <input type="password" id="input-prompt-clave" class="form-control custom-input mb-3 text-center" placeholder="••••" maxlength="10">
                <div class="d-flex gap-2">
                    <button id="btn-cancelar-prompt" class="btn btn-custom-outline w-50 py-2 font-poppins fw-bold xsmall">Cancelar</button>
                    <button id="btn-aceptar-prompt" class="btn btn-custom-primary w-50 py-2 font-poppins fw-bold glow-btn xsmall">Confirmar</button>
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

// --- ALERTA CENTRADA ESTILO JUNAWEB ---
function mostrarAlertaEstetica(titulo, mensaje, textoBoton = "CERRAR Y VER QR") {
    return new Promise((resolve) => {
        // Eliminar cualquier alerta existente
        const alertaExistente = document.querySelector('.custom-alert-overlay');
        if (alertaExistente) alertaExistente.remove();

        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        
        overlay.innerHTML = `
            <div class="custom-alert-box">
                <div class="custom-alert-shield-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        <path d="M9 12l2 2 4-4"></path>
                    </svg>
                </div>
                <h3 class="custom-alert-title">${titulo}</h3>
                <p class="custom-alert-message">${mensaje}</p>
                <button id="btn-cerrar-alerta" class="btn-alert-confirm">
                    ${textoBoton}
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-cerrar-alerta').addEventListener('click', () => {
            overlay.remove();
            resolve();
        });
    });
}

async function confirmarReservaEjemplo() {
    await mostrarAlertaEstetica(
        "Reserva Confirmada",
        "Tu cupo para el Programa de Alimentación Escolar (PAE) ha sido reservado con éxito para el turno de hoy.",
        "CERRAR Y VER QR"
    );
}

function mostrarAlertaEstetica(titulo, mensaje, textoBoton = "Aceptar") {
    return new Promise((resolve) => {
        // Eliminar alerta previa si existe
        const antigua = document.getElementById('junaweb-modal-alerta');
        if (antigua) antigua.remove();

        const overlay = document.createElement('div');
        overlay.id = 'junaweb-modal-alerta';
        overlay.className = 'custom-alert-overlay';
        
        overlay.innerHTML = `
            <div class="custom-alert-box">
                <div class="custom-alert-shield-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        <path d="M9 12l2 2 4-4"></path>
                    </svg>
                </div>
                <h3 class="custom-alert-title">${titulo}</h3>
                <p class="custom-alert-message">${mensaje}</p>
                <button id="btn-cerrar-alerta" class="btn-alert-confirm">${textoBoton}</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.classList.add('modal-open');

        document.getElementById('btn-cerrar-alerta').onclick = () => {
            overlay.remove();
            document.body.classList.remove('modal-open');
            resolve();
        };
    });
}