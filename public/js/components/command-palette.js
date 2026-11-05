/**
 * Componente: Command Palette Global (Ctrl + K / Cmd + K)
 * Sistema de Diseño: Shadcn UI / Linear (Modo Claro y Modo Oscuro)
 */

let isInitialized = false;
let equiposCache = [];
let salasCache = [];
let isDataLoaded = false;
let selectedIndex = 0;
let currentItems = [];

export function initCommandPalette() {
    if (isInitialized) return;
    isInitialized = true;

    // Inyectar modal en el DOM si no existe
    inyectarModalPalette();

    const modal = document.getElementById('command-palette-modal');
    const input = document.getElementById('cmd-search-input');
    const trigger = document.getElementById('cmd-palette-trigger');
    const resultsContainer = document.getElementById('cmd-results-container');

    if (!modal || !input) return;

    // Abrir Palette
    function abrirPalette() {
        modal.classList.add('open');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        input.value = '';
        input.focus();
        cargarDatosSiEsNecesario();
        renderResultados('');
    }

    // Cerrar Palette
    function cerrarPalette() {
        modal.classList.remove('open');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Escuchar atajo global Ctrl + K / Cmd + K y Escape
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            if (modal.classList.contains('open')) {
                cerrarPalette();
            } else {
                abrirPalette();
            }
        } else if (e.key === 'Escape' && modal.classList.contains('open')) {
            e.preventDefault();
            cerrarPalette();
        }
    });

    // Clic en trigger de topbar
    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            abrirPalette();
        });
    }

    // Clic en backdrop para cerrar
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarPalette();
        }
    });

    // Navegación con teclado dentro del input
    input.addEventListener('keydown', (e) => {
        if (currentItems.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % currentItems.length;
            actualizarSeleccionVisual();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
            actualizarSeleccionVisual();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentItems[selectedIndex]) {
                ejecutarAccionItem(currentItems[selectedIndex]);
                cerrarPalette();
            }
        }
    });

    // Búsqueda en vivo al teclear
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        renderResultados(query);
    });

    // Cargar datos en background
    async function cargarDatosSiEsNecesario() {
        if (isDataLoaded) return;
        try {
            const [respEquipos, respSalas] = await Promise.all([
                fetch('../api/routes/equipos.php').then(r => r.json()).catch(() => ({ data: [] })),
                fetch('../api/routes/ubicaciones.php?action=salas').then(r => r.json()).catch(() => ({ data: [] }))
            ]);

            if (respEquipos && respEquipos.success && Array.isArray(respEquipos.data)) {
                equiposCache = respEquipos.data;
            }
            if (respSalas && respSalas.success && Array.isArray(respSalas.data)) {
                salasCache = respSalas.data;
            }
            isDataLoaded = true;

            // Si el input tiene texto o está vacío, re-renderizar para refrescar con datos cargados
            renderResultados(input.value.trim().toLowerCase());
        } catch (err) {
            console.warn('Command Palette: No se pudieron precargar activos:', err);
        }
    }

    // Renderizar resultados filtrados
    function renderResultados(query) {
        currentItems = [];
        selectedIndex = 0;
        resultsContainer.innerHTML = '';

        // 1. Navegación Rápida
        const navegacion = [
            {
                id: 'nav-dash',
                grupo: 'Navegación Rápida',
                titulo: 'Dashboard General',
                subtitulo: 'Métricas ejecutivas, tasas de operatividad y resúmenes de salas',
                icono: 'fa-chart-pie',
                badge: 'Vista',
                keywords: 'dashboard inicio panel métricas home kpis',
                action: () => { window.location.href = 'index.html'; }
            },
            {
                id: 'nav-inv',
                grupo: 'Navegación Rápida',
                titulo: 'Inventario de Equipos & Activos',
                subtitulo: 'Parque tecnológico, trazabilidad y códigos patrimoniales',
                icono: 'fa-server',
                badge: 'Vista',
                keywords: 'inventario equipos activos hardware pcs computadoras laptops',
                action: () => { window.location.href = 'inventario.html'; }
            },
            {
                id: 'nav-ubic',
                grupo: 'Navegación Rápida',
                titulo: 'Mapa de Ubicaciones & Puestos',
                subtitulo: 'Distribución física interactiva de laboratorios y puestos libres',
                icono: 'fa-location-dot',
                badge: 'Vista',
                keywords: 'ubicaciones salas puestos mapa laboratorios plano distribución',
                action: () => { window.location.href = 'ubicaciones.html'; }
            }
        ];

        // 2. Acciones Rápidas
        const acciones = [
            {
                id: 'act-nuevo-equipo',
                grupo: 'Acciones Rápidas',
                titulo: 'Registrar Nuevo Equipo',
                subtitulo: 'Dar de alta un activo patrimonial en el sistema',
                icono: 'fa-circle-plus',
                badge: 'Acción',
                keywords: 'nuevo equipo agregar crear activo alta registrar hardware',
                action: () => {
                    const btn = document.getElementById('btn-nuevo-equipo');
                    if (btn && window.location.pathname.includes('inventario.html')) {
                        btn.click();
                    } else {
                        window.location.href = 'inventario.html?accion=nuevo';
                    }
                }
            },
            {
                id: 'act-reubicar-equipo',
                grupo: 'Acciones Rápidas',
                titulo: 'Reubicar Equipo en Mapa',
                subtitulo: 'Cambiar de sala o puesto físico en plano interactivo',
                icono: 'fa-arrows-up-down-left-right',
                badge: 'Acción',
                keywords: 'reubicar mover puesto sala transferir puesto fisico plano ubicaciones',
                action: () => {
                    window.location.href = 'ubicaciones.html';
                }
            },
            {
                id: 'act-exportar-csv',
                grupo: 'Acciones Rápidas',
                titulo: 'Descargar Respaldo CSV Oficial',
                subtitulo: 'Exportar inventario con codificación Excel UTF-8 BOM',
                icono: 'fa-file-excel',
                badge: 'Exportar',
                keywords: 'descargar csv excel exportar reporte backup respaldo',
                action: () => {
                    const btnExportar = document.getElementById('btn-exportar-inventario');
                    if (btnExportar && window.location.pathname.includes('inventario.html')) {
                        btnExportar.click();
                    } else {
                        window.location.href = 'inventario.html?accion=exportar';
                    }
                }
            },
            {
                id: 'act-toggle-theme',
                grupo: 'Acciones Rápidas',
                titulo: 'Alternar Tema Claro / Oscuro',
                subtitulo: 'Cambiar el esquema de color del sistema (Zinc Palette)',
                icono: 'fa-circle-half-stroke',
                badge: 'Tema',
                keywords: 'tema dark mode modo oscuro claro color apariencia night light',
                action: () => {
                    const toggleBtn = document.getElementById('theme-toggle-btn');
                    if (toggleBtn) toggleBtn.click();
                }
            }
        ];

        // 3. Salas
        const salasItems = salasCache.map(s => ({
            id: `sala-${s.id}`,
            grupo: 'Salas de Laboratorio',
            titulo: s.nombre,
            subtitulo: `Capacidad: ${s.capacidad_puestos} puestos físicos asignados`,
            icono: 'fa-door-open',
            badge: 'Sala',
            keywords: `sala laboratorio ${s.nombre.toLowerCase()} puestos ambiente`,
            action: () => {
                window.location.href = `ubicaciones.html#sala-${s.id}`;
            }
        }));

        // 4. Activos y Equipos filtrados
        let equiposFiltrados = [];
        if (query !== '' && equiposCache.length > 0) {
            equiposFiltrados = equiposCache.filter(eq => {
                const matchCodigo = (eq.codigo_patrimonial || '').toLowerCase().includes(query);
                const matchMarca = (eq.marca || '').toLowerCase().includes(query);
                const matchModelo = (eq.modelo || '').toLowerCase().includes(query);
                const matchSerial = (eq.numero_serie || '').toLowerCase().includes(query);
                const matchSala = (eq.sala_nombre || '').toLowerCase().includes(query);
                const matchPuesto = (eq.puesto_codigo || '').toLowerCase().includes(query);
                const matchEstado = (eq.estado || '').toLowerCase().includes(query);
                const matchIp = (eq.ip_asignada || '').toLowerCase().includes(query);
                return matchCodigo || matchMarca || matchModelo || matchSerial || matchSala || matchPuesto || matchEstado || matchIp;
            }).slice(0, 8).map(eq => {
                const salaPuesto = eq.sala_nombre ? `${eq.sala_nombre}${eq.puesto_codigo ? ' (' + eq.puesto_codigo + ')' : ''}` : 'Sin puesto';
                return {
                    id: `eq-${eq.id}`,
                    grupo: 'Activos & Equipos',
                    titulo: `${eq.codigo_patrimonial} — ${eq.marca} ${eq.modelo}`,
                    subtitulo: `${salaPuesto} • S/N: ${eq.numero_serie || 'N/A'} • IP: ${eq.ip_asignada || 'No asignada'}`,
                    icono: 'fa-desktop',
                    badge: eq.estado,
                    keywords: `${eq.codigo_patrimonial} ${eq.marca} ${eq.modelo} ${eq.numero_serie}`,
                    action: () => {
                        window.location.href = `inventario.html?buscar=${encodeURIComponent(eq.codigo_patrimonial)}`;
                    }
                };
            });
        }

        // Agrupar items según el query
        const gruposAFiltrar = [
            { nombre: 'Navegación Rápida', items: navegacion },
            { nombre: 'Acciones Rápidas', items: acciones },
            { nombre: 'Salas de Laboratorio', items: salasItems }
        ];

        let gruposRender = [];

        if (query === '') {
            gruposRender = [
                { nombre: 'Navegación Rápida', items: navegacion },
                { nombre: 'Acciones Rápidas', items: acciones },
                { nombre: 'Salas de Laboratorio', items: salasItems.slice(0, 5) }
            ];
        } else {
            gruposAFiltrar.forEach(g => {
                const filtrados = g.items.filter(item => 
                    item.titulo.toLowerCase().includes(query) ||
                    item.subtitulo.toLowerCase().includes(query) ||
                    item.keywords.toLowerCase().includes(query)
                );
                if (filtrados.length > 0) {
                    gruposRender.push({ nombre: g.nombre, items: filtrados });
                }
            });

            if (equiposFiltrados.length > 0) {
                gruposRender.push({ nombre: 'Activos & Equipos Coincidentes', items: equiposFiltrados });
            }
        }

        // Si no hay resultados
        if (gruposRender.length === 0) {
            resultsContainer.innerHTML = `
                <div class="cmd-empty">
                    <i class="fa-solid fa-magnifying-glass cmd-empty-icon"></i>
                    <p class="cmd-empty-text">No se encontraron resultados para "<strong>${escapeHtml(query)}</strong>"</p>
                    <span class="cmd-empty-hint">Busca por código patrimonial (ej. PAT-PC-001), modelo, sala o comando general</span>
                </div>
            `;
            return;
        }

        // Construir DOM de grupos e items
        let itemIndex = 0;
        gruposRender.forEach(grupo => {
            const groupEl = document.createElement('div');
            groupEl.className = 'cmd-group';

            const groupTitle = document.createElement('div');
            groupTitle.className = 'cmd-group-title';
            groupTitle.textContent = grupo.nombre;
            groupEl.appendChild(groupTitle);

            grupo.items.forEach(item => {
                currentItems.push(item);
                const thisIndex = itemIndex++;

                const itemEl = document.createElement('div');
                itemEl.className = 'cmd-item' + (thisIndex === selectedIndex ? ' selected' : '');
                itemEl.setAttribute('role', 'option');
                itemEl.setAttribute('data-index', thisIndex);

                itemEl.innerHTML = `
                    <div class="cmd-item-left">
                        <div class="cmd-item-icon">
                            <i class="fa-solid ${item.icono}"></i>
                        </div>
                        <div class="cmd-item-info">
                            <div class="cmd-item-title">${escapeHtml(item.titulo)}</div>
                            <div class="cmd-item-desc">${escapeHtml(item.subtitulo)}</div>
                        </div>
                    </div>
                    <div class="cmd-item-right">
                        <span class="cmd-badge ${getBadgeClass(item.badge)}">${item.badge}</span>
                        <i class="fa-solid fa-arrow-turn-down fa-rotate-90 cmd-item-enter-icon"></i>
                    </div>
                `;

                // Clic directo
                itemEl.addEventListener('click', () => {
                    ejecutarAccionItem(item);
                    cerrarPalette();
                });

                // Mouse hover actualiza índice seleccionado
                itemEl.addEventListener('mouseenter', () => {
                    selectedIndex = thisIndex;
                    actualizarSeleccionVisual();
                });

                groupEl.appendChild(itemEl);
            });

            resultsContainer.appendChild(groupEl);
        });

        actualizarSeleccionVisual();
    }

    // Actualiza la clase visual 'selected' y hace scroll suave si es necesario
    function actualizarSeleccionVisual() {
        const itemEls = resultsContainer.querySelectorAll('.cmd-item');
        itemEls.forEach((el, idx) => {
            if (idx === selectedIndex) {
                el.classList.add('selected');
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                el.classList.remove('selected');
            }
        });
    }

    function ejecutarAccionItem(item) {
        if (item && typeof item.action === 'function') {
            item.action();
        }
    }
}

