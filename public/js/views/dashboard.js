import { verificarSesion, aplicarPermisosDOM, obtenerUsuarioActual, actualizarSidebarUsuario } from '../services/auth.service.js';
import { initThemeToggle } from '../components/theme-toggle.js';
import { initCommandPalette } from '../components/command-palette.js';
import { obtenerMetricasDashboard } from '../services/api.service.js';
import { Toast } from '../components/toast.js';

// KPIs Superiores
const kpiTotalEquipos = document.getElementById('kpi-total-equipos');
const kpiTotalDesc = document.getElementById('kpi-total-desc');
const kpiTasaOperatividad = document.getElementById('kpi-tasa-operatividad');
const kpiOperatividadBar = document.getElementById('kpi-operatividad-bar');
const kpiOperatividadDesc = document.getElementById('kpi-operatividad-desc');
const kpiHealthBadge = document.getElementById('kpi-health-badge');
const kpiHealthText = document.getElementById('kpi-health-text');
const kpiPuestosOcupados = document.getElementById('kpi-puestos-ocupados');
const kpiPuestosDesc = document.getElementById('kpi-puestos-desc');
const kpiDeposito = document.getElementById('kpi-deposito');
const kpiDepositoDesc = document.getElementById('kpi-deposito-desc');

// Contenedores
const salasDistribucionList = document.getElementById('salas-distribucion-list');
const categoriasDistribucionList = document.getElementById('categorias-distribucion-list');
const timelineMovimientosList = document.getElementById('timeline-movimientos-list');

/**
 * Animación fluida de conteo para valores numéricos
 */
function animateCounter(element, targetValue, suffix = '') {
    if (!element) return;
    const target = parseFloat(targetValue) || 0;
    const isFloat = String(targetValue).includes('.');
    const duration = 750;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = target * easeOut;

        element.textContent = (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = (isFloat ? target.toFixed(1) : target) + suffix;
        }
    }

    requestAnimationFrame(update);
}

/**
 * Carga principal de datos del Dashboard Patrimonial
 */
async function cargarDashboard() {
    try {
        const resMetricas = await obtenerMetricasDashboard();

        if (resMetricas && resMetricas.success && resMetricas.data) {
            const m = resMetricas.data;

            // 1. Total Equipos
            const totalActivos = Number(m.total_equipos ?? 0);
            const operativos = Number(m.operativos ?? 0);
            const deBaja = Number(m.de_baja ?? 0);
            const puestosOcupados = Number(m.puestos_ocupados ?? 0);
            const enDeposito = Number(m.equipos_deposito ?? 0);
            const tasaDisponibilidad = operativos > 0
                ? Number(((enDeposito / operativos) * 100).toFixed(1))
                : 0;

            animateCounter(kpiTotalEquipos, totalActivos);
            if (kpiTotalDesc) {
                kpiTotalDesc.textContent = `${operativos} operativos • ${deBaja} de baja`;
            }

            // 2. Disponibilidad (Equipos Operativos en Depósito / Reserva vs Total Operativos)
            if (kpiTasaOperatividad) {
                kpiTasaOperatividad.textContent = `${enDeposito} (${tasaDisponibilidad}%)`;
                kpiTasaOperatividad.style.color = enDeposito > 0 ? '#10b981' : '#ef4444';
            }
            if (kpiOperatividadBar) {
                kpiOperatividadBar.style.background = enDeposito > 0 ? '#10b981' : '#ef4444';
                setTimeout(() => {
                    kpiOperatividadBar.style.width = `${tasaDisponibilidad}%`;
                }, 100);
            }
            if (kpiOperatividadDesc) {
                kpiOperatividadDesc.textContent = `${enDeposito} en almacén de ${operativos} operativos`;
            }
            actualizarHealthBadge(enDeposito);

            // 3. Puestos Ocupados
            animateCounter(kpiPuestosOcupados, puestosOcupados);
            if (kpiPuestosDesc) {
                const totalCap = m.total_capacidad_puestos || puestosOcupados;
                kpiPuestosDesc.textContent = `${puestosOcupados} de ${totalCap} puestos ocupados`;
            }

            // 4. Equipos en Depósito / Reserva
            animateCounter(kpiDeposito, enDeposito);
            if (kpiDepositoDesc) {
                kpiDepositoDesc.textContent = `${enDeposito} disponibles para asignación inmediata`;
            }

            // 5. Ocupación de Salas y Balance de Ocupación Física
            renderizarOcupacionSalas(m.equipos_por_sala, {
                totalActivos,
                puestosOcupados,
                enDeposito,
                deBaja
            });

            // 6. Distribución de Categorías
            renderizarDistribucionCategorias(m.distribucion_categorias, m.total_equipos);

            // 7. Últimos Movimientos Patrimoniales
            renderizarTimelineMovimientos(m.ultimos_movimientos);
        } else {
            throw new Error(resMetricas?.message || 'Respuesta inválida del servidor al cargar métricas.');
        }

    } catch (error) {
        console.error('Error al inicializar dashboard patrimonial:', error);
        renderizarErrorDashboard(error.message || 'No se pudo establecer conexión con el servidor o la base de datos.');
    }
}

