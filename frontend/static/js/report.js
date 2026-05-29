document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const reportForm = document.getElementById('reportForm');
    const authError = document.getElementById('authError');
    const reportError = document.getElementById('reportError');

    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}Form`).classList.add('active');
            authError.style.display = 'none';
        });
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.style.display = 'none';
        try {
            await loginUser(
                document.getElementById('loginUsername').value,
                document.getElementById('loginPassword').value
            );
            updateNav();
            navigate('mapa');
            showToast('Sesión iniciada correctamente');
        } catch (err) {
            authError.textContent = err.message;
            authError.style.display = 'block';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.style.display = 'none';
        try {
            await registerUser(
                document.getElementById('regUsername').value,
                document.getElementById('regEmail').value,
                document.getElementById('regPassword').value
            );
            updateNav();
            navigate('mapa');
            showToast('Cuenta creada correctamente');
        } catch (err) {
            authError.textContent = err.message;
            authError.style.display = 'block';
        }
    });

    document.getElementById('navLogout').addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
    });

    document.getElementById('btnGetLocation').addEventListener('click', () => {
        if (!navigator.geolocation) {
            reportError.textContent = 'Geolocalización no disponible';
            reportError.style.display = 'block';
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                document.getElementById('reportLat').value = pos.coords.latitude.toFixed(6);
                document.getElementById('reportLng').value = pos.coords.longitude.toFixed(6);
                document.getElementById('reportUbicacion').value =
                    `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
                showToast('Ubicación obtenida');
            },
            () => {
                reportError.textContent = 'No se pudo obtener la ubicación';
                reportError.style.display = 'block';
            }
        );
    });

    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        reportError.style.display = 'none';

        if (!isAuth()) {
            reportError.textContent = 'Debes iniciar sesión para reportar';
            reportError.style.display = 'block';
            return;
        }

        const formData = new FormData();
        formData.append('tipo', document.getElementById('reportTipo').value);
        formData.append('descripcion', document.getElementById('reportDescripcion').value);
        formData.append('ubicacion', document.getElementById('reportUbicacion').value);
        formData.append('latitud', document.getElementById('reportLat').value);
        formData.append('longitud', document.getElementById('reportLng').value);

        const foto = document.getElementById('reportFoto').files[0];
        if (foto) {
            formData.append('foto', foto);
        }

        try {
            const submitBtn = reportForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            await apiRequest('/v1/reportes', {
                method: 'POST',
                body: {
                    tipo: document.getElementById('reportTipo').value,
                    descripcion: document.getElementById('reportDescripcion').value,
                    ubicacion: document.getElementById('reportUbicacion').value,
                    latitud: parseFloat(document.getElementById('reportLat').value),
                    longitud: parseFloat(document.getElementById('reportLng').value),
                },
            });

            showToast('Reporte enviado correctamente');
            reportForm.reset();
            navigate('mapa');
        } catch (err) {
            reportError.textContent = err.message;
            reportError.style.display = 'block';
        } finally {
            const submitBtn = reportForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar reporte';
        }
    });
});
