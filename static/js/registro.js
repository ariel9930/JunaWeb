document.addEventListener("DOMContentLoaded", () => {
    // Inicializar cuentas por defecto si el localStorage está vacío
    inicializarCuentasBase();

    const regRut = document.getElementById("reg-rut");
    if (regRut) {
        regRut.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^0-9kK\.\,-]/g, '');
        });
    }
});

// Cuentas por defecto del sistema JunaWeb
function inicializarCuentasBase() {
    let usuarios = JSON.parse(localStorage.getItem("junaweb_usuarios"));
    if (!usuarios || usuarios.length === 0) {
        const cuentasPredeterminadas = [
            {
                nombre: "Dante Canales",
                rutOriginal: "20.123.456-K",
                rutLimpio: "20123456K",
                curso: "Estudiante (Ver pase QR)",
                rol: "Estudiante",
                password: "1234"
            },
            {
                nombre: "Danny Hernández",
                rutOriginal: "18.765.432-1",
                rutLimpio: "187654321",
                curso: "Supervisor PAE (Escanear / Validar)",
                rol: "Supervisor PAE",
                password: "1234"
            },
            {
                nombre: "María José Torres",
                rutOriginal: "15.432.198-7",
                rutLimpio: "154321987",
                curso: "Directora / Cocina (Contador de raciones)",
                rol: "Cocina / Manipuladora",
                password: "1234"
            }
        ];
        localStorage.setItem("junaweb_usuarios", JSON.stringify(cuentasPredeterminadas));
    }
}

function procesarRegistro(event) {
    event.preventDefault();

    const alertBox = document.getElementById("register-alert");
    const nombre = document.getElementById("reg-nombre").value.trim();
    const rutOriginal = document.getElementById("reg-rut").value.trim();
    const curso = document.getElementById("reg-curso").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    
    const rolInput = document.getElementById("reg-rol");
    const rol = rolInput ? rolInput.value : "Estudiante";

    const rutLimpio = rutOriginal.replace(/[^0-9kK]/g, '').toUpperCase();

    if (!nombre || !rutLimpio || !curso || !password) {
        mostrarAlerta(alertBox, "Por favor completa todos los campos.", "alert-danger");
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem("junaweb_usuarios")) || [];

    const existe = usuarios.some(u => u.rutLimpio === rutLimpio);
    if (existe) {
        mostrarAlerta(alertBox, "Este RUT ya se encuentra registrado.", "alert-warning");
        return;
    }

    const nuevoUsuario = {
        nombre: nombre,
        rutOriginal: rutOriginal,
        rutLimpio: rutLimpio,
        curso: curso,
        rol: rol,
        password: password
    };

    usuarios.push(nuevoUsuario);
    localStorage.setItem("junaweb_usuarios", JSON.stringify(usuarios));

    mostrarAlerta(alertBox, "¡Cuenta creada con éxito! Redirigiendo...", "alert-success");

    setTimeout(() => {
        window.location.href = "iniciar_sesion.html";
    }, 1500);
}

function mostrarAlerta(box, mensaje, tipo) {
    if (!box) return;
    box.className = `alert ${tipo} py-2 mb-3 font-inter xsmall text-center`;
    box.textContent = mensaje;
    box.classList.remove("d-none");
}