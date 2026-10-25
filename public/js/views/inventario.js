import { verificarSesion, aplicarPermisosDOM } from '../services/auth.service.js';
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
    generarUrlQr,
    apiService,
    obtenerHojaVidaEquipo,
    registrarPrestamoEquipo,
    registrarDevolucionEquipo
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
const modalRegistro = document.getElementById('modal-registro-equipo');
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
const modalQr = document.getElementById('modal-qr-equipo');
const btnCerrarQr = document.getElementById('btn-cerrar-qr');
const btnCancelarQr = document.getElementById('btn-cancelar-qr');
const btnImprimirQr = document.getElementById('btn-imprimir-qr');
const qrCanvasWrapper = document.getElementById('qr-canvas-wrapper');
const qrCodigoDisplay = document.getElementById('qr-codigo-display');
const qrModeloDisplay = document.getElementById('qr-modelo-display');
const qrSerialDisplay = document.getElementById('qr-serial-display');
const qrSalaDisplay = document.getElementById('qr-sala-display');
const qrPuestoDisplay = document.getElementById('qr-puesto-display');

// Modal: Ficha Técnica Detallada
const modalDetalle = document.getElementById('modal-detalle-equipo');
const btnAbrirPrestamo = document.getElementById('btn-abrir-prestamo');
const prestamoBannerContainer = document.getElementById('prestamo-banner-container');
const detalleTimelineContainer = document.getElementById('detalle-timeline-container');

// Modal: Gestión de Préstamos
const modalPrestamo = document.getElementById('modal-prestamo-equipo');
const btnCerrarPrestamo = document.getElementById('btn-cerrar-prestamo');
const btnCancelarPrestamo = document.getElementById('btn-cancelar-prestamo');
const formPrestamo = document.getElementById('form-prestamo-equipo');
const prestamoEquipoId = document.getElementById('prestamo-equipo-id');
const prestamoActivoCodigo = document.getElementById('prestamo-activo-codigo');
const prestamoActivoNombre = document.getElementById('prestamo-activo-nombre');
const prestamoActivoCategoria = document.getElementById('prestamo-activo-categoria');
const prestamoSolicitante = document.getElementById('prestamo-solicitante');
const prestamoIdentificacion = document.getElementById('prestamo-identificacion');
const prestamoFechaEstimada = document.getElementById('prestamo-fecha-estimada');
const prestamoDestino = document.getElementById('prestamo-destino');
const prestamoObservaciones = document.getElementById('prestamo-observaciones');
const btnGuardarPrestamo = document.getElementById('btn-guardar-prestamo');

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
const selectEditSala = document.getElementById('edit-sala');
const selectEditPuesto = document.getElementById('edit-puesto');

// Modal: Confirmación de Baja Lógica
const modalBaja = document.getElementById('modal-confirmar-baja');
const formBaja = document.getElementById('form-confirmar-baja');
const btnCerrarBaja = document.getElementById('btn-cerrar-baja');
const btnCancelarBaja = document.getElementById('btn-cancelar-baja');
const inputBajaId = document.getElementById('baja-equipo-id');
const bajaCodigoDisplay = document.getElementById('baja-codigo-display');
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
                        <button class="btn-icon btn-action-qr" title="Generar / Imprimir QR" data-codigo="${equipo.codigo_patrimonial}">
                            <i class="fa-solid fa-qrcode"></i>
                        </button>
                        <button class="btn-icon btn-action-edit" title="Editar Activo" data-id="${equipo.id}">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-icon btn-action-baja text-danger" data-role="ADMIN" title="Dar de Baja / Desincorporar" data-id="${equipo.id}" ${esBaja ? 'disabled style="opacity: 0.35; cursor: not-allowed;"' : ''}>
                            <i class="fa-solid fa-ban"></i>
                        </button>
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
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.closest('tr').getAttribute('data-id');
            const equipo = equiposCache.find(eq => String(eq.id) === String(id));
            if (equipo) abrirModalQr(equipo);
        });
    });

    document.querySelectorAll('.btn-action-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            abrirModalDetalle(id);
        });
    });

    document.querySelectorAll('.btn-action-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const equipo = equiposCache.find(eq => String(eq.id) === String(id));
            if (equipo) abrirModalEditar(equipo);
        });
    });

    document.querySelectorAll('.btn-action-baja').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const equipo = equiposCache.find(eq => String(eq.id) === String(id));
            if (equipo && equipo.estado !== 'DE_BAJA') {
                abrirModalBaja(equipo);
            }
        });
    });
}

