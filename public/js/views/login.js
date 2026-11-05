/**
 * Controlador de la Vista de Login y Auto-Registro (public/login.html)
 * Sistema de Diseño: Shadcn UI (Zinc Palette)
 */

import { initThemeToggle } from '../components/theme-toggle.js';
import { Toast } from '../components/toast.js';
import { iniciarSesion } from '../services/auth.service.js';
import { registrarUsuario } from '../services/api.service.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar Tema Claro / Oscuro
    initThemeToggle();

    // 2. Verificar si ya existe una sesión activa y redirigir
    try {
        const checkRes = await fetch('../api/routes/auth.php?action=check', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        });
        if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.success && checkData.data) {
                window.location.href = 'index.html';
                return;
            }
        }
    } catch (e) {
        // Continuar en login
    }

    // 3. Referencias DOM - Modos Login / Registro
    const tabModeLogin = document.getElementById('tab-mode-login');
    const tabModeRegister = document.getElementById('tab-mode-register');
    const viewLoginPanel = document.getElementById('view-login-panel');
    const viewRegisterPanel = document.getElementById('view-register-panel');
    const linkGoRegister = document.getElementById('link-go-register');
    const linkGoLogin = document.getElementById('link-go-login');

    // Referencias DOM - Formulario Login
    const formLogin = document.getElementById('form-login');
    const inputEmail = document.getElementById('login-email');
    const inputPassword = document.getElementById('login-password');
    const btnSubmit = document.getElementById('btn-submit-login');
    const iconSubmit = document.getElementById('icon-submit-login');
    const textSubmit = document.getElementById('text-submit-login');
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    const iconTogglePassword = document.getElementById('icon-toggle-password');

    // Referencias DOM - Formulario Registro
    const formRegister = document.getElementById('form-register');
    const inputRegNombre = document.getElementById('register-nombre');
    const inputRegEmail = document.getElementById('register-email');
    const inputRegPassword = document.getElementById('register-password');
    const btnSubmitRegister = document.getElementById('btn-submit-register');
    const iconSubmitRegister = document.getElementById('icon-submit-register');
    const textSubmitRegister = document.getElementById('text-submit-register');
    const btnToggleRegPassword = document.getElementById('btn-toggle-register-password');
    const iconToggleRegPassword = document.getElementById('icon-toggle-register-password');

    const demoBtnAdmin = document.getElementById('demo-btn-admin');
    const demoBtnOperador = document.getElementById('demo-btn-operador');

    // 4. Alternancia de Vista Login <-> Registro
    function switchAuthMode(mode, prefillEmail = '') {
        const isRegister = mode === 'register';

        if (tabModeLogin && tabModeRegister) {
            tabModeLogin.classList.toggle('active', !isRegister);
            tabModeLogin.setAttribute('aria-selected', String(!isRegister));
            tabModeRegister.classList.toggle('active', isRegister);
            tabModeRegister.setAttribute('aria-selected', String(isRegister));
        }

        if (viewLoginPanel && viewRegisterPanel) {
            viewLoginPanel.style.display = isRegister ? 'none' : 'block';
            viewRegisterPanel.style.display = isRegister ? 'block' : 'none';
        }

        if (isRegister) {
            if (inputRegNombre) inputRegNombre.focus();
        } else {
            if (prefillEmail && inputEmail) {
                inputEmail.value = prefillEmail;
                if (inputPassword) {
                    inputPassword.value = '';
                    inputPassword.focus();
                }
            } else if (inputEmail) {
                inputEmail.focus();
            }
        }
    }

    if (tabModeLogin) tabModeLogin.addEventListener('click', () => switchAuthMode('login'));
    if (tabModeRegister) tabModeRegister.addEventListener('click', () => switchAuthMode('register'));
    if (linkGoRegister) linkGoRegister.addEventListener('click', () => switchAuthMode('register'));
    if (linkGoLogin) linkGoLogin.addEventListener('click', () => switchAuthMode('login'));

    // 5. Toggle Mostrar/Ocultar Contraseña (Login y Registro)
    if (btnTogglePassword && inputPassword && iconTogglePassword) {
        btnTogglePassword.addEventListener('click', () => {
            const isPassword = inputPassword.type === 'password';
            inputPassword.type = isPassword ? 'text' : 'password';
            iconTogglePassword.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        });
    }

    if (btnToggleRegPassword && inputRegPassword && iconToggleRegPassword) {
        btnToggleRegPassword.addEventListener('click', () => {
            const isPassword = inputRegPassword.type === 'password';
            inputRegPassword.type = isPassword ? 'text' : 'password';
            iconToggleRegPassword.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        });
    }

    // 6. Botones de Demostración para Evaluación de Tesis
    if (demoBtnAdmin) {
        demoBtnAdmin.addEventListener('click', () => {
            switchAuthMode('login');
            inputEmail.value = 'admin@lab.local';
            inputPassword.value = 'Admin123*';
            demoBtnAdmin.classList.add('active');
            if (demoBtnOperador) demoBtnOperador.classList.remove('active');
            inputEmail.focus();
        });
    }

    if (demoBtnOperador) {
        demoBtnOperador.addEventListener('click', () => {
            switchAuthMode('login');
            inputEmail.value = 'operador@lab.local';
            inputPassword.value = 'Operador123*';
            demoBtnOperador.classList.add('active');
            if (demoBtnAdmin) demoBtnAdmin.classList.remove('active');
            inputEmail.focus();
        });
    }

    // 7. Procesar Formulario de Inicio de Sesión
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = inputEmail.value.trim();
            const password = inputPassword.value.trim();

            if (!email || !password) {
                Toast.warning('Campos Requeridos', 'Por favor ingrese su correo institucional y contraseña.');
                if (!email) inputEmail.focus();
                else inputPassword.focus();
                return;
            }

            setLoadingLogin(true);

            try {
                const res = await iniciarSesion({ email, password });
                Toast.success('Acceso Concedido', `Bienvenido, ${res.data.nombre}.`, 2000);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 400);
            } catch (error) {
                setLoadingLogin(false);
                Toast.error('Fallo de Autenticación', error.message || 'Verifique sus credenciales de acceso.');
                inputPassword.value = '';
                inputPassword.focus();
            }
        });
    }

    // 8. Procesar Formulario de Auto-Registro
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombre = inputRegNombre ? inputRegNombre.value.trim() : '';
            const email = inputRegEmail ? inputRegEmail.value.trim().toLowerCase() : '';
            const password = inputRegPassword ? inputRegPassword.value : '';

            if (!nombre || !email || !password.trim()) {
                Toast.warning('Campos Obligatorios', 'Complete su nombre, correo electrónico institucional y contraseña.');
                if (!nombre && inputRegNombre) inputRegNombre.focus();
                else if (!email && inputRegEmail) inputRegEmail.focus();
                else if (inputRegPassword) inputRegPassword.focus();
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                Toast.warning('Correo Inválido', 'Ingrese una dirección de correo electrónico institucional válida.');
                if (inputRegEmail) inputRegEmail.focus();
                return;
            }

            if (password.length < 6) {
                Toast.warning('Contraseña Corta', 'La contraseña debe tener al menos 6 caracteres.');
                if (inputRegPassword) inputRegPassword.focus();
                return;
            }

            setLoadingRegister(true);

            try {
                await registrarUsuario({ nombre, email, password });
                Toast.success(
                    'Registro Exitoso',
                    'Cuenta registrada exitosamente como Operador. Ya puedes iniciar sesión.',
                    4000
                );
                formRegister.reset();
                setLoadingRegister(false);
                switchAuthMode('login', email);
            } catch (error) {
                setLoadingRegister(false);
                Toast.error('No se pudo registrar', error.message || 'Error al registrar la cuenta.');
            }
        });
    }

    function setLoadingLogin(isLoading) {
        if (!btnSubmit) return;
        btnSubmit.disabled = isLoading;
        if (isLoading) {
            btnSubmit.style.opacity = '0.85';
            btnSubmit.style.cursor = 'wait';
            if (iconSubmit) iconSubmit.className = 'fa-solid fa-circle-notch fa-spin';
            if (textSubmit) textSubmit.textContent = 'Verificando credenciales...';
        } else {
            btnSubmit.style.opacity = '1';
            btnSubmit.style.cursor = 'pointer';
            if (iconSubmit) iconSubmit.className = 'fa-solid fa-arrow-right-to-bracket';
            if (textSubmit) textSubmit.textContent = 'Ingresar al Sistema';
        }
    }

    function setLoadingRegister(isLoading) {
        if (!btnSubmitRegister) return;
        btnSubmitRegister.disabled = isLoading;
        if (isLoading) {
            btnSubmitRegister.style.opacity = '0.85';
            btnSubmitRegister.style.cursor = 'wait';
            if (iconSubmitRegister) iconSubmitRegister.className = 'fa-solid fa-circle-notch fa-spin';
            if (textSubmitRegister) textSubmitRegister.textContent = 'Registrando cuenta...';
        } else {
            btnSubmitRegister.style.opacity = '1';
            btnSubmitRegister.style.cursor = 'pointer';
            if (iconSubmitRegister) iconSubmitRegister.className = 'fa-solid fa-user-plus';
            if (textSubmitRegister) textSubmitRegister.textContent = 'Crear Cuenta de Operador';
        }
    }
});
