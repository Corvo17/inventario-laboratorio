import { verificarSesion, aplicarPermisosDOM, actualizarSidebarUsuario, obtenerUsuarioActual } from '../services/auth.service.js';
import { initThemeToggle } from '../components/theme-toggle.js';
import { initCommandPalette } from '../components/command-palette.js';
/**
 * Módulo de Inventario de Equipos & Activos
 * Implementado con arquitectura Shadcn UI y Vanilla JS ES6.
 * Iconografía estandarizada con FontAwesome Classic v6.
 */

import { 
    obtenerEquipos, 
    obtenerSalas, 
    obtenerPuestosDisponibles, 
    registrarEquipo, 
    actualizarEquipo,
    generarUrlQr,
    apiService,
    obtenerHojaVidaEquipo
} from '../services/api.service.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { Toast } from '../components/toast.js';
import { exportarTablaCSV, imprimirActaEquipo } from '../components/reportes.js';

// Elementos de la Vista Principal
const tablaEquipos = document.getElementById('tabla-equipos');
const counterEquipos = document.getElementById('counter-equipos');
const btnExportarInventario = document.getElementById('btn-exportar-inventario');
const btnImprimirActa = document.getElementById('btn-imprimir-acta');
const inputBusqueda = document.getElementById('input-busqueda');
const filtroSala = document.getElementById('filtro-sala');
const selectEstadoFiltro = document.getElementById('filtro-estado') || document.getElementById('select-estado') || document.getElementById('select-estado-filtro');

// Modal: Alta de Equipo
const modalRegistro = document.getElementById('modal-nuevo-equipo') || document.getElementById('modal-registro-equipo');
const btnNuevoEquipo = document.getElementById('btn-nuevo-equipo');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const btnCancelarModal = document.getElementById('btn-cancelar-modal');
const formNuevoEquipo = document.getElementById('form-nuevo-equipo');
const selectSala = document.getElementById('select-sala');
const selectPuesto = document.getElementById('select-puesto');
const modalAlert = document.getElementById('modal-alert');
const btnGuardarEquipo = document.getElementById('btn-guardar-equipo');
const btnGuardarTexto = document.getElementById('btn-guardar-texto');

// Modal: Visualización e Impresión de QR
const modalQr = document.getElementById('modal-etiqueta-qr') || document.getElementById('modal-qr-equipo');
const btnCerrarQr = document.getElementById('btn-cerrar-qr');
const btnCancelarQr = document.getElementById('btn-cancelar-qr');
const btnImprimirQr = document.getElementById('btn-imprimir-qr');
const btnImprimirActaDirecta = document.getElementById('btn-imprimir-acta-directa');
const qrCanvasWrapper = document.getElementById('qr-canvas-wrapper');
const qrCodigoDisplay = document.getElementById('qr-label-codigo') || document.getElementById('qr-codigo-display');
const qrModeloDisplay = document.getElementById('qr-label-modelo') || document.getElementById('qr-modelo-display');
const qrSerialDisplay = document.getElementById('qr-label-serial') || document.getElementById('qr-serial-display');
const qrSalaDisplay = document.getElementById('qr-label-ubicacion') || document.getElementById('qr-sala-display');
const qrPuestoDisplay = document.getElementById('qr-puesto-display');

// Modal: Ficha Técnica Detallada
const modalDetalle = document.getElementById('modal-detalle-equipo');
const detalleTimelineContainer = document.getElementById('detalle-timeline-container');

const btnCerrarDetalle = document.getElementById('btn-cerrar-detalle');
const btnCerrarDetallePie = document.getElementById('btn-cerrar-detalle-pie');
const btnDetalleAbrirQr = document.getElementById('btn-detalle-abrir-qr');
const btnFichaReportar = document.getElementById('btn-ficha-reportar');
const detalleCodigo = document.getElementById('detalle-codigo');
const detalleCategoriaTag = document.getElementById('detalle-categoria-tag');
const detalleBadgeEstado = document.getElementById('detalle-badge-estado');
const detalleNombreModelo = document.getElementById('detalle-nombre-modelo');
const detalleSerial = document.getElementById('detalle-serial');
const detalleSalaNombre = document.getElementById('detalle-sala-nombre');
const detallePuestoNombre = document.getElementById('detalle-puesto-nombre');
const detalleSpecCpu = document.getElementById('detalle-spec-cpu');
const detalleSpecRam = document.getElementById('detalle-spec-ram');
const detalleSpecDisco = document.getElementById('detalle-spec-disco');
const detalleSpecIp = document.getElementById('detalle-spec-ip');
const detalleSpecMac = document.getElementById('detalle-spec-mac');
const detalleSpecFecha = document.getElementById('detalle-spec-fecha');
const detalleNotas = document.getElementById('detalle-notas');
const detalleHistorialContainer = document.getElementById('detalle-historial-container');

// Modal: Edición de Activo
const modalEditar = document.getElementById('modal-editar-equipo');
const formEditar = document.getElementById('form-editar-equipo');
const btnCerrarEdit = document.getElementById('btn-cerrar-edit');
const btnCancelarEdit = document.getElementById('btn-cancelar-edit');
const alertEdit = document.getElementById('modal-edit-alert');
const selectEditSala = document.getElementById('edit-select-sala') || document.getElementById('edit-sala');
const selectEditPuesto = document.getElementById('edit-select-puesto') || document.getElementById('edit-puesto');

// Modal: Confirmación de Baja Lógica
const modalBaja = document.getElementById('modal-confirmar-baja');
const formBaja = document.getElementById('form-confirmar-baja');
const btnCerrarBaja = document.getElementById('btn-cerrar-baja');
const btnCancelarBaja = document.getElementById('btn-cancelar-baja');
const inputBajaId = document.getElementById('baja-equipo-id');
const bajaCodigoDisplay = document.getElementById('baja-equipo-codigo') || document.getElementById('baja-codigo-display');
const alertBaja = document.getElementById('modal-baja-alert');

