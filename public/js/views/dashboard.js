import { verificarSesion, aplicarPermisosDOM } from '../services/auth.service.js';
import { initThemeToggle } from '../components/theme-toggle.js';
import { initCommandPalette } from '../components/command-palette.js';
import { obtenerMetricasDashboard } from '../services/api.service.js';

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
            animateCounter(kpiTotalEquipos, m.total_equipos);
            if (kpiTotalDesc) {
                kpiTotalDesc.textContent = `${m.operativos} operativos • ${m.en_prestamo} en préstamo`;
            }

            // 2. Tasa de Operatividad y Micro-badge de Salud
            animateCounter(kpiTasaOperatividad, m.tasa_operatividad, '%');
            if (kpiOperatividadBar) {
                setTimeout(() => {
                    kpiOperatividadBar.style.width = `${m.tasa_operatividad}%`;
                }, 100);
            }
            if (kpiOperatividadDesc) {
                kpiOperatividadDesc.textContent = `${m.operativos} de ${m.total_equipos} activos en línea`;
            }
            actualizarHealthBadge(m.tasa_operatividad);

            // 3. Puestos Ocupados
            animateCounter(kpiPuestosOcupados, m.puestos_ocupados);
            if (kpiPuestosDesc) {
                const totalCap = m.total_capacidad_puestos || m.puestos_ocupados;
                kpiPuestosDesc.textContent = `${m.puestos_ocupados} de ${totalCap} puestos ocupados`;
            }

            // 4. Equipos en Depósito / Reserva
            animateCounter(kpiDeposito, m.equipos_deposito);
            if (kpiDepositoDesc) {
                kpiDepositoDesc.textContent = `${m.equipos_deposito} piezas y equipos en reserva`;
            }

            // 5. Ocupación de Salas
            renderizarOcupacionSalas(m.equipos_por_sala);

            // 6. Distribución de Categorías
            renderizarDistribucionCategorias(m.distribucion_categorias, m.total_equipos);

            // 7. Últimos Movimientos Patrimoniales
            renderizarTimelineMovimientos(m.ultimos_movimientos);
        }

    } catch (error) {
        console.error('Error al inicializar dashboard patrimonial:', error);
    }
}

function actualizarHealthBadge(tasa) {
    if (!kpiHealthBadge || !kpiHealthText) return;

    if (tasa >= 90) {
        kpiHealthBadge.className = 'stat-badge-health badge-operativo';
        const dot = kpiHealthBadge.querySelector('.pulse-dot');
        if (dot) dot.style.background = '#10b981';
        kpiHealthText.textContent = 'Óptimo';
    } else if (tasa >= 75) {
        kpiHealthBadge.className = 'stat-badge-health badge-en-mantenimiento';
        const dot = kpiHealthBadge.querySelector('.pulse-dot');
        if (dot) dot.style.background = '#f59e0b';
        kpiHealthText.textContent = 'Atención';
    } else {
        kpiHealthBadge.className = 'stat-badge-health badge-con-falla';
        const dot = kpiHealthBadge.querySelector('.pulse-dot');
        if (dot) dot.style.background = '#ef4444';
        kpiHealthText.textContent = 'Crítico';
    }
}

/**
 * Renderiza la ocupación de salas con desglose de puestos
 */
function renderizarOcupacionSalas(salas) {
    if (!salasDistribucionList) return;
    if (!salas || salas.length === 0) {
        salasDistribucionList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No hay salas registradas.</div>';
        return;
    }

    salasDistribucionList.innerHTML = salas.map(sala => {
        const esDeposito = (sala.sala_nombre || '').toLowerCase().includes('depósito') || (sala.sala_nombre || '').toLowerCase().includes('deposito') || sala.capacidad_puestos === 0;

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
                        Reserva de piezas, componentes y equipos en stock.
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

                if (mov.tipo_evento === 'PRESTAMO') {
                    iconHtml = '<i class="fa-solid fa-handshake" style="color: #6366f1; font-size: 13px;"></i>';
                    badgeClass = 'badge-en-prestamo';
                    badgeLabel = 'PRÉSTAMO';
                } else if (mov.tipo_evento === 'DEVOLUCION') {
                    iconHtml = '<i class="fa-solid fa-rotate-left" style="color: #10b981; font-size: 13px;"></i>';
                    badgeClass = 'badge-operativo';
                    badgeLabel = 'DEVUELTO';
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
    const user = await verificarSesion();
    if (!user) return;
    cargarDashboard();

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
