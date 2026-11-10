/**
 * Servicio API para consumo de endpoints PHP
 * LabInventario - Servicio de API
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
        const json = await response.json().catch(() => null);
        if (!response.ok) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al consultar el servidor.`);
            err.status = response.status;
            throw err;
        }
        return json;
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
        const json = await response.json().catch(() => null);
        if (!response.ok) {
            const err = new Error(json?.message || `Error HTTP ${response.status}`);
            err.status = response.status;
            throw err;
        }
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

        const json = await response.json().catch(() => null);
        if (!response.ok) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al obtener equipos.`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error al obtener equipos:', error);
        throw error;
    }
}

/**
 * Normaliza los datos de un equipo (desde FormData u objeto plano) garantizando tipos válidos para el backend PHP
 */
function normalizarPayloadEquipo(data) {
    const raw = (data instanceof FormData) ? Object.fromEntries(data.entries()) : { ...(data || {}) };

    const toNullableInt = (val) => {
        if (val === undefined || val === null || String(val).trim() === '' || val === 'null' || val === 'undefined') {
            return null;
        }
        const parsed = parseInt(val, 10);
        return (!Number.isNaN(parsed) && parsed > 0) ? parsed : null;
    };

    const toNullableStr = (val) => {
        if (val === undefined || val === null) return null;
        const trimmed = String(val).trim();
        return trimmed !== '' ? trimmed : null;
    };

    const codigo = toNullableStr(raw.codigo_patrimonial ?? raw.codigo) || '';
    const serial = toNullableStr(raw.numero_serie ?? raw.serie ?? raw.serial) || '';
    const categoria = toNullableStr(raw.categoria ?? raw.tipo ?? raw.nombre) || 'PC_ESCRITORIO';
    const marca = toNullableStr(raw.marca) || '';
    const modelo = toNullableStr(raw.modelo) || '';

    let estado = (toNullableStr(raw.estado) || 'OPERATIVO').toUpperCase();
    if (estado !== 'OPERATIVO' && estado !== 'DE_BAJA') {
        estado = 'OPERATIVO';
    }

    const salaId = toNullableInt(raw.sala_id ?? raw.id_sala);
    const puestoId = estado === 'DE_BAJA' ? null : toNullableInt(raw.puesto_id ?? raw.id_puesto);

    return {
        codigo_patrimonial: codigo,
        codigo: codigo,
        numero_serie: serial,
        categoria: categoria,
        tipo: categoria,
        nombre: toNullableStr(raw.nombre) || `${marca} ${modelo}`.trim() || categoria,
        marca: marca,
        modelo: modelo,
        estado: estado,
        sala_id: salaId,
        id_sala: salaId,
        puesto_id: puestoId,
        id_puesto: puestoId,
        fecha_ingreso: toNullableStr(raw.fecha_ingreso),
        cpu: toNullableStr(raw.cpu),
        ram_gb: toNullableInt(raw.ram_gb),
        almacenamiento: toNullableStr(raw.almacenamiento),
        ip_asignada: toNullableStr(raw.ip_asignada),
        mac_address: toNullableStr(raw.mac_address),
        notas: toNullableStr(raw.notas)
    };
}

export async function obtenerDetalleEquipo(id) {
    try {
        const response = await fetch(`../api/routes/equipos.php?action=detalle&id=${encodeURIComponent(id)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        });
        const json = await response.json().catch(() => null);
        if (!response.ok) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al obtener detalle del equipo.`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error al obtener detalle del equipo:', error);
        throw error;
    }
}

export async function crearEquipo(data) {
    try {
        const payload = normalizarPayloadEquipo(data);
        const response = await fetch('../api/routes/equipos.php?action=crear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        const json = await response.json().catch(() => null);
        if (!response.ok || (json && json.success === false)) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al registrar el equipo.`);
            err.status = response.status;
            throw err;
        }
        if (!json) {
            throw new Error('Respuesta JSON inválida del servidor al crear el equipo.');
        }
        return json;
    } catch (error) {
        console.error('Error al crear equipo:', error);
        throw error;
    }
}

export async function actualizarEquipo(id, data) {
    try {
        const payload = normalizarPayloadEquipo(data);
        const response = await fetch(`../api/routes/equipos.php?action=actualizar&id=${encodeURIComponent(id)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        const json = await response.json().catch(() => null);
        if (!response.ok || (json && json.success === false)) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al actualizar el equipo.`);
            err.status = response.status;
            throw err;
        }
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
            credentials: 'include',
            body: JSON.stringify({ motivo })
        });
        const json = await response.json().catch(() => null);
        if (!response.ok || (json && json.success === false)) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al dar de baja el equipo.`);
            err.status = response.status;
            throw err;
        }
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
        const json = await response.json().catch(() => null);
        if (!response.ok) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al obtener métricas del dashboard.`);
            err.status = response.status;
            throw err;
        }
        return json;
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
        const json = await response.json().catch(() => null);
        if (!response.ok) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al obtener salas.`);
            err.status = response.status;
            throw err;
        }
        return json;
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
        const json = await response.json().catch(() => null);
        if (!response.ok) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al obtener puestos.`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error al obtener puestos:', error);
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

apiService.crearEquipo = crearEquipo;
apiService.registrarEquipo = crearEquipo;
apiService.actualizarEquipo = actualizarEquipo;
apiService.obtenerEquipos = obtenerEquipos;
apiService.obtenerSalas = obtenerSalas;
apiService.obtenerPuestosDisponibles = obtenerPuestos;
apiService.darDeBajaEquipo = darDeBajaEquipo;


export async function obtenerMapaUbicaciones() {
    try {
        const response = await fetch('../api/routes/ubicaciones.php?action=mapa-completo', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        const json = await response.json().catch(() => null);
        if (!response.ok) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al obtener mapa de ubicaciones.`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error al obtener mapa de ubicaciones:', error);
        throw error;
    }
}