// Estado local de la vista
let searchTimeout = null;
let currentFilters = { search: '', estado: '', sala_id: '' };
let salasCache = [];
let equiposCache = [];
let equipoDetalleActual = null;
let equipoSeleccionadoId = null;

/* ==========================================================================
   RENDERIZADO DE TABLA & ESTADOS VISUALES
   ========================================================================== */

function renderSkeletonLoading() {
    if (!tablaEquipos) return;
    tablaEquipos.innerHTML = Array(5).fill(0).map(() => `
        <tr class="skeleton-row">
            <td><div class="skeleton-bar" style="width: 90px;"></div></td>
            <td>
                <div class="skeleton-bar" style="width: 140px; margin-bottom: 6px;"></div>
                <div class="skeleton-bar" style="width: 80px; height: 10px;"></div>
            </td>
            <td>
                <div class="skeleton-bar" style="width: 120px; margin-bottom: 4px;"></div>
                <div class="skeleton-bar" style="width: 70px; height: 10px;"></div>
            </td>
            <td><div class="skeleton-bar" style="width: 180px;"></div></td>
            <td><div class="skeleton-bar" style="width: 85px;"></div></td>
            <td style="text-align: right;"><div class="skeleton-bar" style="width: 100px; margin-left: auto;"></div></td>
        </tr>
    `).join('');
}