function renderizarErrorDashboard(mensajeError) {
    if (kpiTotalEquipos) kpiTotalEquipos.textContent = '0';
    if (kpiTotalDesc) kpiTotalDesc.textContent = 'Error de conexión';
    if (kpiTasaOperatividad) kpiTasaOperatividad.textContent = '0 (0%)';
    if (kpiOperatividadDesc) kpiOperatividadDesc.textContent = 'Sin datos disponibles';
    if (kpiPuestosOcupados) kpiPuestosOcupados.textContent = '0';
    if (kpiDeposito) kpiDeposito.textContent = '0';

    const errorHtml = `
        <div style="text-align: center; padding: 1.75rem 1rem; color: #ef4444; background: rgba(239, 68, 68, 0.04); border: 1px dashed rgba(239, 68, 68, 0.35); border-radius: var(--radius-md);">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 24px; margin-bottom: 8px;"></i>
            <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary);">No se pudieron cargar los datos</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; margin-bottom: 12px;">${mensajeError}</div>
            <button type="button" class="btn btn-outline btn-sm btn-reintentar-dashboard">
                <i class="fa-solid fa-rotate-right"></i>
                <span>Reintentar</span>
            </button>
        </div>
    `;

    if (salasDistribucionList) salasDistribucionList.innerHTML = errorHtml;
    if (categoriasDistribucionList) categoriasDistribucionList.innerHTML = errorHtml;
    if (timelineMovimientosList) timelineMovimientosList.innerHTML = errorHtml;

    document.querySelectorAll('.btn-reintentar-dashboard').forEach(btn => {
        btn.addEventListener('click', () => cargarDashboard());
    });

    if (Toast && typeof Toast.error === 'function') {
        Toast.error('Error de Carga', mensajeError);
    }
}

function actualizarHealthBadge(stockReserva) {
    if (!kpiHealthBadge || !kpiHealthText) return;

    if (stockReserva > 0) {
        kpiHealthBadge.className = 'stat-badge-health badge-operativo';
        const dot = kpiHealthBadge.querySelector('.pulse-dot');
        if (dot) dot.style.background = '#10b981';
        kpiHealthText.textContent = 'Óptimo';
    } else {
        kpiHealthBadge.className = 'stat-badge-health badge-con-falla';
        const dot = kpiHealthBadge.querySelector('.pulse-dot');
        if (dot) dot.style.background = '#ef4444';
        kpiHealthText.textContent = 'Agotado';
    }
}

/**
 * Renderiza la ocupación de salas con desglose de puestos y barra de consistencia física
 */
function renderizarOcupacionSalas(salas, resumenFisico = null) {
    if (!salasDistribucionList) return;
    if (!salas || salas.length === 0) {
        salasDistribucionList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No hay salas registradas.</div>';
        return;
    }

    let barraBalanceHtml = '';
    if (resumenFisico && resumenFisico.totalActivos > 0) {
        const { totalActivos, puestosOcupados, enDeposito, deBaja } = resumenFisico;
        const pctOcupados = Math.round((puestosOcupados / totalActivos) * 100);
        const pctDeposito = Math.round((enDeposito / totalActivos) * 100);
        const pctBaja = Math.max(0, 100 - pctOcupados - pctDeposito);

        barraBalanceHtml = `
            <div style="padding: 10px 12px; margin-bottom: 12px; background: var(--bg-muted); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; margin-bottom: 6px;">
                    <span style="font-weight: 600; color: var(--text-primary);">Balance de Ocupación Física</span>
                    <span style="color: var(--text-muted);">${puestosOcupados} en puestos + ${enDeposito} en depósito + ${deBaja} de baja = <strong>${totalActivos} activos</strong></span>
                </div>
                <div style="display: flex; height: 7px; border-radius: 999px; overflow: hidden; background: var(--border-color); gap: 2px;">
                    ${puestosOcupados > 0 ? `<div style="width: ${pctOcupados}%; background: #6366f1;" title="Puestos ocupados: ${puestosOcupados}"></div>` : ''}
                    ${enDeposito > 0 ? `<div style="width: ${pctDeposito}%; background: #10b981;" title="En depósito: ${enDeposito}"></div>` : ''}
                    ${deBaja > 0 ? `<div style="width: ${pctBaja}%; background: #71717a;" title="De baja: ${deBaja}"></div>` : ''}
                </div>
            </div>
        `;
    }

    salasDistribucionList.innerHTML = barraBalanceHtml + salas.map(sala => {
        const esDeposito = Boolean(sala.es_deposito) || sala.tipo === 'ALMACEN' || (sala.sala_nombre || '').toLowerCase().includes('depósito') || (sala.sala_nombre || '').toLowerCase().includes('deposito');

        return `
            <div class="room-dist-item">
                <div class="room-dist-header">
                    <div>
                        <span class="room-dist-name">${sala.sala_nombre}</span>
                        ${esDeposito ? 
                            `<span style="font-size: 11.5px; color: var(--text-muted); margin-left: 6px;">(Área de Almacén)</span>` : 
                            `<span style="font-size: 11.5px; color: var(--text-muted); margin-left: 6px;">(${sala.puestos_ocupados}/${sala.capacidad_puestos} puestos)</span>`
                        }
                    </div>
                    <span class="room-dist-count">
                        <strong>${sala.total_equipos}</strong> activos • <span style="color: #10b981;">${sala.operativos} op.</span>
                    </span>
                </div>
                
                ${!esDeposito ? `
                    <div class="room-occupancy-track">
                        <div class="room-occupancy-bar" style="width: ${sala.porcentaje_ocupacion}%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        <span>${sala.porcentaje_ocupacion}% de capacidad ocupada</span>
                        <span>${sala.puestos_libres} puestos libres</span>
                    </div>
                ` : `
                    <div style="font-size: 11.5px; color: var(--text-secondary); background: var(--bg-muted); padding: 4px 8px; border-radius: 4px; margin-top: 2px;">
                        Reserva de piezas, componentes y equipos en stock (${sala.operativos} disponibles para asignación inmediata).
                    </div>
                `}
            </div>
        `;
    }).join('');
}

