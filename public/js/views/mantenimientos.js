import { initThemeToggle } from '../components/theme-toggle.js';
import { initCommandPalette } from '../components/command-palette.js';
import { Toast } from '../components/toast.js';
import { exportarTablaCSV } from '../components/reportes.js';
import { 
    obtenerMantenimientos, 
    obtenerEstadisticasMantenimiento,
    actualizarBadgeSidebarMantenimiento, 
    registrarMantenimiento, 
    resolverMantenimiento, 
    obtenerEquipos 
} from '../services/api.service.js';

import { 
    renderPriorityBadge, 
    renderMaintenanceStatusBadge 
} from '../components/status-badge.js';

// Elementos del DOM
const tablaMantenimientos = document.getElementById('tabla-mantenimientos');
const counterMantenimientos = document.getElementById('counter-mantenimientos');
const btnExportarMantenimientos = document.getElementById('btn-exportar-mantenimientos');
let mantenimientosCache = [];
const inputBusqueda = document.getElementById('input-busqueda-mant');
const selectFiltroEstado = document.getElementById('select-filtro-estado');
const selectFiltroPrioridad = document.getElementById('select-filtro-prioridad');
const btnNuevaIncidencia = document.getElementById('btn-nueva-incidencia');

// Tarjetas de estadísticas
const statPendientes = document.getElementById('stat-pendientes');
const statEnCurso = document.getElementById('stat-en-curso');
const statResueltos = document.getElementById('stat-resueltos');
const statTotal = document.getElementById('stat-total');

// Modal Reportar Incidencia
const modalReportar = document.getElementById('modal-reportar-incidencia');
const btnCerrarRep = document.getElementById('btn-cerrar-rep');
const btnCancelarRep = document.getElementById('btn-cancelar-rep');
const formReportar = document.getElementById('form-reportar-incidencia');
const selectEquipoMantenimiento = document.getElementById('select-equipo-mantenimiento');
const alertRep = document.getElementById('alert-rep');
const btnSubmitRep = document.getElementById('btn-submit-rep');
const btnRepTexto = document.getElementById('btn-rep-texto');

// Modal Resolver Orden
const modalResolver = document.getElementById('modal-resolver-orden');
const btnCerrarRes = document.getElementById('btn-cerrar-res');
const btnCancelarRes = document.getElementById('btn-cancelar-res');
const formResolver = document.getElementById('form-resolver-orden');
const inputResId = document.getElementById('res-mantenimiento-id');
const resEquipoResumen = document.getElementById('res-equipo-resumen');
const resFallaResumen = document.getElementById('res-falla-resumen');
const alertRes = document.getElementById('alert-res');
const btnSubmitRes = document.getElementById('btn-submit-res');
const btnResTexto = document.getElementById('btn-res-texto');

// Estado local
let searchTimeout = null;
let currentFilters = { search: '', estado_resultado: '', prioridad: '' };
let equiposCache = [];

function renderSkeletonLoading() {
    tablaMantenimientos.innerHTML = Array(4).fill(0).map(() => `
        <tr class="skeleton-row">
            <td><div class="skeleton-bar" style="width: 110px;"></div></td>
            <td>
                <div class="skeleton-bar" style="width: 170px; margin-bottom: 6px;"></div>
                <div class="skeleton-bar" style="width: 100px; height: 10px;"></div>
            </td>
            <td><div class="skeleton-bar" style="width: 80px;"></div></td>
            <td><div class="skeleton-bar" style="width: 120px;"></div></td>
            <td><div class="skeleton-bar" style="width: 90px;"></div></td>
            <td><div class="skeleton-bar" style="width: 95px;"></div></td>
            <td style="text-align: right;"><div class="skeleton-bar" style="width: 70px; margin-left: auto;"></div></td>
        </tr>
    `).join('');
}

function renderEmptyState(message = 'No se encontraron registros de mantenimiento') {
    tablaMantenimientos.innerHTML = `
        <tr>
            <td colspan="7">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fa-solid fa-clipboard-check" style="font-size: 22px; color: #10b981;"></i>
                    </div>
                    <div class="empty-state-title">${message}</div>
                    <div class="empty-state-desc">No hay incidencias reportadas con los filtros seleccionados o el laboratorio está completamente operativo.</div>
                </div>
            </td>
        </tr>
    `;
    if (counterMantenimientos) counterMantenimientos.textContent = '0 órdenes encontradas';
}

