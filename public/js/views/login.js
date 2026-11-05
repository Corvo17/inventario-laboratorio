/**
 * Controlador de la Vista de Login y Auto-Registro (public/login.html)
 * Sistema de Diseño: Shadcn UI (Zinc Palette) - Validaciones en Tiempo Real y UX Pulido
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

    // 3. Referencias DOM - Modos Login / Registro y Alerta Inline
    const tabModeLogin = document.getElementById('tab-mode-login');
    const tabModeRegister = document.getElementById('tab-mode-register');
    const viewLoginPanel = document.getElementById('view-login-panel');
    const viewRegisterPanel = document.getElementById('view-register-panel');
    const linkGoRegister = document.getElementById('link-go-register');
    const linkGoLogin = document.getElementById('link-go-login');
    const inlineAlert = document.getElementById('auth-inline-alert');
    const inlineAlertIcon = document.getElementById('auth-inline-alert-icon');
    const inlineAlertText = document.getElementById('auth-inline-alert-text');

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
    const inputRegConfirm = document.getElementById('register-password-confirm');
    const btnSubmitRegister = document.getElementById('btn-submit-register');
    const iconSubmitRegister = document.getElementById('icon-submit-register');
    const textSubmitRegister = document.getElementById('text-submit-register');
    const btnToggleRegPassword = document.getElementById('btn-toggle-register-password');
    const iconToggleRegPassword = document.getElementById('icon-toggle-register-password');
    const btnToggleRegConfirm = document.getElementById('btn-toggle-register-confirm');
    const iconToggleRegConfirm = document.getElementById('icon-toggle-register-confirm');

    // Referencias DOM - Indicador de Fortaleza de Contraseña
    const seg1 = document.getElementById('strength-seg-1');
    const seg2 = document.getElementById('strength-seg-2');
    const seg3 = document.getElementById('strength-seg-3');
    const strengthLabelText = document.getElementById('strength-label-text');

    // Expresiones regulares de validación
    const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ.\s'-]{3,100}$/;
    const regexEmailRFC = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const regexPasswordSegura = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

    // Utilidades de Feedback Visual por Campo
    function setFieldState(inputEl, feedbackId, state, message = '') {
        if (!inputEl) return;
        const feedbackEl = document.getElementById(feedbackId);
        inputEl.classList.remove('input-error', 'input-valid');

        if (state === 'error') {
            inputEl.classList.add('input-error');
            if (feedbackEl) {
                feedbackEl.className = 'field-feedback error';
                feedbackEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i><span>${message}</span>`;
            }
        } else if (state === 'valid') {
            inputEl.classList.add('input-valid');
            if (feedbackEl) {
                if (message) {
                    feedbackEl.className = 'field-feedback valid';
                    feedbackEl.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${message}</span>`;
                } else {
                    feedbackEl.className = 'field-feedback';
                    feedbackEl.innerHTML = '';
                }
            }
        } else {
            if (feedbackEl) {
                feedbackEl.className = 'field-feedback';
                feedbackEl.innerHTML = '';
            }
        }
    }

    function showInlineAlert(type, message) {
        if (!inlineAlert || !inlineAlertText || !inlineAlertIcon) return;
        if (!message) {
            inlineAlert.className = 'auth-inline-alert';
            inlineAlertText.textContent = '';
            return;
        }
        inlineAlert.className = `auth-inline-alert ${type}`;
        inlineAlertIcon.className = type === 'success'
            ? 'fa-solid fa-circle-check'
            : 'fa-solid fa-circle-exclamation';
        inlineAlertText.textContent = message;
    }

    function resetValidationStates() {
        showInlineAlert('', '');
        [inputEmail, inputPassword, inputRegNombre, inputRegEmail, inputRegPassword, inputRegConfirm].forEach(el => {
            if (el) el.classList.remove('input-error', 'input-valid');
        });
        [
            'feedback-login-email',
            'feedback-login-password',
            'feedback-register-nombre',
            'feedback-register-email',
            'feedback-register-password',
            'feedback-register-confirm'
        ].forEach(id => {
            const fb = document.getElementById(id);
            if (fb) {
                fb.className = 'field-feedback';
                fb.innerHTML = '';
            }
        });
        actualizarFortalezaPassword('');
    }

    function resetPasswordVisibility(inputEl, iconEl) {
        if (inputEl && iconEl) {
            inputEl.type = 'password';
            iconEl.className = 'fa-solid fa-eye';
        }
    }

    // 4. Alternancia Suave entre Pestañas (Login <-> Registro)
    function switchAuthMode(mode, prefillEmail = '') {
        const isRegister = mode === 'register';

        resetValidationStates();

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

        // Restablecer visibilidad de contraseñas
        resetPasswordVisibility(inputPassword, iconTogglePassword);
        resetPasswordVisibility(inputRegPassword, iconToggleRegPassword);
        resetPasswordVisibility(inputRegConfirm, iconToggleRegConfirm);

        if (isRegister) {
            if (formLogin) formLogin.reset();
            if (inputRegNombre) inputRegNombre.focus();
        } else {
            if (formRegister) formRegister.reset();
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

    // 5. Visualización y Ocultación de Contraseña (Show/Hide Password)
    function bindPasswordToggle(btnEl, inputEl, iconEl) {
        if (!btnEl || !inputEl || !iconEl) return;
        btnEl.addEventListener('click', (e) => {
            e.preventDefault();
            const isHidden = inputEl.type === 'password';
            inputEl.type = isHidden ? 'text' : 'password';
            iconEl.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        });
    }

    bindPasswordToggle(btnTogglePassword, inputPassword, iconTogglePassword);
    bindPasswordToggle(btnToggleRegPassword, inputRegPassword, iconToggleRegPassword);
    bindPasswordToggle(btnToggleRegConfirm, inputRegConfirm, iconToggleRegConfirm);

    // 6. Validaciones en Tiempo Real en el Formulario de Registro
    function validarNombreRegistro(mostrarVacio = false) {
        if (!inputRegNombre) return false;
        const val = inputRegNombre.value.trim();
        if (!val) {
            if (mostrarVacio) {
                setFieldState(inputRegNombre, 'feedback-register-nombre', 'error', 'Ingrese su nombre completo.');
            } else {
                setFieldState(inputRegNombre, 'feedback-register-nombre', 'neutral');
            }
            return false;
        }
        if (val.length < 3) {
            setFieldState(inputRegNombre, 'feedback-register-nombre', 'error', 'El nombre debe tener al menos 3 caracteres.');
            return false;
        }
        if (!regexNombre.test(val)) {
            setFieldState(inputRegNombre, 'feedback-register-nombre', 'error', 'Use únicamente letras y espacios válidos.');
            return false;
        }
        setFieldState(inputRegNombre, 'feedback-register-nombre', 'valid');
        return true;
    }

    function validarEmailRegistro(mostrarVacio = false) {
        if (!inputRegEmail) return false;
        const val = inputRegEmail.value.trim();
        if (!val) {
            if (mostrarVacio) {
                setFieldState(inputRegEmail, 'feedback-register-email', 'error', 'El correo electrónico institucional es obligatorio.');
            } else {
                setFieldState(inputRegEmail, 'feedback-register-email', 'neutral');
            }
            return false;
        }
        if (!regexEmailRFC.test(val)) {
            setFieldState(inputRegEmail, 'feedback-register-email', 'error', 'Ingrese un formato de correo institucional válido (ej. usuario@lab.local).');
            return false;
        }
        setFieldState(inputRegEmail, 'feedback-register-email', 'valid');
        return true;
    }

    function evaluarFortalezaPassword(pwd) {
        if (!pwd || pwd.length === 0) {
            return { level: 0, label: 'Sin evaluar', color: 'var(--text-muted)', cls: '' };
        }
        if (!regexPasswordSegura.test(pwd)) {
            return { level: 1, label: 'Débil (mín. 8 caracteres, letras y números)', color: '#ef4444', cls: 'weak' };
        }

        const tieneMayusculas = /[A-Z]/.test(pwd);
        const tieneMinusculas = /[a-z]/.test(pwd);
        const tieneSimbolos = /[^a-zA-Z0-9]/.test(pwd);

        if (pwd.length >= 10 || (tieneMayusculas && tieneMinusculas && tieneSimbolos)) {
            return { level: 3, label: 'Segura', color: '#10b981', cls: 'strong' };
        }
        return { level: 2, label: 'Media', color: '#f59e0b', cls: 'medium' };
    }

    function actualizarFortalezaPassword(pwd) {
        const info = evaluarFortalezaPassword(pwd);
        const segments = [seg1, seg2, seg3];
        segments.forEach((seg, idx) => {
            if (!seg) return;
            seg.className = 'strength-segment';
            if (info.level > idx && info.cls) {
                seg.classList.add(info.cls);
            }
        });
        if (strengthLabelText) {
            strengthLabelText.textContent = info.label;
            strengthLabelText.style.color = info.color;
        }
    }

    function validarPasswordRegistro(mostrarVacio = false) {
        if (!inputRegPassword) return false;
        const val = inputRegPassword.value;
        actualizarFortalezaPassword(val);

        if (!val) {
            if (mostrarVacio) {
                setFieldState(inputRegPassword, 'feedback-register-password', 'error', 'Debe tener mínimo 8 caracteres con letras y números');
            } else {
                setFieldState(inputRegPassword, 'feedback-register-password', 'neutral');
            }
            return false;
        }
        if (!regexPasswordSegura.test(val)) {
            setFieldState(inputRegPassword, 'feedback-register-password', 'error', 'Debe tener mínimo 8 caracteres con letras y números');
            return false;
        }
        setFieldState(inputRegPassword, 'feedback-register-password', 'valid');
        return true;
    }

    function validarConfirmacionPassword(mostrarVacio = false) {
        if (!inputRegConfirm || !inputRegPassword) return false;
        const pwd = inputRegPassword.value;
        const confirmVal = inputRegConfirm.value;

        if (!confirmVal) {
            if (mostrarVacio) {
                setFieldState(inputRegConfirm, 'feedback-register-confirm', 'error', 'Confirme su contraseña para continuar.');
            } else {
                setFieldState(inputRegConfirm, 'feedback-register-confirm', 'neutral');
            }
            return false;
        }
        if (confirmVal !== pwd) {
            setFieldState(inputRegConfirm, 'feedback-register-confirm', 'error', 'Las contraseñas no coinciden.');
            return false;
        }
        setFieldState(inputRegConfirm, 'feedback-register-confirm', 'valid', 'Las contraseñas coinciden');
        return true;
    }

    if (inputRegNombre) {
        inputRegNombre.addEventListener('input', () => validarNombreRegistro(false));
        inputRegNombre.addEventListener('blur', () => validarNombreRegistro(true));
    }

    if (inputRegEmail) {
        inputRegEmail.addEventListener('input', () => validarEmailRegistro(false));
        inputRegEmail.addEventListener('blur', () => validarEmailRegistro(true));
    }

    if (inputRegPassword) {
        inputRegPassword.addEventListener('input', () => {
            validarPasswordRegistro(false);
            if (inputRegConfirm && inputRegConfirm.value.length > 0) {
                validarConfirmacionPassword(false);
            }
        });
        inputRegPassword.addEventListener('blur', () => validarPasswordRegistro(true));
    }

    if (inputRegConfirm) {
        inputRegConfirm.addEventListener('input', () => validarConfirmacionPassword(false));
        inputRegConfirm.addEventListener('blur', () => validarConfirmacionPassword(true));
    }

    // 7. Procesar Formulario de Inicio de Sesión
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            showInlineAlert('', '');

            const email = inputEmail ? inputEmail.value.trim() : '';
            const password = inputPassword ? inputPassword.value.trim() : '';

            if (!email || !password) {
                if (!email) setFieldState(inputEmail, 'feedback-login-email', 'error', 'Ingrese su correo institucional.');
                if (!password) setFieldState(inputPassword, 'feedback-login-password', 'error', 'Ingrese su contraseña.');
                Toast.warning('Campos Requeridos', 'Por favor ingrese su correo institucional y contraseña.');
                if (!email && inputEmail) inputEmail.focus();
                else if (inputPassword) inputPassword.focus();
                return;
            }

            setFieldState(inputEmail, 'feedback-login-email', 'neutral');
            setFieldState(inputPassword, 'feedback-login-password', 'neutral');
            setLoadingLogin(true);

            try {
                const res = await iniciarSesion({ email, password });
                Toast.success('Acceso Concedido', `Bienvenido, ${res.data.nombre}.`, 2000);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 400);
            } catch (error) {
                setLoadingLogin(false);
                const msg = error.message || 'Verifique sus credenciales de acceso.';
                showInlineAlert('error', msg);
                Toast.error('Fallo de Autenticación', msg);
                if (inputPassword) {
                    inputPassword.value = '';
                    inputPassword.classList.add('input-error');
                    inputPassword.focus();
                }
            }
        });
    }

    // 9. Procesar Formulario de Auto-Registro
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            showInlineAlert('', '');

            const okNombre = validarNombreRegistro(true);
            const okEmail = validarEmailRegistro(true);
            const okPassword = validarPasswordRegistro(true);
            const okConfirm = validarConfirmacionPassword(true);

            if (!okNombre || !okEmail || !okPassword || !okConfirm) {
                Toast.warning('Verifique los Campos', 'Corrija los campos marcados antes de crear su cuenta.');
                if (!okNombre && inputRegNombre) inputRegNombre.focus();
                else if (!okEmail && inputRegEmail) inputRegEmail.focus();
                else if (!okPassword && inputRegPassword) inputRegPassword.focus();
                else if (!okConfirm && inputRegConfirm) inputRegConfirm.focus();
                return;
            }

            const nombre = inputRegNombre.value.trim();
            const email = inputRegEmail.value.trim().toLowerCase();
            const password = inputRegPassword.value;

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
                showInlineAlert('success', 'Cuenta registrada exitosamente como Operador. Ingresa tu contraseña para continuar.');
            } catch (error) {
                setLoadingRegister(false);
                const msg = error.message || 'Error al registrar la cuenta.';
                showInlineAlert('error', msg);
                Toast.error('No se pudo registrar', msg);

                // Mantener nombre y correo ingresados; limpiar únicamente los campos de contraseña
                if (inputRegPassword) inputRegPassword.value = '';
                if (inputRegConfirm) inputRegConfirm.value = '';
                actualizarFortalezaPassword('');
                setFieldState(inputRegConfirm, 'feedback-register-confirm', 'neutral');

                if (error.status === 409 && inputRegEmail) {
                    setFieldState(inputRegEmail, 'feedback-register-email', 'error', msg);
                    inputRegEmail.focus();
                } else if (inputRegPassword) {
                    setFieldState(inputRegPassword, 'feedback-register-password', 'error', msg);
                    inputRegPassword.focus();
                }
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
            if (textSubmit) textSubmit.textContent = 'Iniciar Sesión';
        }
    }

    function setLoadingRegister(isLoading) {
        if (!btnSubmitRegister) return;
        btnSubmitRegister.disabled = isLoading;
        if (isLoading) {
            btnSubmitRegister.style.opacity = '0.85';
            btnSubmitRegister.style.cursor = 'wait';
            if (iconSubmitRegister) iconSubmitRegister.className = 'fa-solid fa-circle-notch fa-spin';
            if (textSubmitRegister) textSubmitRegister.textContent = 'Creando cuenta...';
        } else {
            btnSubmitRegister.style.opacity = '1';
            btnSubmitRegister.style.cursor = 'pointer';
            if (iconSubmitRegister) iconSubmitRegister.className = 'fa-solid fa-user-plus';
            if (textSubmitRegister) textSubmitRegister.textContent = 'Registrar Cuenta';
        }
    }
});
