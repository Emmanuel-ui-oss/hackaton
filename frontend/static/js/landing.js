/**
 * landing.js — LOMA
 * Lógica compartida: landing, login y register.
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================
    // NAVBAR — sombra al hacer scroll
    // =========================================
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.style.boxShadow = window.scrollY > 10
                ? '0 4px 24px rgba(15,23,42,0.10)'
                : 'none';
        });
    }

    // =========================================
    // STATS — valores definidos en el HTML
    // TODO: reemplazar las X con datos reales de la API
    // =========================================

    // =========================================
    // FORMULARIO LOGIN
    // =========================================
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email    = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const errorBox = document.getElementById('login-error');
            const errorMsg = document.getElementById('login-error-msg');
            const btnLogin = document.getElementById('btn-login');

            // Estado de carga
            btnLogin.disabled = true;
            btnLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando…';
            errorBox.style.display = 'none';

            try {
                // TODO: reemplazar con llamada real a la API de autenticación
                // const res = await fetch('/api/auth/login', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({ email, password })
                // });
                // if (!res.ok) throw new Error('Credenciales inválidas');
                // const data = await res.json();
                // localStorage.setItem('loma_token', data.token);

                // Simulación (quitar cuando conectes la API)
                await new Promise(r => setTimeout(r, 1200));
                if (email && password.length >= 4) {
                    window.location.href = 'index.html';
                } else {
                    throw new Error('Correo o contraseña incorrectos.');
                }

            } catch (err) {
                errorMsg.textContent = err.message;
                errorBox.style.display = 'block';
                btnLogin.disabled = false;
                btnLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión';
            }
        });
    }

    // =========================================
    // FORMULARIO REGISTER — fortaleza y validación
    // =========================================
    const formRegister = document.getElementById('form-register');
    if (formRegister) {

        const passInput    = document.getElementById('reg-password');
        const pass2Input   = document.getElementById('reg-password2');
        const strengthWrap = document.getElementById('strength-bar-wrap');
        const strengthBar  = document.getElementById('strength-bar');
        const strengthLbl  = document.getElementById('strength-label');
        const matchMsg     = document.getElementById('pass-match-msg');
        const errorBox     = document.getElementById('register-error');
        const errorMsg     = document.getElementById('register-error-msg');
        const successBox   = document.getElementById('register-success');
        const btnReg       = document.getElementById('btn-register');

        // Barra de fortaleza
        passInput.addEventListener('input', () => {
            const val = passInput.value;
            strengthWrap.style.display = val ? 'block' : 'none';

            let score = 0;
            if (val.length >= 8)        score++;
            if (/[A-Z]/.test(val))      score++;
            if (/[0-9]/.test(val))      score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            const levels = [
                { w: '25%',  bg: '#DC2626', label: 'Muy débil'  },
                { w: '50%',  bg: '#EA580C', label: 'Débil'       },
                { w: '75%',  bg: '#CA8A04', label: 'Aceptable'   },
                { w: '100%', bg: '#0D9488', label: 'Fuerte ✓'    },
            ];
            const lvl = levels[Math.max(0, score - 1)];
            strengthBar.style.width      = lvl.w;
            strengthBar.style.background = lvl.bg;
            strengthLbl.textContent      = lvl.label;
            strengthLbl.style.color      = lvl.bg;
        });

        // Coincidencia de contraseñas
        function checkMatch() {
            if (!pass2Input.value) { matchMsg.style.display = 'none'; return; }
            const ok = passInput.value === pass2Input.value;
            matchMsg.style.display  = 'block';
            matchMsg.textContent    = ok ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden';
            matchMsg.style.color    = ok ? '#0D9488' : '#DC2626';
        }

        pass2Input.addEventListener('input', checkMatch);
        passInput.addEventListener('input',  checkMatch);

        // Envío
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name     = document.getElementById('reg-name').value.trim();
            const email    = document.getElementById('reg-email').value.trim();
            const password = passInput.value;
            const password2 = pass2Input.value;
            const terms    = document.getElementById('reg-terms').checked;

            errorBox.style.display   = 'none';
            successBox.style.display = 'none';

            // Validaciones cliente
            if (!name || !email || !password) {
                errorMsg.textContent = 'Por favor completa todos los campos.';
                errorBox.style.display = 'block'; return;
            }
            if (password.length < 8) {
                errorMsg.textContent = 'La contraseña debe tener al menos 8 caracteres.';
                errorBox.style.display = 'block'; return;
            }
            if (password !== password2) {
                errorMsg.textContent = 'Las contraseñas no coinciden.';
                errorBox.style.display = 'block'; return;
            }
            if (!terms) {
                errorMsg.textContent = 'Debes aceptar los términos de uso.';
                errorBox.style.display = 'block'; return;
            }

            // Estado de carga
            btnReg.disabled = true;
            btnReg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando cuenta…';

            try {
                // TODO: reemplazar con llamada real a la API
                // const res = await fetch('/api/auth/register', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({ name, email, password })
                // });
                // if (!res.ok) throw new Error('Este correo ya está registrado.');

                // Simulación
                await new Promise(r => setTimeout(r, 1400));

                successBox.style.display = 'block';
                setTimeout(() => { window.location.href = 'index.html'; }, 1800);

            } catch (err) {
                errorMsg.textContent = err.message;
                errorBox.style.display = 'block';
                btnReg.disabled = false;
                btnReg.innerHTML = '<i class="fa-solid fa-user-plus"></i> Crear cuenta';
            }
        });
    }

});