function renderEmptyState(message = 'No se encontraron equipos') {
    if (!tablaEquipos) return;
    tablaEquipos.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fa-solid fa-magnifying-glass" style="font-size: 22px; color: var(--text-muted);"></i>
                    </div>
                    <div class="empty-state-title">${message}</div>
                    <div class="empty-state-desc">Intenta ajustar los términos de búsqueda o cambiar los filtros seleccionados.</div>
                    <button id="btn-reset-filters" class="btn btn-outline" style="margin-top: 8px;">
                        <i class="fa-solid fa-rotate-left"></i>
                        <span>Limpiar Filtros</span>
                    </button>
                </div>
            </td>
        </tr>
    `;

    const btnReset = document.getElementById('btn-reset-filters');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (inputBusqueda) inputBusqueda.value = '';
            if (selectEstadoFiltro) selectEstadoFiltro.value = '';
            if (filtroSala) filtroSala.value = '';
            currentFilters.search = '';
            currentFilters.estado = '';
            currentFilters.sala_id = '';
            cargarInventario();
        });
    }

    if (counterEquipos) {
        counterEquipos.textContent = '0 equipos encontrados';
    }
}

function formatearSpecs(equipo) {
    const specs = [];
    if (equipo.cpu) specs.push(`<span class="spec-item-compact" title="Procesador"><i class="fa-solid fa-microchip"></i> ${equipo.cpu}</span>`);
    if (equipo.ram_gb) specs.push(`<span class="spec-item-compact" title="Memoria RAM"><i class="fa-solid fa-memory"></i> ${equipo.ram_gb} GB</span>`);
    if (equipo.almacenamiento) specs.push(`<span class="spec-item-compact" title="Almacenamiento"><i class="fa-solid fa-hard-drive"></i> ${equipo.almacenamiento}</span>`);
    if (equipo.ip_asignada) specs.push(`<span class="spec-item-compact" title="Dirección IP"><i class="fa-solid fa-network-wired"></i> ${equipo.ip_asignada}</span>`);

    return specs.length > 0 
        ? `<div class="spec-list-compact">${specs.join('')}</div>`
        : '<span style="color: var(--text-subtle); font-size: 12px;">Sin especificaciones registradas</span>';
}

function renderizarTabla(equipos) {
    equiposCache = Array.isArray(equipos) ? equipos : [];
    if (!tablaEquipos) return;

    if (equiposCache.length === 0) {
        renderEmptyState();
        return;
    }

    tablaEquipos.innerHTML = equiposCache.map(equipo => {
        const ubicacionTexto = equipo.sala_nombre || 'Sin sala asignada';
        const puestoTexto = equipo.puesto_codigo ? `Puesto: ${equipo.puesto_codigo}` : 'Sin puesto fijo';
        const specsHtml = formatearSpecs(equipo);
        const badgeHtml = renderStatusBadge(equipo.estado);
        const catTag = equipo.categoria ? `<span class="cat-tag">${equipo.categoria.replace(/_/g, ' ')}</span>` : '';
        const esBaja = equipo.estado === 'DE_BAJA';

        return `
            <tr data-id="${equipo.id}">
                <td>
                    <span class="cell-code">${equipo.codigo_patrimonial}</span>
                    <div class="cell-serial">S/N: ${equipo.numero_serie || 'N/A'}</div>
                </td>
                <td>
                    <div class="cell-primary-title">${equipo.marca} ${equipo.modelo}</div>
                    <div style="margin-top: 4px;">${catTag}</div>
                </td>
                <td>
                    <div class="cell-location">
                        <span class="cell-primary-title" style="font-size: 13px;">${ubicacionTexto}</span>
                        <span class="cell-puesto-tag">${puestoTexto}</span>
                    </div>
                </td>
                <td>
                    <div class="cell-specs">${specsHtml}</div>
                </td>
                <td>
                    ${badgeHtml}
                </td>
                <td style="text-align: right;">
                    <div class="actions-group" style="justify-content: flex-end; gap: 4px;">
                        <button class="btn-icon btn-action-view" title="Ver ficha técnica" data-id="${equipo.id}">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-action-qr" title="Generar / Imprimir QR" data-id="${equipo.id}" data-codigo="${equipo.codigo_patrimonial}">
                            <i class="fa-solid fa-qrcode"></i>
                        </button>
                        <button class="btn-icon btn-action-edit" title="Editar Activo" data-id="${equipo.id}">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        ${esBaja ? `
                            <button class="btn-icon btn-action-baja opacity-40 cursor-not-allowed" disabled title="Activo ya desincorporado" data-id="${equipo.id}" style="opacity: 0.4; cursor: not-allowed; pointer-events: none;">
                                <i class="fa-solid fa-ban"></i>
                            </button>
                        ` : `
                            <button class="btn-icon btn-action-baja text-danger" data-role="ADMIN" title="Dar de Baja / Desincorporar" data-id="${equipo.id}">
                                <i class="fa-solid fa-ban"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (counterEquipos) {
        const total = equiposCache.length;
        counterEquipos.textContent = `${total} equipo${total === 1 ? '' : 's'} en total`;
    }

    // Delegación de Eventos en Filas
    document.querySelectorAll('.btn-action-qr').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id') || e.currentTarget.closest('tr')?.getAttribute('data-id');
            const equipo = equiposCache.find(eq => String(eq.id) === String(id));
            if (equipo) {
                abrirModalQr(equipo);
            } else if (id) {
                await imprimirActaEquipo(id);
            }
        });
    });

    document.querySelectorAll('.btn-action-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id') || e.currentTarget.closest('tr')?.getAttribute('data-id');
            if (id) abrirModalDetalle(id);
        });
    });

    document.querySelectorAll('.btn-action-edit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id') || e.currentTarget.closest('tr')?.getAttribute('data-id');
            let equipo = equiposCache.find(eq => String(eq.id) === String(id));
            if (equipo) {
                await abrirModalEditar(equipo);
            } else if (id) {
                try {
                    const res = await obtenerHojaVidaEquipo(id);
                    if (res?.success && res.data?.equipo) {
                        await abrirModalEditar(res.data.equipo);
                    }
                } catch (err) {
                    Toast.error('Error', 'No se pudieron cargar los datos del equipo para edición.');
                }
            }
        });
    });

    document.querySelectorAll('.btn-action-baja').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.disabled) return;
            const id = e.currentTarget.getAttribute('data-id') || e.currentTarget.closest('tr')?.getAttribute('data-id');
            const equipo = equiposCache.find(eq => String(eq.id) === String(id));
            if (equipo && equipo.estado !== 'DE_BAJA') {
                abrirModalBaja(equipo);
            }
        });
    });
}

// Alias para interoperabilidad de carga
export async function cargarEquipos() {
    return await cargarInventario();
}
window.cargarEquipos = cargarInventario;
window.cargarInventario = cargarInventario;

function renderErrorState(message = 'Error al cargar el inventario') {
    if (!tablaEquipos) return;
    tablaEquipos.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="empty-state" style="border: 1px dashed rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.03); border-radius: var(--radius-md); margin: 0.75rem;">
                    <div class="empty-state-icon">
                        <i class="fa-solid fa-circle-exclamation" style="font-size: 24px; color: #ef4444;"></i>
                    </div>
                    <div class="empty-state-title" style="color: var(--text-primary);">No se pudieron cargar los activos</div>
                    <div class="empty-state-desc">${message}</div>
                    <button id="btn-retry-inventario" class="btn btn-primary" style="margin-top: 10px;">
                        <i class="fa-solid fa-rotate-right"></i>
                        <span>Reintentar Carga</span>
                    </button>
                </div>
            </td>
        </tr>
    `;

    const btnRetry = document.getElementById('btn-retry-inventario');
    if (btnRetry) {
        btnRetry.addEventListener('click', () => cargarInventario());
    }

    if (counterEquipos) {
        counterEquipos.textContent = 'Error de conexión';
    }
}

async function cargarInventario() {
    renderSkeletonLoading();
    if (counterEquipos) {
        counterEquipos.textContent = 'Consultando registros...';
    }

    try {
        const respuesta = await obtenerEquipos(currentFilters);
        if (respuesta && respuesta.success && Array.isArray(respuesta.data)) {
            renderizarTabla(respuesta.data);
        } else {
            renderErrorState(respuesta?.message || 'Respuesta inválida del servidor.');
        }
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        renderErrorState(error.message || 'No se pudo conectar con la API en PHP. Verifica que el servidor y MySQL estén activos.');
        if (Toast && typeof Toast.error === 'function') {
            Toast.error('Error de Conexión', error.message || 'No se pudo cargar el inventario.');
        }
    }
}

/**
 * Puebla el selector de filtro por salas
 */
async function poblarFiltroSalas() {
    if (!filtroSala) return;
    try {
        const respuesta = await obtenerSalas();
        let salas = [];
        if (respuesta && respuesta.success && Array.isArray(respuesta.data)) {
            salas = respuesta.data;
        } else if (Array.isArray(respuesta)) {
            salas = respuesta;
        }

        salasCache = salas;
        let options = '<option value="">Todas las Salas</option>';
        salas.forEach(sala => {
            if (sala && sala.id !== undefined && sala.nombre) {
                options += `<option value="${sala.id}">${sala.nombre}</option>`;
            }
        });
        filtroSala.innerHTML = options;
    } catch (e) {
        console.error('Error al poblar filtro de salas:', e);
    }
}

/* ==========================================================================
   MODAL 1: ALTA DE EQUIPO Y ASIGNACIÓN DINÁMICA
   ========================================================================== */

function mostrarErrorModal(mensaje) {
    if (!modalAlert) return;
    modalAlert.textContent = mensaje;
    modalAlert.className = 'alert-message alert-error';
    modalAlert.style.display = 'block';
}

function ocultarErrorModal() {
    if (!modalAlert) return;
    modalAlert.style.display = 'none';
}

async function cargarSalasEnModal(targetSelect) {
    if (!targetSelect) return;
    try {
        if (salasCache.length === 0) {
            const respuesta = await obtenerSalas();
            if (respuesta.success && Array.isArray(respuesta.data)) {
                salasCache = respuesta.data;
            }
        }
        targetSelect.innerHTML = '<option value="">Selecciona una sala...</option>' +
            salasCache.map(sala => `<option value="${sala.id}">${sala.nombre}</option>`).join('');
    } catch (e) {
        targetSelect.innerHTML = '<option value="">Error al cargar salas</option>';
    }
}

async function actualizarPuestosPorSala(salaId, targetSelectPuesto, selectedPuestoId = null) {
    if (!targetSelectPuesto) return;
    if (!salaId) {
        targetSelectPuesto.innerHTML = '<option value="">Selecciona primero una sala</option>';
        targetSelectPuesto.disabled = true;
        return;
    }

    targetSelectPuesto.disabled = true;
    targetSelectPuesto.innerHTML = '<option value="">Cargando puestos disponibles...</option>';

    try {
        const salaSeleccionada = salasCache.find(s => String(s.id) === String(salaId));
        if (salaSeleccionada && parseInt(salaSeleccionada.capacidad_puestos) === 0) {
            targetSelectPuesto.innerHTML = '<option value="">No aplica (Área de Depósito / Almacén)</option>';
            targetSelectPuesto.disabled = true;
            return;
        }

        const respuesta = await obtenerPuestosDisponibles(salaId);
        if (respuesta.success) {
            const puestos = respuesta.data || [];
            if (puestos.length === 0 && !selectedPuestoId) {
                targetSelectPuesto.innerHTML = '<option value="">Sin puestos libres disponibles</option>';
                targetSelectPuesto.disabled = true;
            } else {
                let options = '<option value="">Sin puesto fijo (Mesa general / Reserva)</option>';
                puestos.forEach(p => {
                    const sel = (selectedPuestoId && String(p.id) === String(selectedPuestoId)) ? 'selected' : '';
                    options += `<option value="${p.id}" ${sel}>Puesto ${p.codigo_puesto}</option>`;
                });
                targetSelectPuesto.innerHTML = options;
                targetSelectPuesto.disabled = false;
            }
        }
    } catch (e) {
        targetSelectPuesto.innerHTML = '<option value="">Error al consultar puestos</option>';
        targetSelectPuesto.disabled = true;
    }
}

async function abrirModalAlta() {
    if (!modalRegistro) return;
    if (formNuevoEquipo) formNuevoEquipo.reset();
    ocultarErrorModal();
    if (btnGuardarEquipo) {
        btnGuardarEquipo.disabled = false;
        btnGuardarEquipo.innerHTML = 'Registrar Equipo';
    }
    if (selectPuesto) {
        selectPuesto.disabled = true;
        selectPuesto.innerHTML = '<option value="">Selecciona primero una sala</option>';
    }
    
    const fechaInput = document.getElementById('input-fecha-ingreso');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }
    
    await cargarSalasEnModal(selectSala);
    modalRegistro.style.display = 'flex';
    modalRegistro.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarModalAlta() {
    if (!modalRegistro) return;
    if (formNuevoEquipo) formNuevoEquipo.reset();
    ocultarErrorModal();
    if (btnGuardarEquipo) {
        btnGuardarEquipo.disabled = false;
        btnGuardarEquipo.innerHTML = 'Registrar Equipo';
    }
    if (selectPuesto) {
        selectPuesto.disabled = true;
        selectPuesto.innerHTML = '<option value="">Selecciona primero una sala</option>';
    }
    modalRegistro.classList.remove('open');
    modalRegistro.style.display = 'none';
    document.body.style.overflow = '';
}

/* ==========================================================================
   MODAL 2: ETIQUETAS QR & IMPRESIÓN
   ========================================================================== */

function abrirModalQr(equipo) {
    if (!equipo || !modalQr) return;
    equipoDetalleActual = equipo;

    if (qrCodigoDisplay) qrCodigoDisplay.textContent = equipo.codigo_patrimonial || 'PAT-000';
    if (qrModeloDisplay) qrModeloDisplay.textContent = `${equipo.marca || ''} ${equipo.modelo || ''}`.trim() || 'Activo';
    if (qrSerialDisplay) qrSerialDisplay.textContent = `S/N: ${equipo.numero_serie || 'N/A'}`;
    const ubicacionStr = equipo.sala_nombre ? `${equipo.sala_nombre}${equipo.puesto_codigo ? ' - Puesto ' + equipo.puesto_codigo : ''}` : 'Sin sala asignada';
    if (qrSalaDisplay) qrSalaDisplay.textContent = ubicacionStr;
    if (qrPuestoDisplay) qrPuestoDisplay.textContent = equipo.puesto_codigo || 'General';

    if (qrCanvasWrapper) {
        qrCanvasWrapper.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            const payloadQr = generarUrlQr(equipo.codigo_patrimonial);
            new QRCode(qrCanvasWrapper, {
                text: payloadQr,
                width: 140,
                height: 140,
                colorDark: '#0f172a',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            qrCanvasWrapper.innerHTML = `
                <div style="font-size: 11px; color: var(--text-muted); text-align: center;">
                    <i class="fa-solid fa-qrcode" style="font-size: 40px; margin-bottom: 6px;"></i>
                    <div>${equipo.codigo_patrimonial}</div>
                </div>
            `;
        }
    }

    modalQr.classList.add('open');
    modalQr.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarModalQr() {
    if (!modalQr) return;
    modalQr.classList.remove('open');
    modalQr.style.display = 'none';
    document.body.style.overflow = '';
}

/* ==========================================================================
   MODAL 3: FICHA TÉCNICA DETALLADA
   ========================================================================== */

async function abrirModalDetalle(id) {
    if (!modalDetalle) return;

    modalDetalle.classList.add('open');
    document.body.style.overflow = 'hidden';

    detalleCodigo.textContent = '...';
    detalleNombreModelo.textContent = 'Cargando datos del activo...';
    detalleSerial.textContent = '';
    detalleSalaNombre.textContent = '';
    detallePuestoNombre.textContent = '';
    detalleBadgeEstado.innerHTML = '';
    if (detalleTimelineContainer) {
        detalleTimelineContainer.innerHTML = `
            <div class="timeline-empty">
                <i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px;"></i>
                Cargando trazabilidad y hoja de vida...
            </div>
        `;
    }

    equipoSeleccionadoId = id;


    try {
        const res = await obtenerHojaVidaEquipo(id);
        if (!res || !res.success || !res.data) {
            throw new Error(res?.message || 'No se pudo obtener la hoja de vida del equipo.');
        }

        const data = res.data;
        const eq = data.equipo || {};
        equipoDetalleActual = eq;
        equipoDetalleActual.timeline = data.timeline || [];

        detalleCodigo.textContent = eq.codigo_patrimonial || 'PAT-000';
        detalleCategoriaTag.textContent = (eq.categoria || 'EQUIPO').replace(/_/g, ' ');
        detalleBadgeEstado.innerHTML = renderStatusBadge(eq.estado);
        detalleNombreModelo.textContent = `${eq.marca || ''} ${eq.modelo || ''}`.trim() || 'Activo';
        detalleSerial.textContent = `Número de Serie: ${eq.numero_serie || 'N/A'}`;
        detalleSalaNombre.textContent = eq.sala_nombre || 'Sin sala asignada';
        detallePuestoNombre.textContent = eq.puesto_codigo ? `Puesto Asignado: ${eq.puesto_codigo}` : 'Sin puesto fijo';

        detalleSpecCpu.textContent = eq.cpu || 'No especificado';
        detalleSpecRam.textContent = eq.ram_gb ? `${eq.ram_gb} GB` : 'No especificado';
        detalleSpecDisco.textContent = eq.almacenamiento || 'No especificado';
        detalleSpecIp.textContent = eq.ip_asignada || 'No asignada';
        detalleSpecMac.textContent = eq.mac_address || 'No registrada';
        detalleSpecFecha.textContent = eq.fecha_ingreso || 'N/A';
        detalleNotas.textContent = eq.notas || 'Sin observaciones adicionales registradas.';

        // Renderizar Línea de Tiempo Unificada
        const timeline = data.timeline || [];
        if (detalleTimelineContainer) {
            if (timeline.length === 0) {
                detalleTimelineContainer.innerHTML = `
                    <div class="timeline-empty">
                        <i class="fa-solid fa-circle-info" style="margin-right: 6px;"></i>
                        No se registran movimientos históricos para este activo.
                    </div>
                `;
            } else {
                detalleTimelineContainer.innerHTML = timeline.map(item => {
                    let dotClass = 'dot-alta';
                    let iconName = 'fa-box-archive';
                    let badgeHtml = '';
                    let bodyDetailsHtml = '';

                    if (item.tipo === 'ALTA') {
                        dotClass = 'dot-alta';
                        iconName = 'fa-box-archive';
                        badgeHtml = '<span class="status-badge badge-operativo">INCORPORACIÓN</span>';
                        bodyDetailsHtml = `<div>${item.descripcion || 'Alta formal en el inventario del laboratorio.'}</div>`;
                    } else if (item.tipo === 'REUBICACION') {
                        dotClass = 'dot-alta';
                        iconName = 'fa-desktop';
                        badgeHtml = '<span class="status-badge badge-operativo">PUESTO FÍSICO</span>';
                        bodyDetailsHtml = `<div>${item.descripcion || item.ubicacion || 'Asignación física a puesto en sala.'}</div>`;
                    } else if (item.tipo === 'BAJA') {
                        dotClass = 'dot-baja';
                        iconName = 'fa-ban';
                        badgeHtml = '<span class="status-badge badge-de-baja">DE BAJA</span>';
                        bodyDetailsHtml = `<div>${item.descripcion || 'Activo desincorporado del inventario operativo.'}</div>`;
                    }

                    const fechaVisual = item.fecha ? item.fecha.replace('T', ' ') : 'N/A';

                    return `
                        <div class="timeline-item">
                            <div class="timeline-dot ${dotClass}">
                                <i class="fa-solid ${iconName}"></i>
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-header">
                                    <div class="timeline-title-wrap">
                                        <span class="timeline-title">${item.titulo}</span>
                                        ${badgeHtml}
                                    </div>
                                    <span class="timeline-date"><i class="fa-regular fa-clock"></i> ${fechaVisual}</span>
                                </div>
                                <div class="timeline-body">
                                    ${bodyDetailsHtml}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

    } catch (err) {
        console.error('Error al abrir detalle:', err);
        Toast.error('Error de lectura', err.message || 'No se pudo cargar la hoja de vida.');
        cerrarModalDetalle();
    }
}

function cerrarModalDetalle() {
    modalDetalle.classList.remove('open');
    document.body.style.overflow = '';
}

/* ==========================================================================
   MODAL 4: EDICIÓN DE EQUIPO
   ========================================================================== */

async function abrirModalEditar(equipo) {
    if (!modalEditar) return;

    if (formEditar) formEditar.reset();
    if (alertEdit) alertEdit.style.display = 'none';

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = (val !== null && val !== undefined) ? val : '';
    };

    setVal('edit-equipo-id', equipo.id);
    setVal('edit-codigo', equipo.codigo_patrimonial);
    setVal('edit-serial', equipo.numero_serie);
    setVal('edit-marca', equipo.marca);
    setVal('edit-modelo', equipo.modelo);
    setVal('edit-categoria', equipo.categoria || 'PC_ESCRITORIO');
    setVal('edit-estado', equipo.estado || 'OPERATIVO');
    setVal('edit-fecha-ingreso', equipo.fecha_ingreso);
    setVal('edit-cpu', equipo.cpu);
    setVal('edit-ram', equipo.ram_gb);
    setVal('edit-disco', equipo.almacenamiento);
    setVal('edit-ip', equipo.ip_asignada);
    setVal('edit-mac', equipo.mac_address);
    setVal('edit-notas', equipo.notas);

    if (selectEditSala) {
        await cargarSalasEnModal(selectEditSala);
        if (equipo.sala_id) {
            selectEditSala.value = String(equipo.sala_id);
            if (selectEditPuesto) {
                await actualizarPuestosPorSala(equipo.sala_id, selectEditPuesto, equipo.puesto_id);
            }
        } else if (selectEditPuesto) {
            selectEditPuesto.innerHTML = '<option value="">Sin sala asignada</option>';
            selectEditPuesto.disabled = true;
        }
    }

    modalEditar.classList.add('open');
    modalEditar.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarModalEditar() {
    if (!modalEditar) return;
    modalEditar.classList.remove('open');
    modalEditar.style.display = 'none';
    document.body.style.overflow = '';
}

/* ==========================================================================
   MODAL 5: DESINCORPORACIÓN (BAJA LÓGICA)
   ========================================================================== */

function abrirModalBaja(equipo) {
    if (!modalBaja) return;

    formBaja.reset();
    if (alertBaja) alertBaja.style.display = 'none';

    inputBajaId.value = equipo.id;
    if (bajaCodigoDisplay) {
        bajaCodigoDisplay.textContent = `${equipo.codigo_patrimonial} (${equipo.marca} ${equipo.modelo})`;
    }

    modalBaja.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarModalBaja() {
    modalBaja.classList.remove('open');
    document.body.style.overflow = '';
}

/* ==========================================================================
   INICIALIZACIÓN DE EVENTOS GLOBALES
   ========================================================================== */

async function inicializarVistaInventario() {
    // 0. Sincronización inmediata del Usuario desde caché local (sin latencia de red)
    try {
        const cachedUser = obtenerUsuarioActual();
        if (cachedUser) {
            actualizarSidebarUsuario(cachedUser);
            aplicarPermisosDOM(cachedUser);
        }
    } catch (e) {
        console.warn('Error al sincronizar usuario local:', e);
    }

    // 1. Cargar inventario inmediatamente en la tabla
    try {
        await cargarInventario();
    } catch (err) {
        console.error('Error inicial al cargar inventario:', err);
    }

    // 2. Verificación de sesión viva con el backend en segundo plano
    try {
        const freshUser = await verificarSesion();
        if (freshUser) {
            actualizarSidebarUsuario(freshUser);
            aplicarPermisosDOM(freshUser);
        }
    } catch (e) {
        console.warn('Verificación de sesión en segundo plano:', e);
    }

    // 3. Poblar salas en el filtro
    try {
        await poblarFiltroSalas();
    } catch (err) {
        console.error('Error inicial al poblar salas:', err);
    }

    // 4. Listener reactivo para Filtro de Salas
    if (filtroSala) {
        filtroSala.addEventListener('change', (e) => {
            const val = e.target.value;
            currentFilters.sala_id = (val && val !== 'undefined') ? val : '';
            cargarInventario();
        });
    }

    // 4. Filtro por Estado
    if (selectEstadoFiltro) {
        selectEstadoFiltro.addEventListener('change', (e) => {
            currentFilters.estado = e.target.value || '';
            cargarInventario();
        });
    }

    // 5. Filtro en vivo de Texto (Debounce 300ms)
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentFilters.search = e.target.value.trim();
                cargarInventario();
            }, 300);
        });
    }

    // 6. Alta de Equipo
    if (btnNuevoEquipo) btnNuevoEquipo.addEventListener('click', abrirModalAlta);
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalAlta);
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModalAlta);
    if (modalRegistro) {
        modalRegistro.addEventListener('click', (e) => {
            if (e.target === modalRegistro) cerrarModalAlta();
        });
    }

    if (selectSala) {
        selectSala.addEventListener('change', (e) => {
            actualizarPuestosPorSala(e.target.value, selectPuesto);
        });
    }

        if (formNuevoEquipo) {
        formNuevoEquipo.addEventListener('submit', async (e) => {
            e.preventDefault();
            ocultarErrorModal();

            const originalGuardarHtml = btnGuardarEquipo ? btnGuardarEquipo.innerHTML : '';
            if (btnGuardarEquipo) {
                btnGuardarEquipo.disabled = true;
                btnGuardarEquipo.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...';
            }

            try {
                const formData = new FormData(formNuevoEquipo);
                const respuesta = await registrarEquipo(formData);

                if (respuesta.success) {
                    Toast.success('Equipo Registrado', 'El activo patrimonial fue guardado correctamente.');
                    cerrarModalAlta();
                    cargarInventario();
                } else {
                    mostrarErrorModal(respuesta.message || 'Error al guardar el equipo.');
                    Toast.error('Error al Registrar', respuesta.message || 'No se pudo guardar.');
                }
            } catch (error) {
                mostrarErrorModal(error.message || 'Error de conexión.');
                Toast.error('Error de Conexión', error.message);
            } finally {
                if (btnGuardarEquipo) {
                    btnGuardarEquipo.disabled = false;
                    btnGuardarEquipo.innerHTML = originalGuardarHtml;
                }
            }
        });
    }

        // 7. Modal QR
    if (btnCerrarQr) btnCerrarQr.addEventListener('click', cerrarModalQr);
    if (btnCancelarQr) btnCancelarQr.addEventListener('click', cerrarModalQr);
    if (modalQr) {
        modalQr.addEventListener('click', (e) => {
            if (e.target === modalQr) cerrarModalQr();
        });
    }

    if (btnImprimirQr) {
        btnImprimirQr.addEventListener('click', () => {
            window.print();
        });
    }

    if (btnImprimirActaDirecta) {
        btnImprimirActaDirecta.addEventListener('click', async () => {
            if (equipoDetalleActual && (equipoDetalleActual.id || equipoDetalleActual.codigo_patrimonial)) {
                await imprimirActaEquipo(equipoDetalleActual, equipoDetalleActual.timeline || []);
            } else {
                Toast.warning('Atención', 'No hay datos cargados del activo.');
            }
        });
    }

    // 8. Modal Detalle
    if (btnCerrarDetalle) btnCerrarDetalle.addEventListener('click', cerrarModalDetalle);
    if (btnCerrarDetallePie) btnCerrarDetallePie.addEventListener('click', cerrarModalDetalle);
    if (modalDetalle) {
        modalDetalle.addEventListener('click', (e) => {
            if (e.target === modalDetalle) cerrarModalDetalle();
        });
    }

    if (btnDetalleAbrirQr) {
        btnDetalleAbrirQr.addEventListener('click', () => {
            if (equipoDetalleActual) {
                cerrarModalDetalle();
                abrirModalQr(equipoDetalleActual);
            }
        });
    }

    // Exportar CSV del Inventario
    if (btnExportarInventario) {
        btnExportarInventario.addEventListener('click', () => {
            if (!equiposCache || equiposCache.length === 0) {
                Toast.warning('Inventario vacío', 'No hay registros visibles en pantalla para exportar.');
                return;
            }

            const encabezados = [
                'Código Patrimonial',
                'Serial',
                'Categoría',
                'Marca',
                'Modelo',
                'Sala',
                'Puesto',
                'Estado',
                'Procesador',
                'RAM',
                'Almacenamiento',
                'IP'
            ];

            const filas = equiposCache.map(eq => [
                eq.codigo_patrimonial || '',
                eq.numero_serie || eq.serie || '',
                (eq.categoria || '').replace(/_/g, ' '),
                eq.marca || '',
                eq.modelo || '',
                eq.sala_nombre || 'Sin sala asignada',
                eq.puesto_codigo || 'Sin puesto fijo',
                eq.estado || '',
                eq.cpu || '',
                eq.ram_gb ? `${eq.ram_gb} GB` : '',
                eq.almacenamiento || '',
                eq.ip_asignada || ''
            ]);

            exportarTablaCSV('Inventario', encabezados, filas);
            Toast.success('Exportación completada', `${filas.length} activos exportados con éxito a formato CSV (Excel).`);
        });
    }

    // Imprimir Acta Oficial del Equipo
    if (btnImprimirActa) {
        btnImprimirActa.addEventListener('click', () => {
            if (!equipoDetalleActual) {
                Toast.warning('Atención', 'No hay un equipo seleccionado para generar el acta.');
                return;
            }
            imprimirActaEquipo(equipoDetalleActual, equipoDetalleActual.timeline || []);
        });
    }

    // 9. Modal Edición
    if (btnCerrarEdit) btnCerrarEdit.addEventListener('click', cerrarModalEditar);
    if (btnCancelarEdit) btnCancelarEdit.addEventListener('click', cerrarModalEditar);
    if (modalEditar) {
        modalEditar.addEventListener('click', (e) => {
            if (e.target === modalEditar) cerrarModalEditar();
        });
    }

    if (selectEditSala) {
        selectEditSala.addEventListener('change', (e) => {
            actualizarPuestosPorSala(e.target.value, selectEditPuesto);
        });
    }

    if (formEditar) {
        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-guardar-edit');
            const originalEditHtml = btnSubmit ? btnSubmit.innerHTML : '';
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...';
            }

            const id = document.getElementById('edit-equipo-id').value;
            const payload = {
                codigo_patrimonial: document.getElementById('edit-codigo').value.trim(),
                numero_serie: document.getElementById('edit-serial').value.trim(),
                marca: document.getElementById('edit-marca').value.trim(),
                modelo: document.getElementById('edit-modelo').value.trim(),
                categoria: document.getElementById('edit-categoria').value,
                estado: document.getElementById('edit-estado').value,
                fecha_ingreso: document.getElementById('edit-fecha-ingreso').value || null,
                sala_id: selectEditSala ? selectEditSala.value : null,
                puesto_id: selectEditPuesto && selectEditPuesto.value ? selectEditPuesto.value : null,
                cpu: document.getElementById('edit-cpu').value.trim() || null,
                ram_gb: document.getElementById('edit-ram').value || null,
                almacenamiento: document.getElementById('edit-disco').value.trim() || null,
                ip_asignada: document.getElementById('edit-ip').value.trim() || null,
                mac_address: document.getElementById('edit-mac').value.trim() || null,
                notas: document.getElementById('edit-notas').value.trim() || null
            };

            try {
                const res = await actualizarEquipo(id, payload);
                if (res && res.success) {
                    Toast.success('Activo Actualizado', 'Los cambios en la ficha patrimonial han sido guardados.');
                    cerrarModalEditar();
                    await cargarInventario();
                } else {
                    const msg = res?.message || 'Error al actualizar equipo.';
                    if (alertEdit) {
                        alertEdit.textContent = msg;
                        alertEdit.style.display = 'block';
                    }
                    Toast.error('Error al Actualizar', msg);
                }
            } catch (err) {
                if (alertEdit) {
                    alertEdit.textContent = err.message || 'Error de conexión con el servidor.';
                    alertEdit.style.display = 'block';
                }
                Toast.error('Error', err.message || 'Error de conexión.');
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = originalEditHtml;
                }
            }
        });
    }

    // 10. Modal Baja
    if (btnCerrarBaja) btnCerrarBaja.addEventListener('click', cerrarModalBaja);
    if (btnCancelarBaja) btnCancelarBaja.addEventListener('click', cerrarModalBaja);
    if (modalBaja) {
        modalBaja.addEventListener('click', (e) => {
            if (e.target === modalBaja) cerrarModalBaja();
        });
    }

        if (formBaja) {
        formBaja.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-dar-baja');
            const originalBajaHtml = btnSubmit ? btnSubmit.innerHTML : '';
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...';
            }

            const id = inputBajaId.value;
            const motivo = (document.getElementById('baja-motivo') || document.getElementById('input-motivo-baja'))?.value.trim() || '';

            try {
                const res = await fetch(`../api/routes/equipos.php?action=dar-de-baja&id=${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ motivo })
                });
                const data = await res.json();
                if (data.success) {
                    Toast.warning('Activo Desincorporado', 'El equipo ha sido marcado DE_BAJA y su puesto liberado.');
                    cerrarModalBaja();
                    cargarInventario();
                } else {
                    if (alertBaja) {
                        alertBaja.textContent = data.message || 'Error al desincorporar.';
                        alertBaja.style.display = 'block';
                    }
                    Toast.error('Error', data.message || 'Error al desincorporar.');
                }
            } catch (err) {
                if (alertBaja) {
                    alertBaja.textContent = 'Error de conexión con el servidor.';
                    alertBaja.style.display = 'block';
                }
                Toast.error('Error', err.message);
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = originalBajaHtml;
                }
            }
        });
    }

    // Validación en tiempo real de Formato IPv4 y MAC
    const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

    function aplicarValidacionRed(inputEl, regex) {
        if (!inputEl) return;
        inputEl.addEventListener('input', () => {
            const val = inputEl.value.trim();
            if (val === '') {
                inputEl.style.borderColor = '';
                inputEl.style.boxShadow = '';
                return;
            }
            if (regex.test(val)) {
                inputEl.style.borderColor = 'var(--color-success, #22c55e)';
                inputEl.style.boxShadow = '0 0 0 1px var(--color-success, #22c55e)';
            } else {
                inputEl.style.borderColor = 'var(--destructive, #ef4444)';
                inputEl.style.boxShadow = '0 0 0 1px var(--destructive, #ef4444)';
            }
        });
    }

    aplicarValidacionRed(document.getElementById('input-ip'), ipv4Regex);
    aplicarValidacionRed(document.getElementById('edit-ip'), ipv4Regex);
    aplicarValidacionRed(document.getElementById('input-mac'), macRegex);
    aplicarValidacionRed(document.getElementById('edit-mac'), macRegex);

    // 7. Detección y Preselección de Nuevo Equipo desde Puesto Libre o Parámetros URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('accion') === 'nuevo') {
        await abrirModalAlta();

        const salaId = params.get('sala_id');
        const puestoId = params.get('puesto_id');

        if (salaId && selectSala) {
            selectSala.value = String(salaId);
            // Sincronizar puestos disponibles para la sala seleccionada
            await actualizarPuestosPorSala(salaId, selectPuesto, puestoId);
            if (puestoId && selectPuesto) {
                selectPuesto.value = String(puestoId);
            }
        }

        // Foco accesible en el código patrimonial
        const inputCodigo = document.getElementById('nuevo-codigo-patrimonial') || document.getElementById('input-codigo');
        if (inputCodigo) {
            setTimeout(() => inputCodigo.focus(), 150);
        }
    } else if (params.get('buscar')) {
        const query = params.get('buscar').trim();
        if (inputBusqueda) {
            inputBusqueda.value = query;
            currentFilters.search = query;
            cargarInventario();
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarVistaInventario);
} else {
    inicializarVistaInventario();
}

