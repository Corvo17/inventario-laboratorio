/**
 * Controlador de la Vista de Gestión de Personal & Roles de Acceso (public/usuarios.html)
 * Acceso exclusivo: Rol ADMIN
 */

import { initThemeToggle } from '../components/theme-toggle.js';
import { Toast } from '../components/toast.js';
import { initCommandPalette } from '../components/command-palette.js';
import { verificarSesion, obtenerUsuarioActual, inyectarModalConfiguracion } from '../services/auth.service.js';
import { obtenerUsuarios, cambiarRolUsuario, eliminarUsuario } from '../services/api.service.js';

let listaUsuarios = [];
let usuarioActual = null;

document.addEventListener('DOMContentLoaded', async () => {
    initThemeToggle();
    inyectarModalConfiguracion();

    // Asegurar que el modal de eliminación inicie estrictamente cerrado y oculto
    cerrarModalEliminarUsuario();

    // 1. Validar sesión activa y privilegios exclusivos de Administrador
    usuarioActual = await verificarSesion();
    if (!usuarioActual) {
        return;
    }

    inyectarModalConfiguracion(usuarioActual);

    if (usuarioActual.rol !== 'ADMIN') {
        Toast.error('Acceso Restringido', 'Esta sección es exclusiva para Administradores.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
        return;
    }

    initCommandPalette();
    configurarEventosDOM();
    await cargarUsuarios();
});

function configurarEventosDOM() {
    const inputBusqueda = document.getElementById('input-busqueda-usuarios');
    const filtroRol = document.getElementById('filtro-rol-usuarios');
    const btnRefrescar = document.getElementById('btn-refrescar-usuarios');

    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', () => renderizarTablaUsuarios());
    }

    if (filtroRol) {
        filtroRol.addEventListener('change', () => renderizarTablaUsuarios());
    }

    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', () => cargarUsuarios(true));
    }

    // Eventos del Modal de Confirmación de Eliminación
    const modalEliminar = document.getElementById('modal-confirmar-eliminar-usuario');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-eliminar-usuario');
    const btnCancelarModal = document.getElementById('btn-cancelar-eliminar-usuario');
    const btnConfirmarModal = document.getElementById('btn-confirmar-eliminar-usuario');

    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalEliminarUsuario);
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModalEliminarUsuario);

    if (modalEliminar) {
        modalEliminar.querySelectorAll('[data-modal-close], .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', cerrarModalEliminarUsuario);
        });
        modalEliminar.addEventListener('click', (e) => {
            if (e.target === modalEliminar) cerrarModalEliminarUsuario();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalEliminar && (modalEliminar.classList.contains('open') || modalEliminar.classList.contains('active') || modalEliminar.style.display === 'flex')) {
            cerrarModalEliminarUsuario();
        }
    });

    if (btnConfirmarModal) {
        btnConfirmarModal.addEventListener('click', ejecutarEliminacionUsuario);
    }
}

async function cargarUsuarios(mostrarNotificacion = false) {
    const tbody = document.getElementById('tabla-usuarios');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    <i class="fa-solid fa-circle-notch fa-spin" style="margin-right: 8px;"></i>
                    Cargando directorio de usuarios...
                </td>
            </tr>
        `;
    }

    try {
        const res = await obtenerUsuarios();
        listaUsuarios = Array.isArray(res.data) ? res.data : [];
        actualizarKPIsUsuarios(listaUsuarios);
        renderizarTablaUsuarios();

        if (mostrarNotificacion) {
            Toast.info('Directorio Sincronizado', 'Se actualizó la lista de usuarios y roles.', 2000);
        }
    } catch (error) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2.5rem; color: #ef4444;">
                        <i class="fa-solid fa-circle-exclamation" style="margin-right: 8px;"></i>
                        ${escaparHTML(error.message || 'No se pudo cargar la lista de usuarios.')}
                    </td>
                </tr>
            `;
        }
        Toast.error('Error al cargar usuarios', error.message || 'Fallo de comunicación con el servidor.');
    }
}

function actualizarKPIsUsuarios(usuarios) {
    const total = usuarios.length;
    const admins = usuarios.filter(u => u.rol === 'ADMIN').length;
    const operadores = usuarios.filter(u => u.rol === 'OPERADOR').length;

    const elTotal = document.getElementById('kpi-total-usuarios');
    const elAdmins = document.getElementById('kpi-total-admins');
    const elOperadores = document.getElementById('kpi-total-operadores');

    if (elTotal) elTotal.textContent = String(total);
    if (elAdmins) elAdmins.textContent = String(admins);
    if (elOperadores) elOperadores.textContent = String(operadores);
}

