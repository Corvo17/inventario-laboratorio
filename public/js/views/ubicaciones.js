import { verificarSesion, aplicarPermisosDOM } from '../services/auth.service.js';
import { initThemeToggle } from '../components/theme-toggle.js';
import { initCommandPalette } from '../components/command-palette.js';
/**
 * Módulo de Ubicaciones y Puestos Físicos (Visual Lab Blueprint)
 * Directivas:
 * - shadcn-ui/ui@shadcn
 * - refactoring-ui/design-principles
 * - anthropics/skills@frontend-design
 */

import { 
    obtenerMapaUbicaciones, 
    obtenerSalas, 
    obtenerPuestos, 
    reubicarEquipo 
} from '../services/api.service.js';
import { Toast } from '../components/toast.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { imprimirLoteQRSala } from '../components/reportes.js';

// Elementos del DOM - KPIs
const statTotalSalas = document.getElementById('stat-total-salas');
const statTotalPuestos = document.getElementById('stat-total-puestos');
const statPuestosOcupados = document.getElementById('stat-puestos-ocupados');
const statPuestosLibres = document.getElementById('stat-puestos-libres');
const statPctOcupacion = document.getElementById('stat-pct-ocupacion');
const topbarDate = document.getElementById('topbar-date');

// Contenedor principal de salas
const contenedorSalas = document.getElementById('contenedor-salas');

// Elementos del Modal Resumen
const modalResumen = document.getElementById('modal-resumen-activo');
const btnCerrarResumen = document.getElementById('btn-cerrar-resumen');
const btnResumenCerrar = document.getElementById('btn-resumen-cerrar');
const btnResumenReportar = document.getElementById('btn-resumen-reportar');
const btnResumenIrInventario = document.getElementById('btn-resumen-ir-inventario');

// Campos del Modal Resumen
const resumenCodigo = document.getElementById('resumen-codigo');
const resumenModelo = document.getElementById('resumen-modelo');
const resumenSerial = document.getElementById('resumen-serial');
const resumenEstadoBadge = document.getElementById('resumen-estado-badge');
const resumenSala = document.getElementById('resumen-sala');
const resumenPuesto = document.getElementById('resumen-puesto');
const resumenIp = document.getElementById('resumen-ip');
const resumenCategoria = document.getElementById('resumen-categoria');

// Estado interno
let mapaCache = [];
let activoSeleccionado = null;
let salaNombreActual = '';
let puestoCodigoActual = '';

// Elementos para Modal de Reubicación Rápida
const btnReubicarEquipo = document.getElementById('btn-reubicar-equipo');
const modalReubicar = document.getElementById('modal-reubicar-equipo');
const btnCerrarReubicar = document.getElementById('btn-cerrar-reubicar');
const btnCancelarReubicar = document.getElementById('btn-cancelar-reubicar');
const formReubicar = document.getElementById('form-reubicar-equipo');
const reubicarEquipoId = document.getElementById('reubicar-equipo-id');
const reubicarCodigo = document.getElementById('reubicar-codigo');
const reubicarNombre = document.getElementById('reubicar-nombre');
const reubicarUbicacionActual = document.getElementById('reubicar-ubicacion-actual');
const selectReubicarSala = document.getElementById('select-reubicar-sala');
const selectReubicarPuesto = document.getElementById('select-reubicar-puesto');
const btnConfirmarReubicar = document.getElementById('btn-confirmar-reubicar');


document.addEventListener('DOMContentLoaded', async () => {
    const user = await verificarSesion();
    if (!user) return;
    actualizarFechaEncabezado();
    cargarMapaUbicaciones();
    configurarEventosModal();
});

/**
 * Fecha en encabezado
 */
function actualizarFechaEncabezado() {
    if (topbarDate) {
        const ahora = new Date();
        const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
        topbarDate.textContent = ahora.toLocaleDateString('es-ES', opciones).toUpperCase();
    }
}

/**
 * Configurar eventos del modal de resumen
 */

/* ==========================================================================
   MODAL: REUBICACIÓN RÁPIDA DE EQUIPOS (FASE 3)
   ========================================================================== */