/**
 * Actualiza automáticamente el contador de incidencias/fallas pendientes en el sidebar
 */
export async function actualizarBadgeSidebarMantenimiento() {
    // Desacoplado: Sistema enfocado exclusivamente en Inventario Patrimonial y Ubicaciones
    return;
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

/**
 * Crea una nueva sala / laboratorio (Rol ADMIN)
 */
export async function crearSala(data) {
    try {
        const response = await fetch('../api/routes/ubicaciones.php?action=crear-sala', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await response.json();
        if (!response.ok) {
            const err = new Error(json.message || `HTTP ${response.status}`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error al crear sala:', error);
        throw error;
    }
}

/**
 * Renombra o actualiza los datos de una sala / laboratorio (Rol ADMIN)
 */
export async function actualizarSala(data) {
    try {
        const response = await fetch('../api/routes/ubicaciones.php?action=actualizar-sala', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await response.json();
        if (!response.ok) {
            const err = new Error(json.message || `HTTP ${response.status}`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error al actualizar sala:', error);
        throw error;
    }
}

/**
 * Elimina una sala sin equipos asignados y sus puestos libres (Rol ADMIN)
 */
export async function eliminarSala(idSala) {
    try {
        const response = await fetch('../api/routes/ubicaciones.php?action=eliminar-sala', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ id_sala: parseInt(idSala, 10) })
        });
        const json = await response.json();
        if (!response.ok) {
            const err = new Error(json.message || `HTTP ${response.status}`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error al eliminar sala:', error);
        throw error;
    }
}

/**
 * Agrega el siguiente puesto físico a una sala (Rol ADMIN)
 */
export async function agregarPuesto(salaId) {
    try {
        const response = await fetch('../api/routes/ubicaciones.php?action=agregar-puesto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ sala_id: parseInt(salaId, 10) })
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || `HTTP ${response.status}`);
        return json;
    } catch (error) {
        console.error('Error al agregar puesto:', error);
        throw error;
    }
}

/**
 * Elimina un puesto físico libre (Rol ADMIN)
 */
export async function eliminarPuesto(puestoId) {
    try {
        const response = await fetch('../api/routes/ubicaciones.php?action=eliminar-puesto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ puesto_id: parseInt(puestoId, 10) })
        });
        const json = await response.json();
        if (!response.ok) {
            const err = new Error(json.message || `HTTP ${response.status}`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error al eliminar puesto:', error);
        throw error;
    }
}

/**
 * Registra un nuevo usuario mediante auto-registro público (rol por defecto: OPERADOR)
 */
export async function registrarUsuario(datos) {
    try {
        const response = await fetch('../api/routes/auth.php?action=register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(datos),
            credentials: 'include'
        });

        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al registrar usuario.`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error en registrarUsuario:', error);
        throw error;
    }
}

/**
 * Obtiene la lista de usuarios registrados (Exclusivo ADMIN)
 */
export async function obtenerUsuarios() {
    try {
        const response = await fetch('../api/routes/usuarios.php?action=listar', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        });

        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al obtener usuarios.`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error en obtenerUsuarios:', error);
        throw error;
    }
}

/**
 * Cambia el rol jerárquico de un usuario entre ADMIN y OPERADOR (Exclusivo ADMIN)
 */
export async function cambiarRolUsuario(idUsuario, nuevoRol) {
    try {
        const response = await fetch('../api/routes/usuarios.php?action=cambiar-rol', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                id_usuario: parseInt(idUsuario, 10),
                nuevo_rol: nuevoRol
            }),
            credentials: 'include'
        });

        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al cambiar el rol.`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error en cambiarRolUsuario:', error);
        throw error;
    }
}

/**
 * Elimina o desactiva un usuario del sistema (Exclusivo ADMIN)
 */
export async function eliminarUsuario(idUsuario) {
    try {
        const response = await fetch('../api/routes/usuarios.php?action=eliminar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                id_usuario: parseInt(idUsuario, 10)
            }),
            credentials: 'include'
        });

        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
            const err = new Error(json?.message || `Error HTTP ${response.status} al eliminar el usuario.`);
            err.status = response.status;
            throw err;
        }
        return json;
    } catch (error) {
        console.error('Error en eliminarUsuario:', error);
        throw error;
    }
}