function renderizarTabla(mantenimientos) {
    mantenimientosCache = Array.isArray(mantenimientos) ? mantenimientos : [];
    if (!mantenimientos || mantenimientos.length === 0) {
        renderEmptyState();
        return;
    }

    tablaMantenimientos.innerHTML = mantenimientos.map(item => {
        const priorityBadge = renderPriorityBadge(item.prioridad);
        const statusBadge = renderMaintenanceStatusBadge(item.estado_resultado);
        const fechaReporte = item.fecha_reporte ? item.fecha_reporte.split(' ')[0] : 'N/A';
        const esResuelto = item.estado_resultado === 'RESUELTO' || item.estado_resultado === 'DERIVADO_A_BAJA';

        return `
            <tr data-id="${item.id}">
                <td>
                    <span class="cell-code">${item.codigo_patrimonial}</span>
                    <div class="cell-subtitle">${item.marca} ${item.modelo}</div>
                    <div class="cell-puesto-tag" style="margin-top: 2px;">${item.sala_nombre || 'Sin sala'}</div>
                </td>
                <td>
                    <div class="cell-primary-title">${item.titulo}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${item.descripcion_falla}
                    </div>
                    <span class="cat-tag" style="margin-top: 4px;">${item.tipo}</span>
                </td>
                <td>
                    ${priorityBadge}
                </td>
                <td>
                    <span style="font-weight: 500;">${item.tecnico_responsable}</span>
                </td>
                <td>
                    <span style="color: var(--text-muted); font-size: 12.5px;">${fechaReporte}</span>
                </td>
                <td>
                    ${statusBadge}
                </td>
                <td style="text-align: right;">
                    <div class="actions-group" style="justify-content: flex-end;">
                        ${!esResuelto ? `
                            <button class="btn btn-primary btn-sm btn-resolver-orden" style="padding: 4px 10px; font-size: 12px;" data-id="${item.id}" data-codigo="${item.codigo_patrimonial}" data-titulo="${item.titulo}">
                                <i class="fa-solid fa-check"></i>
                                <span>Resolver</span>
                            </button>
                        ` : `
                            <span style="font-size: 12px; color: #10b981; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fa-solid fa-circle-check"></i> Cerrada
                            </span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (counterMantenimientos) {
        const total = mantenimientos.length;
        counterMantenimientos.textContent = `${total} orden${total === 1 ? '' : 'es'} en total`;
    }

    // Delegación de botón Resolver
    document.querySelectorAll('.btn-resolver-orden').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const codigo = e.currentTarget.getAttribute('data-codigo');
            const titulo = e.currentTarget.getAttribute('data-titulo');
            abrirModalResolver(id, codigo, titulo);
        });
    });
}

async function cargarEstadisticas() {
    try {
        const res = await obtenerEstadisticasMantenimiento();
        if (res.success && res.data) {
            statPendientes.textContent = res.data.pendientes;
            actualizarBadgeSidebarMantenimiento();
            statEnCurso.textContent = res.data.en_curso;
            statResueltos.textContent = res.data.resueltos;
            statTotal.textContent = res.data.total;
        }
    } catch (e) {
        console.error('Error al cargar métricas:', e);
    }
}

async function cargarBitacora() {
    renderSkeletonLoading();
    try {
        const res = await obtenerMantenimientos(currentFilters);
        if (res.success) {
            renderizarTabla(res.data);
        } else {
            renderEmptyState(res.message);
        }
    } catch (e) {
        renderEmptyState('Error de conexión con el backend.');
    }
}

/* ==========================================================================
   Lógica Modal 1: Reportar Incidencia (Sincronización Estricta)
   ========================================================================== */

/**
 * Puebla el selector de equipos y retorna la promesa resuelta
 */
async function poblarSelectEquipos() {
    if (!selectEquipoMantenimiento) return [];
    selectEquipoMantenimiento.innerHTML = '<option value="">Cargando catálogo de equipos...</option>';
    try {
        if (!equiposCache || equiposCache.length === 0) {
            const res = await obtenerEquipos();
            if (res && res.success && Array.isArray(res.data)) {
                equiposCache = res.data;
            } else if (Array.isArray(res)) {
                equiposCache = res;
            }
        }

        let options = '<option value="">Selecciona el equipo...</option>';
        equiposCache.forEach(eq => {
            options += `<option value="${eq.id}">${eq.codigo_patrimonial} • ${eq.marca} ${eq.modelo} (${eq.sala_nombre || 'Sin sala'})</option>`;
        });
        selectEquipoMantenimiento.innerHTML = options;
        return equiposCache;
    } catch (e) {
        console.error('Error al cargar catálogo de equipos:', e);
        selectEquipoMantenimiento.innerHTML = '<option value="">Error al cargar equipos</option>';
        return [];
    }
}

