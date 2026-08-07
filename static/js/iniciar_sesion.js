document.addEventListener("DOMContentLoaded", () => {
    // 1. Carga obligatoria de las 3 cuentas predeterminadas
    cargarCuentasPredeterminadas();

    const loginRut = document.getElementById("login-rut");
    if (loginRut) {
        // Escucha mientras el usuario escribe para autorellenar la ficha
        loginRut.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^0-9kK\.\,-]/g, '');
            buscarYMostrarFicha(e.target.value);
        });

        // Si el campo ya tiene texto al cargar (por ejemplo si el navegador autocompleta)
        if (loginRut.value) {
            buscarYMostrarFicha(loginRut.value);
        }
    }
});

// Carga directa de las 3 cuentas exigidas
function cargarCuentasPredeterminadas() {
    const cuentasBase = [
        {
            nombre: "Dante Canales",
            rutOriginal: "20.123.456-K",
            rutLimpio: "20123456K",
            curso: "3°C",
            rol: "Estudiante",
            password: "676767"
        },
        {
            nombre: "Danny Hernández",
            rutOriginal: "18.765.432-1",
            rutLimpio: "187654321",
            curso: "Supervisión PAE",
            rol: "Supervisor (Escanear / Validar)",
            password: "676767"
        },
        {
            nombre: "María José Torres",
            rutOriginal: "15.432.198-7",
            rutLimpio: "154321987",
            curso: "Cocina / Comedor",
            rol: "Directora / Cocina (Contador de raciones)",
            password: "676767"
        }
    ];

    let usuariosGuardados = JSON.parse(localStorage.getItem("junaweb_usuarios")) || [];

    // Fusionar o reescribir las cuentas base para asegurar que siempre estén
    cuentasBase.forEach(cuentaBase => {
        const existeIndex = usuariosGuardados.findIndex(u => u.rutLimpio === cuentaBase.rutLimpio);
        if (existeIndex !== -1) {
            usuariosGuardados[existeIndex] = cuentaBase; // Actualiza si ya existía
        } else {
            usuariosGuardados.push(cuentaBase); // Agrega si no estaba
        }
    });

    localStorage.setItem("junaweb_usuarios", JSON.stringify(usuariosGuardados));
}

// Busca y rellena la Ficha de Identificación en pantalla
function buscarYMostrarFicha(rutTexto) {
    const rutLimpio = rutTexto.replace(/[^0-9kK]/g, '').toUpperCase();
    const usuarios = JSON.parse(localStorage.getItem("junaweb_usuarios")) || [];

    const usuarioEncontrado = usuarios.find(u => u.rutLimpio === rutLimpio);

    const infoNombre = document.getElementById("info-nombre");
    const infoRut = document.getElementById("info-rut");
    const infoRol = document.getElementById("info-rol");
    const infoCurso = document.getElementById("info-curso");

    if (usuarioEncontrado) {
        if (infoNombre) infoNombre.textContent = usuarioEncontrado.nombre;
        if (infoRut) infoRut.textContent = usuarioEncontrado.rutOriginal;
        if (infoRol) infoRol.textContent = usuarioEncontrado.rol;
        if (infoCurso) infoCurso.textContent = usuarioEncontrado.curso;
    } else {
        if (infoNombre) infoNombre.textContent = "— Por identificar —";
        if (infoRut) infoRut.textContent = "—";
        if (infoRol) infoRol.textContent = "—";
        if (infoCurso) infoCurso.textContent = "—";
    }
}

// Procesa el inicio de sesión
function procesarLogin(event) {
    event.preventDefault();

    const alertBox = document.getElementById("login-alert");
    const rutInput = document.getElementById("login-rut").value.trim();
    const passInput = document.getElementById("login-password").value.trim();

    const rutLimpio = rutInput.replace(/[^0-9kK]/g, '').toUpperCase();
    const usuarios = JSON.parse(localStorage.getItem("junaweb_usuarios")) || [];

    const usuarioValido = usuarios.find(u => u.rutLimpio === rutLimpio && u.password === passInput);

    if (usuarioValido) {
        mostrarAlerta(alertBox, `¡Bienvenido/a, ${usuarioValido.nombre}!`, "alert-success");

        // Guardar la sesión en ambas claves para asegurar compatibilidad total
        localStorage.setItem("junaweb_sesion_activa", JSON.stringify(usuarioValido));
        localStorage.setItem("usuarioJunaWeb", JSON.stringify(usuarioValido));

        setTimeout(() => {
            window.location.href = "../index.html";
        }, 1200);
    } else {
        mostrarAlerta(alertBox, "RUT o Contraseña incorrectos.", "alert-danger");
    }
}

function mostrarAlerta(box, mensaje, tipo) {
    if (!box) return;
    box.className = `alert ${tipo} py-2 mb-3 font-inter xsmall text-center`;
    box.textContent = mensaje;
    box.classList.remove("d-none");
}