/**
 * Renderiza la distribución por categorías de hardware
 */
function renderizarDistribucionCategorias(categorias, totalGeneral) {
    if (!categoriasDistribucionList) return;
    if (!categorias || categorias.length === 0) {
        categoriasDistribucionList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Sin categorías registradas.</div>';
        return;
    }

    categoriasDistribucionList.innerHTML = `
        <div class="category-bars-grid">
            ${categorias.map(cat => {
                const total = parseInt(cat.total) || 0;
                const porcentaje = totalGeneral > 0 ? Math.round((total / totalGeneral) * 100) : 0;
                const nombreLimpio = (cat.categoria || '').replace(/_/g, ' ');

                return `
                    <div class="category-bar-row">
                        <div class="category-bar-label">
                            <span style="font-weight: 500; color: var(--text-primary); text-transform: capitalize;">${nombreLimpio}</span>
                            <span style="color: var(--text-muted); font-size: 12px;"><strong>${total}</strong> (${porcentaje}%)</span>
                        </div>
                        <div class="category-bar-track">
                            <div class="category-bar-fill" style="width: ${porcentaje}%;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Renderiza la línea de tiempo de últimos movimientos patrimoniales
 */
function renderizarTimelineMovimientos(movimientos) {
    if (!timelineMovimientosList) return;
    if (!movimientos || movimientos.length === 0) {
        timelineMovimientosList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 1.5rem; text-align: center;">No hay movimientos patrimoniales recientes.</div>';
        return;
    }

    timelineMovimientosList.innerHTML = `
        <div class="activity-timeline">
            ${movimientos.map(mov => {
                const fecha = mov.fecha ? mov.fecha.split(' ')[0] : 'Hoy';
                let iconHtml = '';
                let badgeClass = 'badge-primary';
                let badgeLabel = 'MOVIMIENTO';

                if (mov.tipo_evento === 'REUBICACION') {
                    iconHtml = '<i class="fa-solid fa-desktop" style="color: #6366f1; font-size: 13px;"></i>';
                    badgeClass = 'badge-operativo';
                    badgeLabel = 'REUBICACIÓN';
                } else if (mov.tipo_evento === 'BAJA_EQUIPO') {
                    iconHtml = '<i class="fa-solid fa-ban" style="color: #71717a; font-size: 13px;"></i>';
                    badgeClass = 'badge-de-baja';
                    badgeLabel = 'DE BAJA';
                } else {
                    iconHtml = '<i class="fa-solid fa-box-archive" style="color: #3b82f6; font-size: 13px;"></i>';
                    badgeClass = 'badge-operativo';
                    badgeLabel = 'ALTA';
                }

                return `
                    <div class="activity-item">
                        <div class="activity-icon-box">
                            ${iconHtml}
                        </div>
                        <div class="activity-details" style="flex: 1;">
                            <div class="activity-header" style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="activity-code">${mov.codigo_patrimonial}</span>
                                    <span class="status-badge ${badgeClass}" style="font-size: 10px; padding: 1px 6px;">${badgeLabel}</span>
                                </div>
                                <span class="activity-time">${fecha}</span>
                            </div>
                            <div class="activity-desc" style="margin-top: 3px;">${mov.descripcion}</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${mov.modelo || ''}</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', async () => {
    const cachedUser = obtenerUsuarioActual();
    if (cachedUser) {
        actualizarSidebarUsuario(cachedUser);
        aplicarPermisosDOM(cachedUser);
    }

    cargarDashboard();

    verificarSesion().catch(err => console.warn('Verificación de sesión:', err));

    const btnNuevo = document.getElementById('btn-header-nuevo-equipo');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', () => {
            window.location.href = 'inventario.html?accion=nuevo';
        });
    }
});

// Inicializar Modo Oscuro / Claro
initThemeToggle();

// Inicializar Command Palette Global (Ctrl + K)
initCommandPalette();
