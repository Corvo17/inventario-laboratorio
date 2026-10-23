/**
 * Componente Status Badge con estética Shadcn UI
 * Soporta Estados de Equipos, Prioridades de Incidencia y Estados de Resolución
 */

const ESTADOS_CONFIG = {
    'OPERATIVO': { label: 'Operativo', cssClass: 'badge-operativo' },
    'EN_MANTENIMIENTO': { label: 'En Mantenimiento', cssClass: 'badge-en-mantenimiento' },
    'CON_FALLA': { label: 'Con Falla', cssClass: 'badge-con-falla' },
    'EN_PRESTAMO': { label: 'En Préstamo', cssClass: 'badge-en-prestamo' },
    'DE_BAJA': { label: 'De Baja', cssClass: 'badge-de-baja' }
};

const PRIORIDADES_CONFIG = {
    'CRITICA': { label: 'Crítica', cssClass: 'badge-prioridad-critica' },
    'ALTA': { label: 'Alta', cssClass: 'badge-prioridad-alta' },
    'MEDIA': { label: 'Media', cssClass: 'badge-prioridad-media' },
    'BAJA': { label: 'Baja', cssClass: 'badge-prioridad-baja' }
};

const RESULTADOS_CONFIG = {
    'PENDIENTE': { label: 'Pendiente', cssClass: 'badge-en-mantenimiento' },
    'EN_CURSO': { label: 'En Curso', cssClass: 'badge-en-prestamo' },
    'RESUELTO': { label: 'Resuelto', cssClass: 'badge-operativo' },
    'DERIVADO_A_BAJA': { label: 'Derivado a Baja', cssClass: 'badge-de-baja' }
};

export function renderStatusBadge(estado) {
    const key = (estado || '').trim().toUpperCase();
    const config = ESTADOS_CONFIG[key] || { label: estado || 'Desconocido', cssClass: 'badge-default' };
    return `<span class="badge ${config.cssClass}"><span class="badge-dot"></span><span>${config.label}</span></span>`.trim();
}

export function renderPriorityBadge(prioridad) {
    const key = (prioridad || '').trim().toUpperCase();
    const config = PRIORIDADES_CONFIG[key] || { label: prioridad || 'N/A', cssClass: 'badge-default' };
    return `<span class="badge ${config.cssClass}"><span class="badge-dot"></span><span>${config.label}</span></span>`.trim();
}

export function renderMaintenanceStatusBadge(estadoResultado) {
    const key = (estadoResultado || '').trim().toUpperCase();
    const config = RESULTADOS_CONFIG[key] || { label: estadoResultado || 'Pendiente', cssClass: 'badge-default' };
    return `<span class="badge ${config.cssClass}"><span class="badge-dot"></span><span>${config.label}</span></span>`.trim();
}