function renderizarTablaUsuarios() {
    const tbody = document.getElementById('tabla-usuarios');
    const counterEl = document.getElementById('counter-usuarios');
    if (!tbody) return;

    const busqueda = (document.getElementById('input-busqueda-usuarios')?.value || '').trim().toLowerCase();
    const rolFiltro = (document.getElementById('filtro-rol-usuarios')?.value || '').trim().toUpperCase();

    const filtrados = listaUsuarios.filter(u => {
        const coincideTexto = !busqueda ||
            (u.nombre && u.nombre.toLowerCase().includes(busqueda)) ||
            (u.email && u.email.toLowerCase().includes(busqueda));
        const coincideRol = !rolFiltro || u.rol === rolFiltro;
        return coincideTexto && coincideRol;
    });

    if (counterEl) {
        counterEl.textContent = `Mostrando ${filtrados.length} de ${listaUsuarios.length} usuarios registrados`;
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    <i class="fa-solid fa-users-slash" style="font-size: 1.25rem; display: block; margin-bottom: 8px;"></i>
                    No se encontraron usuarios que coincidan con los criterios de búsqueda.
                </td>
            </tr>
        `;
        return;
    }

    const currentSessionUser = usuarioActual || obtenerUsuarioActual();
    const currentUserId = Number(currentSessionUser?.id || 0);
    const totalAdmins = listaUsuarios.filter(u => u.rol === 'ADMIN').length;

    tbody.innerHTML = filtrados.map(u => {
        const id = Number(u.id);
        const esMismoUsuario = id === currentUserId;
        const esAdminUser = u.rol === 'ADMIN';
        const esUltimoAdmin = esAdminUser && totalAdmins <= 1;

        const badgeRol = esAdminUser
            ? `<span class="badge" style="background: var(--text-primary); color: var(--bg-surface); border: 1px solid var(--text-primary); font-weight: 600; padding: 3px 10px; border-radius: 9999px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-user-shield" style="font-size: 11px;"></i>
                    <span>ADMIN</span>
               </span>`
            : `<span class="badge" style="background: var(--bg-muted); color: var(--text-secondary); border: 1px solid var(--border-color); font-weight: 600; padding: 3px 10px; border-radius: 9999px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-user-gear" style="font-size: 11px;"></i>
                    <span>OPERADOR</span>
               </span>`;

        const etiquetaSesionActual = esMismoUsuario
            ? `<span style="margin-left: 8px; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px; background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25);">Tú (Sesión activa)</span>`
            : '';

        const fechaFormateada = formatearFechaRegistro(u.created_at);

        // Botón de cambio de rol según rol actual
        let btnRolHTML = '';
        if (!esAdminUser) {
            btnRolHTML = `
                <button type="button" class="btn-icon btn-cambiar-rol" data-id="${id}" data-nuevo-rol="ADMIN" data-nombre="${escaparAtributo(u.nombre)}"
                    title="Promover a Administrador (ADMIN)" aria-label="Promover a Administrador"
                    style="padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 6px; color: #10b981; background: var(--bg-surface); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;">
                    <i class="fa-solid fa-shield-halved"></i>
                    <span>Promover</span>
                </button>
            `;
        } else {
            const disabledAttr = (esMismoUsuario || esUltimoAdmin) ? 'disabled' : '';
            const disabledTitle = esMismoUsuario
                ? 'No puedes revocar tus propios privilegios de Administrador'
                : (esUltimoAdmin ? 'No se puede degradar al último Administrador del sistema' : 'Degradar a Operador (OPERADOR)');
            const disabledStyle = (esMismoUsuario || esUltimoAdmin)
                ? 'opacity: 0.45; cursor: not-allowed;'
                : 'cursor: pointer;';

            btnRolHTML = `
                <button type="button" class="btn-icon btn-cambiar-rol" data-id="${id}" data-nuevo-rol="OPERADOR" data-nombre="${escaparAtributo(u.nombre)}"
                    title="${disabledTitle}" aria-label="Degradar a Operador" ${disabledAttr}
                    style="padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 6px; color: #f59e0b; background: var(--bg-surface); display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; ${disabledStyle}">
                    <i class="fa-solid fa-user-minus"></i>
                    <span>Degradar</span>
                </button>
            `;
        }

        // Botón eliminar (deshabilitado para sí mismo o último admin)
        const disableDelete = esMismoUsuario || esUltimoAdmin;
        const deleteTitle = esMismoUsuario
            ? 'No puedes eliminar tu propia cuenta en sesión'
            : (esUltimoAdmin ? 'No se puede eliminar al último Administrador del sistema' : 'Eliminar / Desactivar usuario');
        const deleteStyle = disableDelete ? 'opacity: 0.4; cursor: not-allowed;' : 'cursor: pointer; color: #ef4444;';

        const btnEliminarHTML = `
            <button type="button" class="btn-icon btn-eliminar-usuario" data-id="${id}" data-nombre="${escaparAtributo(u.nombre)}" data-email="${escaparAtributo(u.email)}"
                title="${deleteTitle}" aria-label="Eliminar usuario" ${disableDelete ? 'disabled' : ''}
                style="padding: 6px 9px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-surface); ${deleteStyle}">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 34px; height: 34px; border-radius: 8px; background: var(--bg-muted); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; color: var(--text-primary); flex-shrink: 0;">
                            ${obtenerIniciales(u.nombre)}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary); display: flex; align-items: center;">
                                <span>${escaparHTML(u.nombre)}</span>
                                ${etiquetaSesionActual}
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">ID #${id}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span style="font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-secondary);">
                        <i class="fa-solid fa-envelope" style="margin-right: 6px; color: var(--text-muted); font-size: 12px;"></i>${escaparHTML(u.email)}
                    </span>
                </td>
                <td>${badgeRol}</td>
                <td>
                    <span style="font-size: 0.8125rem; color: var(--text-secondary);">
                        <i class="fa-solid fa-calendar-day" style="margin-right: 6px; color: var(--text-muted); font-size: 12px;"></i>${fechaFormateada}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px;">
                        ${btnRolHTML}
                        ${btnEliminarHTML}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Conectar eventos de botones de acción en las filas
    tbody.querySelectorAll('.btn-cambiar-rol').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (btn.disabled) return;
            const idUsuario = Number(btn.dataset.id);
            const nuevoRol = btn.dataset.nuevoRol;
            const nombre = btn.dataset.nombre || 'el usuario';
            await manejarCambioRol(idUsuario, nuevoRol, nombre, btn);
        });
    });

    tbody.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            abrirModalEliminarUsuario(
                Number(btn.dataset.id),
                btn.dataset.nombre || '',
                btn.dataset.email || ''
            );
        });
    });
}