async function abrirModalReubicar(equipo, salaNombre, puestoCodigo) {
    if (!modalReubicar || !equipo) return;

    formReubicar.reset();
    reubicarEquipoId.value = equipo.id;
    if (reubicarCodigo) reubicarCodigo.textContent = equipo.codigo_patrimonial || 'PAT-000';
    if (reubicarNombre) reubicarNombre.textContent = `${equipo.marca || ''} ${equipo.modelo || ''}`.trim() || 'Activo';
    if (reubicarUbicacionActual) {
        reubicarUbicacionActual.innerHTML = `<i class="fa-solid fa-location-dot"></i> <span>Actual: ${salaNombre || 'Sin sala'} - ${puestoCodigo ? 'Puesto ' + puestoCodigo : 'Sin puesto fijo'}</span>`;
    }

    // Cargar Salas
    try {
        const resSalas = await obtenerSalas();
        if (resSalas && resSalas.success && Array.isArray(resSalas.data)) {
            selectReubicarSala.innerHTML = '<option value="">Selecciona sala destino...</option>' + 
                resSalas.data.map(s => `<option value="${s.id}">${s.nombre} (Cap: ${s.capacidad_puestos})</option>`).join('');
            
            // Preseleccionar sala actual si existe
            if (equipo.sala_id) {
                selectReubicarSala.value = String(equipo.sala_id);
                await actualizarPuestosReubicacion(equipo.sala_id, equipo.id);
            }
        }
    } catch (e) {
        console.error('Error al cargar salas para reubicar:', e);
    }

    modalReubicar.classList.add('open');
    modalReubicar.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

async function actualizarPuestosReubicacion(salaId, equipoId) {
    if (!selectReubicarPuesto) return;
    selectReubicarPuesto.innerHTML = '<option value="">Sin puesto fijo / General de la sala</option>';
    if (!salaId) return;

    try {
        const resPuestos = await obtenerPuestos(salaId);
        if (resPuestos && resPuestos.success && Array.isArray(resPuestos.data)) {
            resPuestos.data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `Puesto ${p.codigo_puesto} (Fila ${p.fila || '-'}, Col ${p.columna || '-'})`;
                selectReubicarPuesto.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Error al obtener puestos libres para reubicación:', e);
    }
}

function cerrarModalReubicar() {
    if (!modalReubicar) return;
    modalReubicar.classList.remove('open');
    modalReubicar.style.display = 'none';
    document.body.style.overflow = '';
}

function configurarEventosModal() {
    if (btnCerrarResumen) btnCerrarResumen.addEventListener('click', cerrarModalResumen);
    if (btnResumenCerrar) btnResumenCerrar.addEventListener('click', cerrarModalResumen);

    if (modalResumen) {
        modalResumen.addEventListener('click', (e) => {
            if (e.target === modalResumen) cerrarModalResumen();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalResumen && modalResumen.classList.contains('open')) {
            cerrarModalResumen();
        }
    });

    // Acción: Reportar Falla -> redirige a mantenimientos.html con el equipo preseleccionado
    // Reporte de fallas desacoplado: sistema enfocado exclusivamente en inventario patrimonial

    // Acción: Ver Ficha Técnica -> redirige a inventario.html
    if (btnReubicarEquipo) {
        btnReubicarEquipo.addEventListener('click', () => {
            if (!activoSeleccionado) return;
            abrirModalReubicar(activoSeleccionado, salaNombreActual, puestoCodigoActual);
        });
    }

    if (btnCerrarReubicar) btnCerrarReubicar.addEventListener('click', cerrarModalReubicar);
    if (btnCancelarReubicar) btnCancelarReubicar.addEventListener('click', cerrarModalReubicar);
    if (modalReubicar) {
        modalReubicar.addEventListener('click', (e) => {
            if (e.target === modalReubicar) cerrarModalReubicar();
        });
    }

    if (selectReubicarSala) {
        selectReubicarSala.addEventListener('change', async (e) => {
            const salaId = e.target.value;
            await actualizarPuestosReubicacion(salaId, activoSeleccionado ? activoSeleccionado.id : null);
        });
    }

    if (formReubicar) {
        formReubicar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const equipoId = parseInt(reubicarEquipoId.value, 10);
            const nuevaSalaId = parseInt(selectReubicarSala.value, 10);
            const puestoVal = selectReubicarPuesto.value;
            const nuevoPuestoId = (puestoVal && puestoVal !== '') ? parseInt(puestoVal, 10) : null;

            if (btnConfirmarReubicar) {
                btnConfirmarReubicar.disabled = true;
                btnConfirmarReubicar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reubicando...';
            }

            try {
                const res = await reubicarEquipo({
                    equipo_id: equipoId,
                    nueva_sala_id: nuevaSalaId,
                    nuevo_puesto_id: nuevoPuestoId
                });

                if (res && res.success) {
                    Toast.success('Equipo Reubicado', 'El activo fue trasladado a su nueva ubicación correctamente.');
                    cerrarModalReubicar();
                    cerrarModalResumen();
                    await cargarMapaUbicaciones();
                } else {
                    Toast.error('Error al Reubicar', res?.message || 'No se pudo reubicar el equipo.');
                }
            } catch (err) {
                console.error('Error al reubicar equipo:', err);
                Toast.error('Error al Reubicar', err.message || 'Error de conexión.');
            } finally {
                if (btnConfirmarReubicar) {
                    btnConfirmarReubicar.disabled = false;
                    btnConfirmarReubicar.innerHTML = '<i class="fa-solid fa-arrows-up-down-left-right"></i><span>Confirmar Reubicación</span>';
                }
            }
        });
    }

    if (btnResumenIrInventario) {
        btnResumenIrInventario.addEventListener('click', () => {
            if (!activoSeleccionado) return;
            cerrarModalResumen();
            window.location.href = `inventario.html?buscar=${encodeURIComponent(activoSeleccionado.codigo_patrimonial)}`;
        });
    }
}

