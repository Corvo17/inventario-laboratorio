/**
 * Controlador de la Vista de Login (public/login.html)
 * Sistema de Diseño: Shadcn UI (Zinc Palette)
 */

import { initThemeToggle } from '../components/theme-toggle.js';
import { Toast } from '../components/toast.js';
import { iniciarSesion } from '../services/auth.service.js';

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

    // 3. Referencias DOM
    const formLogin = document.getElementById('form-login');
    const inputEmail = document.getElementById('login-email');
    const inputPassword = document.getElementById('login-password');
    const btnSubmit = document.getElementById('btn-submit-login');
    const iconSubmit = document.getElementById('icon-submit-login');
    const textSubmit = document.getElementById('text-submit-login');
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    const iconTogglePassword = document.getElementById('icon-toggle-password');

    const demoBtnAdmin = document.getElementById('demo-btn-admin');
    const demoBtnOperador = document.getElementById('demo-btn-operador');

    // 4. Toggle Mostrar/Ocultar Contraseña
    if (btnTogglePassword && inputPassword && iconTogglePassword) {
        btnTogglePassword.addEventListener('click', () => {
            const isPassword = inputPassword.type === 'password';
            inputPassword.type = isPassword ? 'text' : 'password';
            iconTogglePassword.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        });
    }

    // 5. Botones de Demostración para Evaluación de Tesis
    if (demoBtnAdmin) {
        demoBtnAdmin.addEventListener('click', () => {
            inputEmail.value = 'admin@lab.local';
            inputPassword.value = 'Admin123*';
            demoBtnAdmin.classList.add('active');
            if (demoBtnOperador) demoBtnOperador.classList.remove('active');
            inputEmail.focus();
        });
    }

    if (demoBtnOperador) {
        demoBtnOperador.addEventListener('click', () => {
            inputEmail.value = 'operador@lab.local';
            inputPassword.value = 'Operador123*';
            demoBtnOperador.classList.add('active');
            if (demoBtnAdmin) demoBtnAdmin.classList.remove('active');
            inputEmail.focus();
        });
    }

    // 6. Procesar Formulario de Inicio de Sesión
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

            // Estado de Carga
            setLoading(true);

            try {
                const res = await iniciarSesion({ email, password });
                Toast.success('Acceso Concedido', `Bienvenido, ${res.data.nombre}.`, 2000);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 400);
            } catch (error) {
                setLoading(false);
                Toast.error('Fallo de Autenticación', error.message || 'Verifique sus credenciales de acceso.');
                inputPassword.value = '';
                inputPassword.focus();
            }
        });
    }

    function setLoading(isLoading) {
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
});