// Inicializar Modo Oscuro / Claro
initThemeToggle();

// Inicializar Command Palette Global (Ctrl + K)
initCommandPalette();

    // Delegación universal para cierre de modales vía atributo data-modal-close
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-modal-close]');
        if (closeBtn) {
            const modal = closeBtn.closest('.modal-backdrop');
            if (modal) {
                modal.classList.remove('open');
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }
    });

// Delegación universal para cierre de modales vía atributo data-modal-close
document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-modal-close]');
    if (closeBtn) {
        const modal = closeBtn.closest('.modal-backdrop');
        if (modal) {
            if (modal.id === 'modal-nuevo-equipo' || modal.id === 'modal-registro-equipo') {
                cerrarModalAlta();
            } else if (modal.id === 'modal-editar-equipo') {
                cerrarModalEditar();
            } else if (modal.id === 'modal-confirmar-baja') {
                cerrarModalBaja();
            } else if (modal.id === 'modal-etiqueta-qr' || modal.id === 'modal-qr-equipo') {
                cerrarModalQr();
            } else if (modal.id === 'modal-detalle-equipo') {
                cerrarModalDetalle();
            } else {
                modal.classList.remove('open');
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }
    }
});

// Cierre accesible con tecla Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (modalRegistro && modalRegistro.classList.contains('open')) cerrarModalAlta();
        if (modalEditar && modalEditar.classList.contains('open')) cerrarModalEditar();
        if (modalBaja && modalBaja.classList.contains('open')) cerrarModalBaja();
        if (modalQr && modalQr.classList.contains('open')) cerrarModalQr();
        if (modalDetalle && modalDetalle.classList.contains('open')) cerrarModalDetalle();
    }
});