// Alias para mantener compatibilidad
const cargarEquiposSelect = poblarSelectEquipos;

/**
 * Abre el modal de reporte asegurando la carga de opciones antes de asignar valor
 */
async function abrirModalReporte(preselectedEquipoId = null) {
    if (alertRep) alertRep.style.display = 'none';

    // 1. Asegurar estado inicial del selector habilitado
    if (selectEquipoMantenimiento) {
        selectEquipoMantenimiento.removeAttribute('disabled');
        selectEquipoMantenimiento.style.pointerEvents = '';
        selectEquipoMantenimiento.style.backgroundColor = '';
        selectEquipoMantenimiento.style.cursor = '';
    }

    // 2. Esperar estrictamente a que las opciones existan en el DOM
    await poblarSelectEquipos();

    // 3. Preseleccionar y bloquear si viene desde un atajo
    if (preselectedEquipoId && selectEquipoMantenimiento) {
        selectEquipoMantenimiento.value = String(preselectedEquipoId);
        // Bloquear el selector para que no se cambie por error desde este atajo
        selectEquipoMantenimiento.setAttribute('disabled', 'true');
        selectEquipoMantenimiento.style.backgroundColor = 'var(--bg-muted)';
        selectEquipoMantenimiento.style.cursor = 'not-allowed';
    }

    // 4. Mostrar modal
    modalReportar.classList.add('open');
    document.body.style.overflow = 'hidden';

    // 5. Foco en el campo de título
    setTimeout(() => {
        const inputTitulo = document.getElementById('input-titulo-incidencia');
        if (inputTitulo) inputTitulo.focus();
    }, 120);
}

// Alias para mantener compatibilidad
const abrirModalReportar = abrirModalReporte;

function cerrarModalReportar() {
    modalReportar.classList.remove('open');
    document.body.style.overflow = '';

    // Resetear selector y formulario
    if (selectEquipoMantenimiento) {
        selectEquipoMantenimiento.removeAttribute('disabled');
        selectEquipoMantenimiento.style.pointerEvents = '';
        selectEquipoMantenimiento.style.backgroundColor = '';
        selectEquipoMantenimiento.style.cursor = '';
        selectEquipoMantenimiento.value = '';
    }
    formReportar.reset();
}

btnNuevaIncidencia.addEventListener('click', () => {
    formReportar.reset();
    abrirModalReporte(null);
});

btnCerrarRep.addEventListener('click', cerrarModalReportar);
btnCancelarRep.addEventListener('click', cerrarModalReportar);

formReportar.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (alertRep) alertRep.style.display = 'none';

    // Serializar campos del formulario
    const formData = new FormData(formReportar);
    const payload = {};
    formData.forEach((val, key) => payload[key] = val.trim());

    // Asegurar lectura de equipo_id incluso si el select tiene atributo disabled
    if (selectEquipoMantenimiento) {
        payload['equipo_id'] = selectEquipoMantenimiento.value;
    }

    if (!payload['equipo_id']) {
        if (alertRep) {
            alertRep.textContent = 'Por favor selecciona un equipo válido.';
            alertRep.style.display = 'block';
        }
        return;
    }

    btnSubmitRep.disabled = true;
    if (btnRepTexto) btnRepTexto.textContent = 'Registrando...';

    try {
        const res = await registrarMantenimiento(payload);
        if (res.success) {
            cerrarModalReportar();
            await cargarEstadisticas();
            await cargarBitacora();
            Toast.warning('Incidencia registrada', 'Se abrió la orden técnica y el equipo cambió a CON FALLA.');
        } else {
            if (alertRep) {
                alertRep.textContent = res.message || 'Error al registrar.';
                alertRep.style.display = 'block';
            }
            Toast.error('Error al registrar', res.message || 'Error desconocido');
        }
    } catch (err) {
        if (alertRep) {
            alertRep.textContent = err.message || 'Error de conexión.';
            alertRep.style.display = 'block';
        }
        Toast.error('Error de conexión', err.message);
    } finally {
        btnSubmitRep.disabled = false;
        if (btnRepTexto) btnRepTexto.textContent = 'Registrar Falla';
    }
});

/* ==========================================================================
   Lógica Modal 2: Resolver Orden
   ========================================================================== */