/**
 * Carga el inventario aplicando los filtros activos
 */
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
            renderEmptyState('Error al cargar datos: ' + (respuesta?.message || 'Respuesta inválida'));
        }
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        renderEmptyState('No se pudo conectar con la API en PHP. Verifica que el servidor esté activo.');
        if (counterEquipos) {
            counterEquipos.textContent = 'Error al cargar';
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
    formNuevoEquipo.reset();
    ocultarErrorModal();
    selectPuesto.disabled = true;
    selectPuesto.innerHTML = '<option value="">Selecciona primero una sala</option>';
    
    const fechaInput = document.getElementById('input-fecha-ingreso');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }
    
    await cargarSalasEnModal(selectSala);
    modalRegistro.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarModalAlta() {
    modalRegistro.classList.remove('open');
    document.body.style.overflow = '';
}

/* ==========================================================================
   MODAL 2: ETIQUETAS QR & IMPRESIÓN
   ========================================================================== */

function abrirModalQr(equipo) {
    if (!equipo || !modalQr) return;

    qrCodigoDisplay.textContent = equipo.codigo_patrimonial;
    qrModeloDisplay.textContent = `${equipo.marca} ${equipo.modelo}`;
    qrSerialDisplay.textContent = equipo.numero_serie || 'N/A';
    qrSalaDisplay.textContent = equipo.sala_nombre || 'Sin sala fija';
    qrPuestoDisplay.textContent = equipo.puesto_codigo || 'General';

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

    modalQr.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarModalQr() {
    modalQr.classList.remove('open');
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
    if (prestamoBannerContainer) prestamoBannerContainer.style.display = 'none';
    if (btnAbrirPrestamo) btnAbrirPrestamo.style.display = 'none';
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

        // Banner de Préstamo Activo
        const prestamoActivo = data.prestamo_activo;
        if (eq.estado === 'EN_PRESTAMO' || prestamoActivo) {
            const p = prestamoActivo || {};
            if (prestamoBannerContainer) {
                prestamoBannerContainer.className = 'prestamo-active-banner';
                prestamoBannerContainer.style.display = 'flex';
                prestamoBannerContainer.innerHTML = `
                    <div class="prestamo-banner-content">
                        <div class="prestamo-banner-icon">
                            <i class="fa-solid fa-handshake-angle"></i>
                        </div>
                        <div class="prestamo-banner-body">
                            <div class="prestamo-banner-title">
                                <span>Activo Asignado en Préstamo</span>
                                <span class="status-badge badge-primary" style="font-size: 10px; padding: 1px 6px;">VIGENTE</span>
                            </div>
                            <div class="prestamo-banner-details">
                                <span><i class="fa-solid fa-user-tie"></i> <strong>Docente / Solicitante:</strong> ${p.solicitante_nombre || 'N/A'} (ID: ${p.solicitante_identificacion || 'N/A'})</span>
                                <span><i class="fa-solid fa-location-dot"></i> <strong>Destino:</strong> ${p.destino_uso || 'N/A'}</span>
                                <span><i class="fa-regular fa-calendar"></i> <strong>Salida:</strong> ${p.fecha_prestamo ? p.fecha_prestamo.split(' ')[0] : 'N/A'}</span>
                                ${p.fecha_devolucion_estimada ? `<span><i class="fa-regular fa-calendar-check"></i> <strong>Devolución Estimada:</strong> ${p.fecha_devolucion_estimada}</span>` : ''}
                            </div>
                            ${p.observaciones ? `<div class="prestamo-banner-obs"><i class="fa-regular fa-comment-dots"></i> ${p.observaciones}</div>` : ''}
                        </div>
                    </div>
                    <div class="prestamo-banner-actions">
                        <button type="button" id="btn-devolver-prestamo" class="btn btn-sm btn-primary">
                            <i class="fa-solid fa-rotate-left"></i>
                            <span>Registrar Devolución</span>
                        </button>
                    </div>
                `;
                const btnDevolver = document.getElementById('btn-devolver-prestamo');
                if (btnDevolver) {
                    btnDevolver.onclick = async () => {
                        await ejecutarDevolucion(eq.id, p.id || 0);
                    };
                }
            }
            if (btnAbrirPrestamo) btnAbrirPrestamo.style.display = 'none';
        } else {
            if (prestamoBannerContainer) prestamoBannerContainer.style.display = 'none';
            if (eq.estado === 'OPERATIVO') {
                if (btnAbrirPrestamo) {
                    btnAbrirPrestamo.style.display = 'inline-flex';
                    btnAbrirPrestamo.onclick = () => abrirModalPrestamo(eq);
                }
            } else {
                if (btnAbrirPrestamo) btnAbrirPrestamo.style.display = 'none';
            }
        }

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
                        badgeHtml = '<span class="status-badge badge-success">INCORPORACIÓN</span>';
                        bodyDetailsHtml = `<div>${item.descripcion || 'Alta formal en el inventario del laboratorio.'}</div>`;
                    } else if (item.tipo === 'REUBICACION') {
                        dotClass = 'dot-alta';
                        iconName = 'fa-desktop';
                        badgeHtml = '<span class="status-badge badge-primary">PUESTO FÍSICO</span>';
                        bodyDetailsHtml = `<div>${item.descripcion || item.ubicacion || 'Asignación física a puesto en sala.'}</div>`;
                    } else if (item.tipo === 'PRESTAMO') {
                        const esActivo = (item.estado === 'ACTIVO');
                        dotClass = esActivo ? 'dot-prestamo-activo' : 'dot-prestamo-devuelto';
                        iconName = esActivo ? 'fa-handshake-angle' : 'fa-handshake';
                        badgeHtml = `<span class="status-badge ${esActivo ? 'badge-primary' : 'badge-outline'}">${esActivo ? 'PRÉSTAMO ACTIVO' : 'DEVUELTO'}</span>`;
                        bodyDetailsHtml = `
                            <div><strong>Destino:</strong> ${item.destino_uso || 'No especificado'} • <strong>Docente/Solicitante:</strong> ${item.solicitante_nombre || 'N/A'} (ID: ${item.solicitante_identificacion || 'N/A'})</div>
                            ${item.observaciones ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 3px; font-style: italic;">Obs: ${item.observaciones}</div>` : ''}
                            <div class="timeline-meta-grid">
                                <span><i class="fa-regular fa-calendar-check"></i> ${item.fecha_devolucion_real ? 'Devuelto: ' + item.fecha_devolucion_real.split(' ')[0] : (item.fecha_devolucion_estimada ? 'Estimado: ' + item.fecha_devolucion_estimada : 'Sin fecha estimada')}</span>
                                <span><i class="fa-solid fa-user-tag"></i> ${item.solicitante_nombre || ''}</span>
                            </div>
                        `;
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

    formEditar.reset();
    if (alertEdit) alertEdit.style.display = 'none';

    document.getElementById('edit-equipo-id').value = equipo.id;
    document.getElementById('edit-codigo').value = equipo.codigo_patrimonial || '';
    document.getElementById('edit-serial').value = equipo.numero_serie || '';
    document.getElementById('edit-marca').value = equipo.marca || '';
    document.getElementById('edit-modelo').value = equipo.modelo || '';
    document.getElementById('edit-categoria').value = equipo.categoria || 'PC_ESCRITORIO';
    document.getElementById('edit-estado').value = equipo.estado || 'OPERATIVO';
    document.getElementById('edit-fecha-ingreso').value = equipo.fecha_ingreso || '';
    document.getElementById('edit-cpu').value = equipo.cpu || '';
    document.getElementById('edit-ram').value = equipo.ram_gb || '';
    document.getElementById('edit-disco').value = equipo.almacenamiento || '';
    document.getElementById('edit-ip').value = equipo.ip_asignada || '';
    document.getElementById('edit-mac').value = equipo.mac_address || '';
    document.getElementById('edit-notas').value = equipo.notas || '';

    await cargarSalasEnModal(selectEditSala);
    if (equipo.sala_id) {
        selectEditSala.value = equipo.sala_id;
        await actualizarPuestosPorSala(equipo.sala_id, selectEditPuesto, equipo.puesto_id);
    } else {
        selectEditPuesto.innerHTML = '<option value="">Sin sala asignada</option>';
        selectEditPuesto.disabled = true;
    }

    modalEditar.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarModalEditar() {
    modalEditar.classList.remove('open');
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


/* ==========================================================================
   MODAL 6: GESTIÓN DE PRÉSTAMOS (FASE 2)
   ========================================================================== */

function abrirModalPrestamo(equipo) {
    if (!modalPrestamo) return;
    if (formPrestamo) formPrestamo.reset();

    if (prestamoEquipoId) prestamoEquipoId.value = equipo.id;
    if (prestamoActivoCodigo) prestamoActivoCodigo.textContent = equipo.codigo_patrimonial || 'PAT-000';
    if (prestamoActivoNombre) prestamoActivoNombre.textContent = `${equipo.marca || ''} ${equipo.modelo || ''}`.trim() || 'Activo';
    if (prestamoActivoCategoria) prestamoActivoCategoria.textContent = (equipo.categoria || 'EQUIPO').replace(/_/g, ' ');

    // Sugerir fecha estimada de retorno: mañana
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const yyyy = manana.getFullYear();
    const mm = String(manana.getMonth() + 1).padStart(2, '0');
    const dd = String(manana.getDate()).padStart(2, '0');
    if (prestamoFechaEstimada) prestamoFechaEstimada.value = `${yyyy}-${mm}-${dd}`;

    modalPrestamo.classList.add('open');
    modalPrestamo.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        if (prestamoSolicitante) prestamoSolicitante.focus();
    }, 100);
}

function cerrarModalPrestamo() {
    if (!modalPrestamo) return;
    modalPrestamo.classList.remove('open');
    modalPrestamo.style.display = 'none';
    document.body.style.overflow = '';
}

async function ejecutarDevolucion(equipoId, prestamoId = 0) {
    try {
        const respuesta = await registrarDevolucionEquipo({ equipo_id: equipoId, prestamo_id: prestamoId });
        if (respuesta && respuesta.success) {
            Toast.success('Devolución Registrada', 'El equipo fue retornado al laboratorio y restaurado a estado OPERATIVO.');
            await cargarInventario();
            await abrirModalDetalle(equipoId);
        } else {
            Toast.error('Error al Devolver', respuesta?.message || 'No se pudo procesar la devolución.');
        }
    } catch (err) {
        console.error('Error en devolución:', err);
        Toast.error('Error al Devolver', err.message || 'Error de conexión.');
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar inventario inicial envuelto en try/catch para evitar bloqueos
    try {
        await cargarInventario();
    } catch (err) {
        console.error('Error inicial al cargar inventario:', err);
    }

    // 2. Poblar salas en el filtro
    try {
        await poblarFiltroSalas();
    } catch (err) {
        console.error('Error inicial al poblar salas:', err);
    }

    // 3. Listener reactivo para Filtro de Salas
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
            imprimirActaEquipo(equipoDetalleActual, equipoDetalleActual.historial_prestamos || []);
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
                sala_id: document.getElementById('edit-sala').value || null,
                puesto_id: document.getElementById('edit-puesto').value || null,
                cpu: document.getElementById('edit-cpu').value.trim() || null,
                ram_gb: document.getElementById('edit-ram').value || null,
                almacenamiento: document.getElementById('edit-disco').value.trim() || null,
                ip_asignada: document.getElementById('edit-ip').value.trim() || null,
                mac_address: document.getElementById('edit-mac').value.trim() || null,
                notas: document.getElementById('edit-notas').value.trim() || null
            };

            try {
                const res = await fetch(`../api/routes/equipos.php?action=actualizar&id=${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    Toast.success('Equipo Actualizado', 'La ficha patrimonial se guardó correctamente.');
                    cerrarModalEditar();
                    cargarInventario();
                } else {
                    if (alertEdit) {
                        alertEdit.textContent = data.message || 'Error al actualizar.';
                        alertEdit.style.display = 'block';
                    }
                    Toast.error('Error al Actualizar', data.message || 'Error');
                }
            } catch (err) {
                if (alertEdit) {
                    alertEdit.textContent = 'Error de conexión con el servidor.';
                    alertEdit.style.display = 'block';
                }
                Toast.error('Error', err.message);
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
            const motivo = document.getElementById('input-motivo-baja')?.value.trim() || '';

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
    
    // Eventos Modal Préstamos y Prevención de Doble Clic
    if (btnCerrarPrestamo) btnCerrarPrestamo.addEventListener('click', cerrarModalPrestamo);
    if (btnCancelarPrestamo) btnCancelarPrestamo.addEventListener('click', cerrarModalPrestamo);
    if (modalPrestamo) {
        modalPrestamo.addEventListener('click', (e) => {
            if (e.target === modalPrestamo) cerrarModalPrestamo();
        });
    }

    if (formPrestamo) {
        formPrestamo.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-guardar-prestamo');
            const originalPrestamoHtml = btnSubmit ? btnSubmit.innerHTML : '';
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...';
            }

            const equipoId = prestamoEquipoId ? prestamoEquipoId.value : '';
            const payload = {
                equipo_id: equipoId,
                solicitante_nombre: prestamoSolicitante ? prestamoSolicitante.value.trim() : '',
                solicitante_identificacion: prestamoIdentificacion ? prestamoIdentificacion.value.trim() : '',
                destino_uso: prestamoDestino ? prestamoDestino.value.trim() : '',
                fecha_devolucion_estimada: prestamoFechaEstimada ? prestamoFechaEstimada.value : null,
                observaciones: prestamoObservaciones ? prestamoObservaciones.value.trim() : null
            };

            try {
                const res = await registrarPrestamoEquipo(payload);
                if (res && res.success) {
                    Toast.success('Préstamo Registrado', 'El activo fue asignado en préstamo correctamente.');
                    cerrarModalPrestamo();
                    await cargarInventario();
                    if (equipoDetalleActual && equipoDetalleActual.id === parseInt(equipoId, 10)) {
                        await abrirModalDetalle(equipoId);
                    }
                } else {
                    Toast.error('Error al Registrar Préstamo', res?.message || 'No se pudo procesar el préstamo.');
                }
            } catch (err) {
                console.error('Error al registrar préstamo:', err);
                Toast.error('Error', err.message || 'Error de conexión.');
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = originalPrestamoHtml;
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
});

// Inicializar Modo Oscuro / Claro
initThemeToggle();

// Inicializar Command Palette Global (Ctrl + K)
initCommandPalette();
