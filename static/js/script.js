// Lógica para el Perfil Alumno
function generarQR() {
    const qrContainer = document.getElementById('qrContainer');
    const estado = document.getElementById('estadoAlumno');
    
    // Simular generación de QR dibujando un patrón con CSS o insertando imagen
    qrContainer.innerHTML = `
        <div style="background-color: var(--accent-color); padding: 15px; border-radius: 8px;">
            <!-- QR Simulado con caracteres para no usar imágenes externas -->
            <h1 style="color:#000; margin:0; letter-spacing: 5px; line-height:1;">
                &#9632;&#9632;&#9634;<br>
                &#9634;&#9632;&#9632;<br>
                &#9632;&#9634;&#9632;
            </h1>
        </div>
        <p class="text-accent mt-3 mb-0 fw-bold">QR Generado</p>
    `;
    qrContainer.style.border = "1px solid var(--accent-color)";
    
    estado.innerHTML = "• Confirmado";
    estado.className = "text-accent fw-bold";
}

// Lógica para el Perfil Administrador
function simularEscaneo(esValido) {
    const resultadoDiv = document.getElementById('resultadoEscaneo');
    resultadoDiv.classList.remove('d-none', 'alert-success', 'alert-danger');
    
    if (esValido) {
        resultadoDiv.classList.add('alert-success');
        resultadoDiv.innerHTML = "<strong>✅ Acceso Permitido:</strong> Ración registrada correctamente.";
    } else {
        resultadoDiv.classList.add('alert-danger');
        resultadoDiv.innerHTML = "<strong>⛔ Alerta Restrictiva:</strong> Este código QR ya fue procesado. Posible duplicación.";
    }
    
    // Ocultar alerta después de 4 segundos
    setTimeout(() => {
        resultadoDiv.classList.add('d-none');
    }, 4000);
}