function abrirModalResolver(id, codigo, titulo) {
    formResolver.reset();
    alertRes.style.display = 'none';
    inputResId.value = id;
    resEquipoResumen.textContent = `Activo: ${codigo}`;
    resFallaResumen.textContent = `Falla reportada: ${titulo}`;

    modalResolver.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarModalResolver() {
    modalResolver.classList.remove('open');
    document.body.style.overflow = '';
}

btnCerrarRes.addEventListener('click', cerrarModalResolver);
btnCancelarRes.addEventListener('click', cerrarModalResolver);

formResolver.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertRes.style.display = 'none';

    const formData = new FormData(formResolver);
    const id = inputResId.value;
    const payload = {
        diagnostico_tecnico: formData.get('diagnostico_tecnico'),
        acciones_realizadas: formData.get('acciones_realizadas'),
        estado_equipo: formData.get('estado_equipo')
    };

    btnSubmitRes.disabled = true;
    btnResTexto.textContent = 'Guardando...';

    try {
        const res = await resolverMantenimiento(id, payload);
        if (res.success) {
            cerrarModalResolver();
            await cargarEstadisticas();
            await cargarBitacora();
            Toast.success('Orden resuelta', 'Mantenimiento cerrado con éxito y equipo restablecido a OPERATIVO.');
        } else {
            alertRes.textContent = res.message || 'Error al resolver.';
            alertRes.style.display = 'block';
        }
    } catch (err) {
        alertRes.textContent = err.message || 'Error de conexión.';
        alertRes.style.display = 'block';
    } finally {
        btnSubmitRes.disabled = false;
        btnResTexto.textContent = 'Confirmar y Cerrar Orden';
    }
});

/* ==========================================================================
   Filtros y Búsqueda en Bitácora
   ========================================================================== */

inputBusqueda.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value;
    searchTimeout = setTimeout(() => {
        currentFilters.search = query;
        cargarBitacora();
    }, 300);
});

selectFiltroEstado.addEventListener('change', (e) => {
    currentFilters.estado_resultado = e.target.value;
    cargarBitacora();
});

selectFiltroPrioridad.addEventListener('change', (e) => {
    currentFilters.prioridad = e.target.value;
    cargarBitacora();
});

// Inicialización de la vista
document.addEventListener('DOMContentLoaded', async () => {
    await cargarEstadisticas();
    await cargarBitacora();

    // Exportar Bitácora en CSV
    if (btnExportarMantenimientos) {
        btnExportarMantenimientos.addEventListener('click', () => {
            if (!mantenimientosCache || mantenimientosCache.length === 0) {
                Toast.warning('Bitácora vacía', 'No hay órdenes de mantenimiento en pantalla para exportar.');
                return;
            }

            const encabezados = [
                'ID Orden',
                'Código Equipo',
                'Equipo',
                'Sala',
                'Tipo Servicio',
                'Prioridad',
                'Estado',
                'Técnico Responsable',
                'Fecha Reporte',
                'Descripción / Diagnóstico'
            ];

            const filas = mantenimientosCache.map(m => [
                m.id || '',
                m.codigo_patrimonial || '',
                `${m.marca || ''} ${m.modelo || ''}`.trim(),
                m.sala_nombre || 'Sin sala asignada',
                m.tipo || '',
                m.prioridad || '',
                m.estado_resultado || '',
                m.tecnico_responsable || '',
                m.fecha_reporte ? m.fecha_reporte.split(' ')[0] : '',
                m.diagnostico_tecnico ? `${m.descripcion_falla || ''} [Diagnóstico: ${m.diagnostico_tecnico}]` : (m.descripcion_falla || '')
            ]);

            exportarTablaCSV('Bitacora_Mantenimientos', encabezados, filas);
            Toast.success('Exportación completada', `${filas.length} órdenes exportadas a Excel (CSV con UTF-8 BOM).`);
        });
    }

    // Sincronización estricta para atajo rápido (?equipo_id=X)
    const params = new URLSearchParams(window.location.search);
    const equipoId = params.get('equipo_id');

    if (equipoId) {
        await poblarSelectEquipos(); // Esperar a que los <option> existan en el DOM
        const selectEquipo = document.getElementById('select-equipo-mantenimiento');
        if (selectEquipo) {
            selectEquipo.value = String(equipoId);
            // Bloquear el selector para que no se cambie por error desde este atajo
            selectEquipo.setAttribute('disabled', 'true');
            selectEquipo.style.backgroundColor = 'var(--bg-muted)';
            selectEquipo.style.cursor = 'not-allowed';
        }
        modalReportar.classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            document.getElementById('input-titulo-incidencia')?.focus();
        }, 120);
    }
});

// Inicializar Modo Oscuro / Claro
initThemeToggle();

// Inicializar Command Palette Global (Ctrl + K)
initCommandPalette();
