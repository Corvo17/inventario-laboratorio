/**
 * Componente Status Badge con estética Shadcn UI
 * Soporta Estados Oficiales de Activos Patrimoniales
 */

const ESTADOS_CONFIG = {
    'OPERATIVO': { label: 'Operativo', cssClass: 'badge-operativo' },
    'DE_BAJA': { label: 'De Baja', cssClass: 'badge-de-baja' }
};

export function renderStatusBadge(estado) {
    const key = (estado || '').trim().toUpperCase();
    const config = ESTADOS_CONFIG[key] || { label: estado || 'Desconocido', cssClass: 'badge-default' };
    return `<span class="badge ${config.cssClass}"><span class="badge-dot"></span><span>${config.label}</span></span>`.trim();
}