/**
 * Carga los datos del mapa desde el backend
 */
async function cargarMapaUbicaciones() {
    try {
        const res = await obtenerMapaUbicaciones();
        if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
            contenedorSalas.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; color: #f59e0b; margin-bottom: 10px;"></i>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">No se encontraron salas configuradas</div>
                    <div style="font-size: 12px; margin-top: 4px;">Crea salas y puestos en la base de datos para visualizarlos aquí.</div>
                </div>
            `;
            return;
        }

        mapaCache = res.data;
        actualizarKpisGenerales(mapaCache);

        // Renderizar cada sala
        contenedorSalas.innerHTML = mapaCache.map(sala => {
            return sala.es_deposito ? renderizarTarjetaDeposito(sala) : renderizarTarjetaLaboratorio(sala);
        }).join('');

        // Delegar eventos de clic en los puestos físicos ocupados

        // Delegar eventos de clic en los puestos libres para asignación rápida
        document.querySelectorAll('.workstation-card.free').forEach(card => {
            card.addEventListener('click', (e) => {
                const salaId = e.currentTarget.getAttribute('data-sala-id');
                const puestoId = e.currentTarget.getAttribute('data-puesto-id');
                if (salaId && puestoId) {
                    window.location.href = `inventario.html?accion=nuevo&sala_id=${salaId}&puesto_id=${puestoId}`;
                }
            });
        });

        document.querySelectorAll('.workstation-card.occupied').forEach(card => {
            card.addEventListener('click', (e) => {
                const puestoId = e.currentTarget.getAttribute('data-puesto-id');
                const equipoId = e.currentTarget.getAttribute('data-equipo-id');
                const salaNombre = e.currentTarget.getAttribute('data-sala-nombre');
                const puestoCodigo = e.currentTarget.getAttribute('data-puesto-codigo');
                abrirModalResumenPorIds(puestoId, equipoId, salaNombre, puestoCodigo);
            });
        });

        // Eventos para ítems de depósito
        document.querySelectorAll('.deposito-item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const equipoId = e.currentTarget.getAttribute('data-equipo-id');
                const salaNombre = e.currentTarget.getAttribute('data-sala-nombre');
                abrirModalResumenDeposito(equipoId, salaNombre);
            });
        });

        // Impresión en lote de etiquetas QR por sala
        document.querySelectorAll('.btn-qr-sala').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const salaId = parseInt(btn.getAttribute('data-sala-id'), 10);
                const sala = (mapaCache || []).find(s => s.id === salaId);
                if (!sala) return;

                const equiposPuestos = (sala.puestos || [])
                    .filter(p => p.ocupado && p.equipo)
                    .map(p => ({
                        ...p.equipo,
                        puesto_codigo: p.codigo_puesto,
                        sala_nombre: sala.nombre
                    }));

                const equiposSinPuesto = (sala.equipos_sin_puesto || [])
                    .map(eq => ({
                        ...eq,
                        puesto_codigo: 'Sin puesto fijo',
                        sala_nombre: sala.nombre
                    }));

                const todosEquipos = [...equiposPuestos, ...equiposSinPuesto];

                if (todosEquipos.length === 0) {
                    Toast.warning('Sala sin activos', `La sala "${sala.nombre}" no cuenta con equipos asignados para generar etiquetas.`);
                    return;
                }

                imprimirLoteQRSala(sala.nombre, todosEquipos);
            });
        });

    } catch (err) {
        console.error('Error al cargar mapa de ubicaciones:', err);
        contenedorSalas.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #ef4444; background: var(--bg-surface); border: 1px solid #fecaca; border-radius: var(--radius-md);">
                <i class="fa-solid fa-circle-exclamation" style="font-size: 32px; margin-bottom: 10px;"></i>
                <div style="font-weight: 600; font-size: 14px;">Error al conectar con la API de ubicaciones</div>
                <div style="font-size: 12px; margin-top: 4px; color: var(--text-secondary);">${err.message || 'Verifica que el backend esté activo.'}</div>
            </div>
        `;
    }
}

