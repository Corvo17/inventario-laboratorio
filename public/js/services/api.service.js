/**
 * Servicio API para consumo de endpoints PHP
 * LabInventario v1.0
 */

export const apiService = {
    async get(endpoint, params = {}) {
        let cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        let url = cleanEndpoint.startsWith('http') || cleanEndpoint.startsWith('.') || cleanEndpoint.startsWith('../')
            ? cleanEndpoint
            : `../api/routes/${cleanEndpoint}`;

        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '' && value !== 'undefined') {
                searchParams.append(key, value);
            }
        }
        const qs = searchParams.toString();
        if (qs) {
            url += (url.includes('?') ? '&' : '?') + qs;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    },

    async post(endpoint, data = {}) {
        let cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        let url = cleanEndpoint.startsWith('http') || cleanEndpoint.startsWith('.') || cleanEndpoint.startsWith('../')
            ? cleanEndpoint
            : `../api/routes/${cleanEndpoint}`;

        const isFormData = data instanceof FormData;
        const response = await fetch(url, {
            method: 'POST',
            headers: isFormData ? { 'Accept': 'application/json' } : { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: isFormData ? data : JSON.stringify(data)
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    }
};

export async function obtenerEquipos(filtros = {}) {
    try {
        const params = new URLSearchParams();
        if (filtros.search && typeof filtros.search === 'string' && filtros.search.trim() !== '') {
            params.append('search', filtros.search.trim());
        }
        if (filtros.estado && typeof filtros.estado === 'string' && filtros.estado.trim() !== '') {
            params.append('estado', filtros.estado.trim());
        }
        if (filtros.sala_id !== undefined && filtros.sala_id !== null && filtros.sala_id !== '' && filtros.sala_id !== 'undefined') {
            params.append('sala_id', String(filtros.sala_id).trim());
        }

        const queryString = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`../api/routes/equipos.php${queryString}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error al obtener equipos:', error);
        throw error;
    }
}

export async function obtenerDetalleEquipo(id) {
    try {
        const response = await fetch(`../api/routes/equipos.php?action=detalle&id=${encodeURIComponent(id)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error('Error al obtener detalle del equipo:', error);
        throw error;
    }
}

export async function crearEquipo(data) {
    try {
        const isFormData = data instanceof FormData;
        const response = await fetch('../api/routes/equipos.php', {
            method: 'POST',
            headers: isFormData ? { 'Accept': 'application/json' } : { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: isFormData ? data : JSON.stringify(data)
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error('Error al crear equipo:', error);
        throw error;
    }
}

export async function actualizarEquipo(id, data) {
    try {
        const isFormData = data instanceof FormData;
        const response = await fetch(`../api/routes/equipos.php?action=actualizar&id=${encodeURIComponent(id)}`, {
            method: 'POST',
            headers: isFormData ? { 'Accept': 'application/json' } : { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: isFormData ? data : JSON.stringify(data)
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error('Error al actualizar equipo:', error);
        throw error;
    }
}

export async function darDeBajaEquipo(id, motivo = '') {
    try {
        const response = await fetch(`../api/routes/equipos.php?action=dar-de-baja&id=${encodeURIComponent(id)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ motivo })
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error('Error al dar de baja equipo:', error);
        throw error;
    }
}

export async function obtenerMetricasDashboard() {
    try {
        const response = await fetch('../api/routes/equipos.php?action=dashboard-metrics', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error al obtener métricas del dashboard:', error);
        throw error;
    }
}

export async function obtenerSalas() {
    try {
        const response = await fetch('../api/routes/ubicaciones.php?action=salas', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error al obtener salas:', error);
        throw error;
    }
}

export async function obtenerPuestos(salaId, incluirPuestoId = null) {
    try {
        let url = `../api/routes/ubicaciones.php?action=puestos&sala_id=${encodeURIComponent(salaId)}`;
        if (incluirPuestoId) {
            url += `&incluir_puesto_id=${encodeURIComponent(incluirPuestoId)}`;
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error al obtener puestos:', error);
        throw error;
    }
}

export async function obtenerMantenimientos(filtros = {}) {
    try {
        const params = new URLSearchParams();
        if (filtros.estado_resultado) params.append('estado_resultado', filtros.estado_resultado);
        if (filtros.prioridad) params.append('prioridad', filtros.prioridad);
        if (filtros.equipo_id) params.append('equipo_id', filtros.equipo_id);
        if (filtros.search) params.append('search', filtros.search);

        const queryString = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`../api/routes/mantenimientos.php${queryString}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error al obtener mantenimientos:', error);
        throw error;
    }
}

export async function obtenerEstadisticasMantenimiento() {
    try {
        const response = await fetch('../api/routes/mantenimientos.php?action=stats', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error al obtener estadísticas de mantenimiento:', error);
        throw error;
    }
}

export async function registrarMantenimiento(data) {
    try {
        const response = await fetch('../api/routes/mantenimientos.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error('Error al registrar mantenimiento:', error);
        throw error;
    }
}

export async function resolverMantenimiento(id, data) {
    try {
        const response = await fetch(`../api/routes/mantenimientos.php?action=resolver&id=${encodeURIComponent(id)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error('Error al resolver mantenimiento:', error);
        throw error;
    }
}

// Aliases para máxima compatibilidad entre módulos
export const registrarEquipo = crearEquipo;
export const obtenerPuestosDisponibles = obtenerPuestos;
export const obtenerEquipoPorId = obtenerDetalleEquipo;
export function generarUrlQr(codigo) {
    return `LAB-INV-${codigo}`;
}


export async function obtenerMapaUbicaciones() {
    try {
        const response = await fetch('../api/routes/ubicaciones.php?action=mapa-completo', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error al obtener mapa de ubicaciones:', error);
        throw error;
    }
}

/**
 * Actualiza automáticamente el contador de incidencias/fallas pendientes en el sidebar
 */
export async function actualizarBadgeSidebarMantenimiento() {
    const badge = document.getElementById('sidebar-mantenimiento-count');
    if (!badge) return;

    try {
        const res = await obtenerEstadisticasMantenimiento();
        if (res && res.success && res.data) {
            const count = parseInt(res.data.pendientes, 10) || 0;
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) {
        console.warn('Error al actualizar contador de mantenimiento del sidebar:', e);
    }
}

// Auto-ejecución al cargar el DOM en cualquier vista del sistema
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            actualizarBadgeSidebarMantenimiento();
        });
    } else {
        actualizarBadgeSidebarMantenimiento();
    }
}


/**
 * Obtiene la Hoja de Vida y Trazabilidad cronológica unificada de un equipo
 */
export async function obtenerHojaVidaEquipo(equipoId) {
    try {
        const response = await fetch(`../api/routes/equipos.php?action=hoja-vida&id=${encodeURIComponent(equipoId)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error(`Error al obtener hoja de vida del equipo #${equipoId}:`, error);
        throw error;
    }
}

/**
 * Registra un nuevo préstamo para un equipo y lo coloca en 'EN_PRESTAMO'
 */
export async function registrarPrestamoEquipo(payload) {
    try {
        const response = await fetch('../api/routes/equipos.php?action=registrar-prestamo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error('Error al registrar préstamo del equipo:', error);
        throw error;
    }
}

/**
 * Registra la devolución formal de un equipo y lo restaura a 'OPERATIVO'
 */
export async function registrarDevolucionEquipo(equipoId) {
    try {
        const payload = typeof equipoId === 'object' ? equipoId : { equipo_id: equipoId };
        const response = await fetch('../api/routes/equipos.php?action=devolver-prestamo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error(`Error al registrar devolución del equipo:`, error);
        throw error;
    }
}


/**
 * Reubica un equipo a una nueva sala y puesto físico (o sin puesto fijo).
 */
export async function reubicarEquipo(payload) {
    try {
        const response = await fetch('../api/routes/ubicaciones.php?action=reubicar-equipo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error('Error al reubicar equipo:', error);
        throw error;
    }
}
