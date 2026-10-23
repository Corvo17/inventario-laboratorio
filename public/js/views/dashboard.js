import { initThemeToggle } from '../components/theme-toggle.js';
import { initCommandPalette } from '../components/command-palette.js';
import { obtenerMetricasDashboard, obtenerMantenimientos } from '../services/api.service.js';
import { renderPriorityBadge } from '../components/status-badge.js';

// KPIs Superiores
const kpiTotalEquipos = document.getElementById('kpi-total-equipos');
const kpiTotalDesc = document.getElementById('kpi-total-desc');
const kpiTasaOperatividad = document.getElementById('kpi-tasa-operatividad');
const kpiOperatividadBar = document.getElementById('kpi-operatividad-bar');
const kpiOperatividadDesc = document.getElementById('kpi-operatividad-desc');
const kpiHealthBadge = document.getElementById('kpi-health-badge');
const kpiHealthText = document.getElementById('kpi-health-text');
const kpiFallas = document.getElementById('kpi-fallas');
const kpiFallasDesc = document.getElementById('kpi-fallas-desc');
const kpiRepuestos = document.getElementById('kpi-repuestos');

// Contenedores
const salasDistribucionList = document.getElementById('salas-distribucion-list');
const categoriasDistribucionList = document.getElementById('categorias-distribucion-list');
const tablaAtencionRequerida = document.getElementById('tabla-atencion-requerida');
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
 * Carga principal de datos del Dashboard
 */
async function cargarDashboard() {
    try {
        const [resMetricas, resMantenimientos] = await Promise.all([
            obtenerMetricasDashboard(),
            obtenerMantenimientos({ estado_resultado: 'PENDIENTE' })
        ]);

        if (resMetricas.success && resMetricas.data) {
            const m = resMetricas.data;

            // 1. Total Equipos
            animateCounter(kpiTotalEquipos, m.total_equipos);
            kpiTotalDesc.textContent = `${m.operativos} operativos · ${m.en_prestamo} en préstamo`;

            // 2. Tasa de Operatividad y Micro-badge de Salud
            animateCounter(kpiTasaOperatividad, m.tasa_operatividad, '%');
            setTimeout(() => {
                kpiOperatividadBar.style.width = `${m.tasa_operatividad}%`;
            }, 100);
            kpiOperatividadDesc.textContent = `${m.operativos} de ${m.total_equipos} activos en línea`;

            // Actualizar badge de salud
            actualizarHealthBadge(m.tasa_operatividad);

            // 3. Fallas y Taller
            const totalFallas = m.con_falla + m.en_mantenimiento;
            animateCounter(kpiFallas, totalFallas);
            kpiFallasDesc.textContent = `${m.con_falla} con falla · ${m.en_mantenimiento} en revisión`;

            // 4. Repuestos
            animateCounter(kpiRepuestos, m.repuestos_deposito);

            // 5. Ocupación de Salas
            renderizarOcupacionSalas(m.equipos_por_sala);

            // 6. Distribución de Categorías
            renderizarDistribucionCategorias(m.distribucion_categorias, m.total_equipos);

            // 7. Últimos Movimientos
            renderizarTimelineMovimientos(m.ultimos_movimientos);
        }

        // 8. Atención Requerida (Incidencias pendientes)
        if (resMantenimientos.success) {
            renderizarAtencionRequerida(resMantenimientos.data);
        }

    } catch (error) {
        console.error('Error al inicializar dashboard ejecutivo:', error);
    }
}

function actualizarHealthBadge(tasa) {
    if (!kpiHealthBadge || !kpiHealthText) return;

    if (tasa >= 90) {
        kpiHealthBadge.className = 'stat-badge-health badge-operativo';
        kpiHealthBadge.querySelector('.pulse-dot').style.background = '#10b981';
        kpiHealthText.textContent = 'Óptimo';
    } else if (tasa >= 75) {
        kpiHealthBadge.className = 'stat-badge-health badge-en-mantenimiento';
        kpiHealthBadge.querySelector('.pulse-dot').style.background = '#f59e0b';
        kpiHealthText.textContent = 'Atención';
    } else {
        kpiHealthBadge.className = 'stat-badge-health badge-con-falla';
        kpiHealthBadge.querySelector('.pulse-dot').style.background = '#ef4444';
        kpiHealthText.textContent = 'Crítico';
    }
}

/**
 * Renderiza la ocupación de salas con desglose de puestos
 */
function renderizarOcupacionSalas(salas) {
    if (!salas || salas.length === 0) {
        salasDistribucionList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No hay salas registradas.</div>';
        return;
    }

    salasDistribucionList.innerHTML = salas.map(sala => {
        const esDeposito = sala.sala_nombre.toLowerCase().includes('depósito') || sala.capacidad_puestos === 0;

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
                        <strong>${sala.total_equipos}</strong> activos · <span style="color: #10b981;">${sala.operativos} op.</span>
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
                        Reserva de piezas y componentes para sustitución técnica.
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
 * Renderiza la tabla de atención requerida
 */
function renderizarAtencionRequerida(pendientes) {
    if (!pendientes || pendientes.length === 0) {
        tablaAtencionRequerida.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2.5rem 1.5rem;">
                    <div style="font-size: 26px; margin-bottom: 6px;">🎉</div>
                    <div style="font-weight: 600; color: #10b981; font-size: 14px;">¡Todos los sistemas y equipos están 100% operativos!</div>
                    <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">No hay reportes de fallas técnicas pendientes de resolver.</div>
                </td>
            </tr>
        `;
        return;
    }

    tablaAtencionRequerida.innerHTML = pendientes.slice(0, 5).map(item => {
        return `
            <tr>
                <td>
                    <span class="cell-code" style="font-size: 11.5px;">${item.codigo_patrimonial}</span>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${item.sala_nombre || 'Sin sala'}</div>
                </td>
                <td>
                    <div style="font-weight: 500; font-size: 13px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${item.titulo}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">${item.tipo}</div>
                </td>
                <td>
                    ${renderPriorityBadge(item.prioridad)}
                </td>
                <td style="text-align: right;">
                    <a href="mantenimientos.html" class="btn btn-primary" style="padding: 4px 8px; font-size: 11.5px; text-decoration: none;">
                        Resolver
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Renderiza la línea de tiempo de últimos movimientos
 */
function renderizarTimelineMovimientos(movimientos) {
    if (!movimientos || movimientos.length === 0) {
        timelineMovimientosList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No hay movimientos recientes.</div>';
        return;
    }

    timelineMovimientosList.innerHTML = `
        <div class="activity-timeline">
            ${movimientos.map(mov => {
                const esMant = mov.tipo_evento === 'MANTENIMIENTO';
                const fecha = mov.fecha ? mov.fecha.split(' ')[0] : 'Hoy';

                return `
                    <div class="activity-item">
                        <div class="activity-icon-box">
                            ${esMant ? `
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                                </svg>
                            ` : `
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            `}
                        </div>
                        <div class="activity-details">
                            <div class="activity-header">
                                <span class="activity-code">${mov.codigo_patrimonial}</span>
                                <span class="activity-time">${fecha}</span>
                            </div>
                            <div class="activity-desc">${mov.descripcion}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">${mov.modelo}</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
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