// Inyección dinámica de HTML del Command Palette
function inyectarModalPalette() {
    if (document.getElementById('command-palette-modal')) return;

    const modalHtml = `
    <div id="command-palette-modal" class="cmd-backdrop" style="display: none;">
        <div class="cmd-dialog" role="dialog" aria-modal="true" aria-labelledby="cmd-search-input">
            <div class="cmd-input-header">
                <i class="fa-solid fa-magnifying-glass cmd-search-icon"></i>
                <input type="text" id="cmd-search-input" class="cmd-input" placeholder="Buscar activos, salas, comandos o navegación..." autocomplete="off" spellcheck="false">
                <kbd class="kbd-shortcut" title="Presiona Esc para salir">ESC</kbd>
            </div>
            
            <div class="cmd-results" id="cmd-results-container" role="listbox">
                <!-- Se llena dinámicamente -->
            </div>

            <div class="cmd-footer">
                <div class="cmd-footer-shortcuts">
                    <span class="cmd-shortcut-tag"><kbd>↑</kbd><kbd>↓</kbd> Navegar</span>
                    <span class="cmd-shortcut-tag"><kbd>↵</kbd> Seleccionar</span>
                    <span class="cmd-shortcut-tag"><kbd>ESC</kbd> Salir</span>
                </div>
                <div class="cmd-footer-branding">
                    <i class="fa-solid fa-server" style="color: var(--brand-blue); margin-right: 4px;"></i>
                    <span>LabInventario</span>
                </div>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Helpers auxiliares
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getBadgeClass(badge) {
    if (!badge) return 'badge-neutral';
    switch (badge.toUpperCase()) {
        case 'OPERATIVO': return 'badge-success';
        case 'DE_BAJA': return 'badge-muted';
        case 'VISTA': return 'badge-blue';
        case 'ACCIÓN': return 'badge-primary';
        case 'SALA': return 'badge-amber';
        case 'EXPORTAR': return 'badge-emerald';
        default: return 'badge-neutral';
    }
}