async function manejarCambioRol(idUsuario, nuevoRol, nombre, btnElement) {
    const htmlOriginal = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;

    try {
        const res = await cambiarRolUsuario(idUsuario, nuevoRol);
        Toast.success(
            'Privilegios Actualizados',
            res.message || `Rol de ${nombre} actualizado a ${nuevoRol}.`,
            3000
        );
        await cargarUsuarios(false);
    } catch (error) {
        btnElement.disabled = false;
        btnElement.innerHTML = htmlOriginal;
        Toast.error('Operación Rechazada', error.message || 'No se pudo cambiar el rol del usuario.');
    }
}

function abrirModalEliminarUsuario(id, nombre, email) {
    const modal = document.getElementById('modal-confirmar-eliminar-usuario');
    const inputId = document.getElementById('eliminar-usuario-id');
    const spanNombre = document.getElementById('eliminar-usuario-nombre');
    const spanEmail = document.getElementById('eliminar-usuario-email');

    if (inputId) inputId.value = String(id);
    if (spanNombre) spanNombre.textContent = nombre;
    if (spanEmail) spanEmail.textContent = email;

    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => {
            modal.classList.add('open', 'active');
        });
    }
}

function cerrarModalEliminarUsuario() {
    const modal = document.getElementById('modal-confirmar-eliminar-usuario');
    const inputId = document.getElementById('eliminar-usuario-id');
    const spanNombre = document.getElementById('eliminar-usuario-nombre');
    const spanEmail = document.getElementById('eliminar-usuario-email');

    if (inputId) inputId.value = '';
    if (spanNombre) spanNombre.textContent = '--';
    if (spanEmail) spanEmail.textContent = '--';

    if (modal) {
        modal.classList.remove('open', 'active');
        modal.setAttribute('aria-hidden', 'true');
        modal.style.display = 'none';
    }
}

async function ejecutarEliminacionUsuario() {
    const inputId = document.getElementById('eliminar-usuario-id');
    const btnConfirmar = document.getElementById('btn-confirmar-eliminar-usuario');
    const idUsuario = Number(inputId?.value || 0);

    if (!idUsuario) return;

    const htmlOriginal = btnConfirmar ? btnConfirmar.innerHTML : '';
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><span>Eliminando...</span>`;
    }

    try {
        const res = await eliminarUsuario(idUsuario);
        cerrarModalEliminarUsuario();
        Toast.success('Usuario Eliminado', res.message || 'El usuario ha sido retirado del sistema.');
        await cargarUsuarios(false);
    } catch (error) {
        Toast.error('No se pudo eliminar', error.message || 'Error al eliminar el usuario.');
    } finally {
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = htmlOriginal;
        }
    }
}

function formatearFechaRegistro(fechaStr) {
    if (!fechaStr) return 'Sin registro';
    const normalizada = String(fechaStr).replace(' ', 'T');
    const fecha = new Date(normalizada);
    if (isNaN(fecha.getTime())) return String(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function obtenerIniciales(nombre) {
    if (!nombre) return 'US';
    const partes = String(nombre).trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function escaparHTML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escaparAtributo(str) {
    return escaparHTML(str);
}

