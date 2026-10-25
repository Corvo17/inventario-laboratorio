/**
 * Servicio Centralizado de Autenticación, Sesión y Matriz de Roles
 * Sistema de Diseño: Shadcn UI (Zinc Palette)
 * Roles Soportados: ADMIN (Coordinador) vs OPERADOR (Custodio Técnico)
 */

import { Toast } from '../components/toast.js';

let cachedUser = null;

/**
 * Obtiene el usuario actual desde memoria o localStorage
 */
export function obtenerUsuarioActual() {
    if (cachedUser) return cachedUser;
    try {
        const stored = localStorage.getItem('auth_user');
        if (stored) {
            cachedUser = JSON.parse(stored);
            return cachedUser;
        }
    } catch (e) {
        console.error('Error al leer auth_user de localStorage:', e);
    }
    return null;
}

/**
 * Evalúa si el usuario actual posee rol jerárquico de Administrador
 */
export function esAdmin() {
    const user = obtenerUsuarioActual();
    return user?.rol === 'ADMIN';
}

/**
 * Inicia sesión mediante solicitud asíncrona a la API
 */
export async function iniciarSesion(credenciales) {
    try {
        const response = await fetch('../api/routes/auth.php?action=login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(credenciales),
            credentials: 'include'
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
            throw new Error(json.message || `Error HTTP ${response.status}`);
        }

        cachedUser = json.data;
        localStorage.setItem('auth_user', JSON.stringify(cachedUser));
        return json;
    } catch (error) {
        console.error('Error en iniciarSesion:', error);
        throw error;
    }
}

/**
 * Cierra la sesión activa y redirige al login
 */