/**
 * Actualiza los contadores superiores de KPI (4 columnas compactas)
 */
function actualizarKpisGenerales(salas) {
    let totalSalas = salas.length;
    let totalPuestos = 0;
    let totalOcupados = 0;
    let totalLibres = 0;

    salas.forEach(s => {
        if (!s.es_deposito) {
            totalPuestos += (s.puestos_totales || 0);
            totalOcupados += (s.puestos_ocupados || 0);
            totalLibres += (s.puestos_libres || 0);
        }
    });

    if (statTotalSalas) statTotalSalas.textContent = totalSalas;
    if (statTotalPuestos) statTotalPuestos.textContent = totalPuestos;
    if (statPuestosOcupados) statPuestosOcupados.textContent = totalOcupados;
    if (statPuestosLibres) statPuestosLibres.textContent = totalLibres;

    if (statPctOcupacion) {
        const pctGlobal = totalPuestos > 0 ? Math.round((totalOcupados / totalPuestos) * 100) : 0;
        statPctOcupacion.textContent = `${pctGlobal}%`;
        statPctOcupacion.className = `stat-badge-health ${pctGlobal >= 90 ? 'health-optimal' : (pctGlobal >= 70 ? 'health-moderate' : 'health-critical')}`;
    }
}

/**
 * Renderiza la tarjeta de un Laboratorio con su grilla de puestos físicos (Visual Lab Blueprint)
 */
function renderizarTarjetaLaboratorio(sala) {
    const pct = sala.porcentaje_ocupacion || 0;
    const puestos = sala.puestos || [];
    const equiposGenerales = sala.equipos_sin_puesto || [];

    let puestosHtml = '';
    if (puestos.length === 0) {
        puestosHtml = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted); font-size: 13px;">
                <i class="fa-solid fa-chair" style="font-size: 20px; color: #cbd5e1; margin-bottom: 6px;"></i>
                <div>No hay puestos configurados para esta sala.</div>
            </div>
        `;
    } else {
                puestosHtml = puestos.map(p => {
            const ocupado = p.ocupado && p.equipo;
            const eq = p.equipo;
            const iconCls = ocupado
                ? (eq.categoria === 'LAPTOP' ? 'fa-solid fa-laptop' : (eq.categoria === 'ALL_IN_ONE' ? 'fa-solid fa-desktop' : 'fa-solid fa-desktop'))
                : 'fa-solid fa-plus text-muted';

            if (ocupado) {
                const statusCls = getStatusClass(eq.estado);
                const dotColor = getEstadoDotColor(eq.estado);
                const badgeInfo = getBadgeStyle(eq.estado);
                return `
                    <div class="workstation-card occupied ${statusCls}"
                         data-puesto-id="${p.id}"
                         data-equipo-id="${eq.id}"
                         data-sala-nombre="${sala.nombre}"
                         data-puesto-codigo="${p.codigo_puesto}"
                         title="${p.codigo_puesto}: ${eq.codigo_patrimonial} (${eq.marca} ${eq.modelo})">

                        <div class="workstation-header">
                            <span class="workstation-code-top">${p.codigo_puesto}</span>
                            <span class="workstation-dot" style="width: 7px; height: 7px; border-radius: 50%; background-color: ${dotColor}; display: inline-block;"></span>
                        </div>

                        <div class="workstation-icon">
                            <i class="${iconCls}"></i>
                        </div>

                        <div class="workstation-info">
                            <div class="workstation-patrimonio">${eq.codigo_patrimonial}</div>
                            <span class="workstation-desc">${eq.marca} ${eq.modelo}</span>
                        </div>

                        <span class="workstation-badge" style="background: ${badgeInfo.bg}; color: ${badgeInfo.color}; border: 1px solid var(--border-color);">
                            ${formatearEstadoCorto(eq.estado)}
                        </span>
                    </div>
                `;
            } else {
                return `
                    <div class="workstation-card free"
                         data-sala-id="${sala.id}"
                         data-puesto-id="${p.id}"
                         data-sala-nombre="${sala.nombre}"
                         data-puesto-codigo="${p.codigo_puesto}"
                         title="Asignar equipo a este puesto (${p.codigo_puesto})">

                        <div class="workstation-header">
                            <span class="workstation-code-top" style="color: var(--text-muted);">${p.codigo_puesto}</span>
                        </div>

                        <div class="workstation-icon">
                            <i class="fa-solid fa-plus" style="font-size: 20px;"></i>
                        </div>

                        <div class="workstation-info">
                            <span class="workstation-desc" style="color: var(--text-muted);">Puesto Libre</span>
                        </div>

                        <span class="workstation-badge badge-neutral">Disponible</span>
                    </div>
                `;
            }
        }).join('');
    }

    // Equipos adicionales en la sala sin puesto fijo (ej. proyectores o switches)
    let extraEquiposHtml = '';
    if (equiposGenerales.length > 0) {
        extraEquiposHtml = `
            <div class="unassigned-assets-bar">
                <span style="font-size: 11.5px; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-layer-group" style="color: var(--brand-blue);"></i> Activos generales sin puesto:
                </span>
                ${equiposGenerales.map(eq => `
                    <span class="badge deposito-item-card" data-equipo-id="${eq.id}" data-sala-nombre="${sala.nombre}" style="cursor: pointer; padding: 4px 8px; font-size: 11px; background: var(--bg-surface); border: 1px solid var(--border-color); display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-cube" style="color: var(--brand-blue);"></i>
                        <strong>${eq.codigo_patrimonial}</strong> (${eq.marca} ${eq.modelo})
                        <span class="legend-dot ${eq.estado.toLowerCase().replace(/_/g, '-')}" style="width: 6px; height: 6px;"></span>
                    </span>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="sala-mapa-card">
            <!-- Cabecera de la Sala -->
            <div class="sala-card-header sala-mapa-header">
                <div class="sala-mapa-title-group sala-info">
                    <div class="sala-mapa-icon">
                        <i class="fa-solid fa-door-open"></i>
                    </div>
                    <div>
                        <h3 class="sala-mapa-title">${sala.nombre}</h3>
                        <p class="sala-mapa-subtitle">${sala.descripcion || 'Laboratorio de cómputo'}</p>
                    </div>
                </div>

                <div class="sala-mapa-meta sala-stats" style="display: flex; align-items: center; gap: 12px;">
                    <button type="button" class="btn btn-outline btn-sm btn-qr-sala" data-sala-id="${sala.id}" title="Imprimir planilla de etiquetas QR de esta sala">
                        <i class="fa-solid fa-qrcode"></i>
                        <span>Etiquetas QR</span>
                    </button>
                    <div style="text-align: right;">
                        <span class="sala-stats-count" style="font-size: 0.8125rem; font-weight: 600; color: var(--text-primary);">${sala.puestos_ocupados}/${sala.puestos_totales} Puestos (${pct}%)</span>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${sala.puestos_libres} puestos libres</div>
                    </div>
                    <div style="width: 80px; height: 8px; background: var(--bg-muted); border-radius: 9999px; overflow: hidden;">
                        <div style="width: ${pct}%; height: 100%; background: ${pct >= 90 ? '#ef4444' : (pct >= 75 ? '#3b82f6' : '#10b981')}; border-radius: 9999px; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            </div>

            <!-- Grilla interactiva de puestos (Blueprint) -->
            <div class="puestos-grid">
                ${puestosHtml}
            </div>

            ${extraEquiposHtml}
        </div>
    `;
}

/**
 * Renderiza la tarjeta especial de Depósito Central
 */
function renderizarTarjetaDeposito(sala) {
    const items = sala.equipos_sin_puesto || [];
    const totalItems = items.length;

    let itemsHtml = '';
    if (totalItems === 0) {
        itemsHtml = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted); font-size: 13px;">
                <i class="fa-solid fa-box-open" style="font-size: 24px; color: #cbd5e1; margin-bottom: 6px;"></i>
                <div>No hay repuestos ni componentes almacenados actualmente.</div>
            </div>
        `;
    } else {
        itemsHtml = items.map(eq => {
            const dotColor = getEstadoDotColor(eq.estado);
            return `
                <div class="deposito-item-card" data-equipo-id="${eq.id}" data-sala-nombre="${sala.nombre}">
                    <div class="deposito-item-icon">
                        <i class="fa-solid fa-microchip"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="cell-code" style="font-size: 11px; padding: 2px 6px;">${eq.codigo_patrimonial}</span>
                            <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted);">
                                <span style="width: 6px; height: 6px; border-radius: 50%; background-color: ${dotColor};"></span>
                                ${formatearEstadoCorto(eq.estado)}
                            </span>
                        </div>
                        <div style="font-size: 12.5px; font-weight: 600; color: var(--text-primary); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${eq.marca} ${eq.modelo}
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                            ${(eq.categoria || 'COMPONENTE').replace(/_/g, ' ')} ${eq.ram_gb ? `• ${eq.ram_gb} GB` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    return `
        <div class="sala-mapa-card" style="border-left: 4px solid var(--brand-blue) !important;">
            <div class="sala-card-header sala-mapa-header">
                <div class="sala-mapa-title-group sala-info">
                    <div class="sala-mapa-icon">
                        <i class="fa-solid fa-boxes-stacked"></i>
                    </div>
                    <div>
                        <h3 class="sala-mapa-title">${sala.nombre}</h3>
                        <p class="sala-mapa-subtitle">Área de almacenamiento, piezas internas y stock de reserva</p>
                    </div>
                </div>

                <div class="sala-mapa-meta sala-stats" style="display: flex; align-items: center; gap: 12px;">
                    <button type="button" class="btn btn-outline btn-sm btn-qr-sala" data-sala-id="${sala.id}" title="Imprimir planilla de etiquetas QR de esta sala">
                        <i class="fa-solid fa-qrcode"></i>
                        <span>Etiquetas QR</span>
                    </button>
                    <span class="badge sala-stats-count" style="background: var(--bg-surface); color: var(--text-primary); font-weight: 600; padding: 6px 12px; border: 1px solid var(--border-color);">
                        <i class="fa-solid fa-box-archive" style="color: var(--brand-blue); margin-right: 4px;"></i>
                        ${totalItems} activo${totalItems === 1 ? '' : 's'} en reserva
                    </span>
                </div>
            </div>

            <div class="deposito-grid">
                ${itemsHtml}
            </div>
        </div>
    `;
}

/**
 * Modal resumen para puesto físico
 */
function abrirModalResumenPorIds(puestoId, equipoId, salaNombre, puestoCodigo) {
    if (!equipoId) return;

    let equipoEncontrado = null;
    for (const sala of mapaCache) {
        if (sala.puestos) {
            const p = sala.puestos.find(x => String(x.id) === String(puestoId));
            if (p && p.equipo) {
                equipoEncontrado = p.equipo;
                break;
            }
        }
        if (sala.equipos_sin_puesto) {
            const eq = sala.equipos_sin_puesto.find(x => String(x.id) === String(equipoId));
            if (eq) {
                equipoEncontrado = eq;
                break;
            }
        }
    }

    if (!equipoEncontrado) return;
    mostrarModalResumen(equipoEncontrado, salaNombre, puestoCodigo);
}

/**
 * Modal resumen para activo en Depósito
 */
function abrirModalResumenDeposito(equipoId, salaNombre) {
    let equipoEncontrado = null;
    for (const sala of mapaCache) {
        if (sala.equipos_sin_puesto) {
            const eq = sala.equipos_sin_puesto.find(x => String(x.id) === String(equipoId));
            if (eq) {
                equipoEncontrado = eq;
                break;
            }
        }
    }
    if (equipoEncontrado) {
        mostrarModalResumen(equipoEncontrado, salaNombre, 'Sin puesto fijo (Almacén)');
    }
}

function mostrarModalResumen(eq, salaNombre, puestoCodigo) {
    if (!modalResumen) return;

    activoSeleccionado = eq;
    salaNombreActual = salaNombre || 'Laboratorio';
    puestoCodigoActual = puestoCodigo || 'Puesto Físico';

    if (resumenCodigo) resumenCodigo.textContent = eq.codigo_patrimonial;
    if (resumenModelo) resumenModelo.textContent = `${eq.marca} ${eq.modelo}`;
    if (resumenSerial) resumenSerial.textContent = `Serial: ${eq.numero_serie || 'N/A'}`;
    if (resumenEstadoBadge) resumenEstadoBadge.innerHTML = renderStatusBadge(eq.estado);
    if (resumenSala) resumenSala.textContent = salaNombre || 'Laboratorio';
    if (resumenPuesto) resumenPuesto.textContent = puestoCodigo || 'Puesto Físico';
    if (resumenIp) resumenIp.textContent = eq.ip_asignada || 'No asignada';
    if (resumenCategoria) resumenCategoria.textContent = (eq.categoria || 'EQUIPO').replace(/_/g, ' ');

    modalResumen.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarModalResumen() {
    if (!modalResumen) return;
    modalResumen.classList.remove('open');
    document.body.style.overflow = '';
}

/**
 * Auxiliares de color y badge
 */
function getBadgeStyle(estado) {
    switch (estado) {
        case 'OPERATIVO': return { bg: '#ecfdf5', color: '#065f46' };
        case 'CON_FALLA': return { bg: '#fef2f2', color: '#991b1b' };
        case 'EN_MANTENIMIENTO': return { bg: '#fffbeb', color: '#92400e' };
        case 'EN_PRESTAMO': return { bg: '#eff6ff', color: '#1e40af' };
        default: return { bg: '#f4f4f5', color: '#52525b' };
    }
}

function getEstadoDotColor(estado) {
    switch (estado) {
        case 'OPERATIVO': return '#10b981';
        case 'CON_FALLA': return '#ef4444';
        case 'EN_MANTENIMIENTO': return '#f59e0b';
        case 'EN_PRESTAMO': return '#3b82f6';
        case 'DE_BAJA': return '#71717a';
        default: return '#10b981';
    }
}

function formatearEstadoCorto(estado) {
    switch (estado) {
        case 'OPERATIVO': return 'Operativo';
        case 'CON_FALLA': return 'Con Falla';
        case 'EN_MANTENIMIENTO': return 'En Taller';
        case 'EN_PRESTAMO': return 'Préstamo';
        case 'DE_BAJA': return 'De Baja';
        default: return estado;
    }
}

function getStatusClass(estado) {
    switch (estado) {
        case 'OPERATIVO': return 'status-operativo';
        case 'CON_FALLA': return 'status-falla';
        case 'EN_MANTENIMIENTO': return 'status-mantenimiento';
        case 'EN_PRESTAMO': return 'status-prestamo';
        default: return 'status-operativo';
    }
}

// Inicializar Modo Oscuro / Claro
initThemeToggle();

// Inicializar Command Palette Global (Ctrl + K)
initCommandPalette();