export async function cerrarSesion() {
    try {
        await fetch('../api/routes/auth.php?action=logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (e) {
        console.warn('Advertencia al cerrar sesión en servidor:', e);
    } finally {
        cachedUser = null;
        localStorage.removeItem('auth_user');
        window.location.href = 'login.html';
    }
}

/**
 * Comprueba si la sesión PHP sigue activa y autorizada en el backend.
 * Si falla, redirige automáticamente a login.html.
 */
export async function verificarSesion() {
    try {
        const response = await fetch('../api/routes/auth.php?action=check', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Sesión no autorizada (HTTP ${response.status})`);
        }

        const json = await response.json();
        if (!json.success || !json.data) {
            throw new Error(json.message || 'Sesión inválida');
        }

        cachedUser = json.data;
        localStorage.setItem('auth_user', JSON.stringify(cachedUser));

        // Inicializar interfaz de usuario autenticado
        actualizarSidebarUsuario(cachedUser);
        aplicarPermisosDOM(cachedUser);
        inyectarModalConfiguracion(cachedUser);

        return cachedUser;
    } catch (error) {
        console.warn('Sesión no válida o expirada:', error.message);
        cachedUser = null;
        localStorage.removeItem('auth_user');
        window.location.href = 'login.html';
        return null;
    }
}

/**
 * Aplica la matriz de roles en el DOM ocultando o deshabilitando elementos según privilegios
 */
export function aplicarPermisosDOM(user = null) {
    const usuario = user || obtenerUsuarioActual();
    const isAdmin = usuario?.rol === 'ADMIN';

    // Elementos restringidos exclusivamente a Administradores
    const adminElements = document.querySelectorAll('[data-role="ADMIN"]');
    adminElements.forEach(el => {
        if (!isAdmin) {
            el.setAttribute('data-hidden-by-role', 'true');
            el.style.display = 'none';
        } else {
            el.removeAttribute('data-hidden-by-role');
            el.style.removeProperty('display');
        }
    });

    // Elementos de aviso para Operadores
    const noticeElements = document.querySelectorAll('[data-role-notice="OPERADOR"]');
    noticeElements.forEach(el => {
        if (isAdmin) {
            el.style.display = 'none';
        } else {
            el.style.removeProperty('display');
        }
    });
}

/**
 * Actualiza la tarjeta de perfil en el pie del sidebar
 */
export function actualizarSidebarUsuario(user = null) {
    const usuario = user || obtenerUsuarioActual();
    if (!usuario) return;

    const userNameEl = document.querySelector('.user-meta .user-name');
    const userRoleEl = document.querySelector('.user-meta .user-role');
    const userBadgeEl = document.querySelector('.user-avatar-badge');

    if (userNameEl) {
        userNameEl.textContent = usuario.nombre || usuario.email;
        userNameEl.title = usuario.email;
    }

    if (userRoleEl) {
        if (usuario.rol === 'ADMIN') {
            userRoleEl.innerHTML = `<span class="badge" style="background: rgba(24,24,27,0.08); color: var(--text-primary); border: 1px solid var(--border-color); font-size: 11px; padding: 2px 6px; font-weight: 600; border-radius: 4px;">Coordinador (ADMIN)</span>`;
        } else {
            userRoleEl.innerHTML = `<span class="badge" style="background: var(--bg-muted); color: var(--text-secondary); border: 1px solid var(--border-color); font-size: 11px; padding: 2px 6px; font-weight: 500; border-radius: 4px;">Custodio (OPERADOR)</span>`;
        }
    }

    if (userBadgeEl) {
        userBadgeEl.textContent = usuario.rol === 'ADMIN' ? 'ADM' : 'OPR';
        userBadgeEl.style.background = usuario.rol === 'ADMIN' ? 'var(--text-primary)' : 'var(--text-muted)';
        userBadgeEl.style.color = 'var(--bg-surface)';
    }
}

/**
 * Inyecta y conecta el Modal de Configuración y Respaldo SQL
 */
export function inyectarModalConfiguracion(user = null) {
    const usuario = user || obtenerUsuarioActual();
    if (!usuario) return;

    // Conectar botón de engranaje en el sidebar
    const gearBtn = document.querySelector('.sidebar-action-btn') || document.getElementById('btn-sidebar-config');
    if (gearBtn && !gearBtn.dataset.configBound) {
        gearBtn.dataset.configBound = 'true';
        gearBtn.setAttribute('title', 'Configuración & Respaldo');
        gearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            abrirModalConfiguracion();
        });
    }

    if (document.getElementById('modal-configuracion-sistema')) {
        actualizarDatosModalConfiguracion(usuario);
        return;
    }

    const modalHTML = `
    <div id="modal-configuracion-sistema" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; align-items: center; justify-content: center; padding: 16px;">
        <div class="modal-card" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg, 12px); width: 100%; max-width: 520px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1); overflow: hidden; display: flex; flexDirection: column;">
            
            <!-- Encabezado Modal -->
            <div style="padding: 18px 22px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; background: var(--bg-muted);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-surface); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; color: var(--text-primary);">
                        <i class="fa-solid fa-sliders" style="font-size: 14px;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 1rem; font-weight: 600; color: var(--text-primary);">Configuración & Sistema</h3>
                        <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted);">Auditoría, respaldos y control de sesión</p>
                    </div>
                </div>
                <button type="button" id="btn-cerrar-modal-config" class="btn-icon" aria-label="Cerrar modal" style="background: transparent; border: none; font-size: 16px; cursor: pointer; color: var(--text-muted); padding: 6px; border-radius: 6px;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <!-- Cuerpo Modal -->
            <div style="padding: 22px; display: flex; flex-direction: column; gap: 20px; max-height: calc(85vh - 120px); overflow-y: auto;">
                
                <!-- Sección 1: Información del Sistema -->
                <div>
                    <h4 style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin: 0 0 10px 0;">Información del Entorno</h4>
                    <div style="background: var(--bg-muted); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8125rem;">
                        <div>
                            <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">Estado del Sistema</span>
                            <strong style="color: var(--text-primary);">Operativo</strong>
                        </div>
                        <div>
                            <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">Motor de Base de Datos</span>
                            <strong style="color: var(--text-primary);">MySQL 8.0 / InnoDB</strong>
                        </div>
                        <div>
                            <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">Sesión Activa</span>
                            <strong id="config-user-name" style="color: var(--text-primary);">${usuario.nombre}</strong>
                        </div>
                        <div>
                            <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">Rol Jerárquico</span>
                            <span id="config-user-badge"></span>
                        </div>
                    </div>
                </div>

                <!-- Sección 2: Respaldo de Base de Datos (1 Clic) -->
                <div>
                    <h4 style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin: 0 0 10px 0;">Copia de Seguridad Patrimonial</h4>
                    
                    <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; background: var(--bg-surface);">
                        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px;">
                            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <i class="fa-solid fa-database" style="font-size: 16px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">Respaldo SQL en 1 Clic</div>
                                <div style="font-size: 0.78125rem; color: var(--text-muted); line-height: 1.4; margin-top: 2px;">
                                    Genera un volcado estructurado (.sql) de todas las tablas: salas, puestos físicos, activos, préstamos y usuarios.
                                </div>
                            </div>
                        </div>

                        <!-- Botón para Administrador -->
                        <div data-role="ADMIN">
                            <button type="button" id="btn-descargar-backup-sql" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; padding: 10px 16px;">
                                <i class="fa-solid fa-cloud-arrow-down"></i>
                                <span>Descargar Respaldo SQL (.sql)</span>
                            </button>
                            <span style="display: block; font-size: 0.71875rem; color: var(--text-muted); text-align: center; margin-top: 6px;">
                                <i class="fa-solid fa-shield-halved" style="margin-right: 4px;"></i> Operación autorizada con privilegios de Administrador
                            </span>
                        </div>

                        <!-- Aviso para Operador -->
                        <div data-role-notice="OPERADOR" style="background: var(--bg-muted); border: 1px dashed var(--border-color); border-radius: 6px; padding: 12px; display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-lock" style="color: var(--text-muted); font-size: 16px;"></i>
                            <div style="font-size: 0.78125rem; color: var(--text-secondary); line-height: 1.35;">
                                <strong>Acceso Restringido:</strong> La exportación y descarga de volcados SQL está reservada al Coordinador de Laboratorios (ADMIN).
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sección 3: Cierre de Sesión -->
                <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <button type="button" id="btn-logout-sistema" class="btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; padding: 10px 16px; background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 6px; cursor: pointer; transition: background 0.15s ease;">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>

            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('modal-configuracion-sistema');
    const btnCerrar = document.getElementById('btn-cerrar-modal-config');
    const btnBackup = document.getElementById('btn-descargar-backup-sql');
    const btnLogout = document.getElementById('btn-logout-sistema');

    if (btnCerrar) {
        btnCerrar.addEventListener('click', cerrarModalConfiguracion);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModalConfiguracion();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
            cerrarModalConfiguracion();
        }
    });

    if (btnBackup) {
        btnBackup.addEventListener('click', () => {
            Toast.info('Generando Respaldo', 'Preparando el volcado SQL estructurado...', 3000);
            window.location.href = '../api/routes/backup.php?action=descargar-sql';
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm('¿Está seguro de que desea cerrar la sesión actual?')) {
                Toast.info('Cerrando Sesión', 'Redirigiendo a pantalla de acceso...', 2000);
                setTimeout(cerrarSesion, 300);
            }
        });
    }

    actualizarDatosModalConfiguracion(usuario);
}

function abrirModalConfiguracion() {
    const modal = document.getElementById('modal-configuracion-sistema');
    if (modal) {
        modal.style.display = 'flex';
        aplicarPermisosDOM();
    }
}

function cerrarModalConfiguracion() {
    const modal = document.getElementById('modal-configuracion-sistema');
    if (modal) modal.style.display = 'none';
}

function actualizarDatosModalConfiguracion(user) {
    const nameEl = document.getElementById('config-user-name');
    const badgeEl = document.getElementById('config-user-badge');
    if (nameEl && user) nameEl.textContent = `${user.nombre} (${user.email})`;
    if (badgeEl && user) {
        if (user.rol === 'ADMIN') {
            badgeEl.innerHTML = `<span class="badge" style="background: var(--text-primary); color: var(--bg-surface); font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">ADMIN</span>`;
        } else {
            badgeEl.innerHTML = `<span class="badge" style="background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-color); font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px;">OPERADOR</span>`;
        }
    }
}
