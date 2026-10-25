import { obtenerHojaVidaEquipo, obtenerDetalleEquipo } from '../services/api.service.js';
/**
 * Módulo de Exportación y Reportes Oficiales
 * Sistema de Inventario de Laboratorios de Cómputo (LabInventario)
 * Soporta:
 *  - Exportación CSV con UTF-8 BOM para compatibilidad total con Microsoft Excel
 *  - Impresión de Acta Oficial Institucional de Activo Tecnológico (B&N Ejecutivo)
 *  - Impresión de Lote de Etiquetas Adhesivas QR por Sala (Grilla de 3 columnas para recorte)
 */

/**
 * Genera la representación Data URL o URL de imagen de un código QR.
 * Utiliza la librería local QRCode si está presente en el scope global.
 * @param {string} texto - Contenido a codificar
 * @param {number} width - Ancho en px
 * @param {number} height - Alto en px
 * @returns {string} DataURL o URL de la imagen QR
 */
export function generarQrDataUrl(texto, width = 130, height = 130) {
    if (typeof window !== 'undefined' && typeof window.QRCode !== 'undefined') {
        try {
            const container = document.createElement('div');
            new window.QRCode(container, {
                text: texto,
                width: width,
                height: height,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : 2
            });
            const canvas = container.querySelector('canvas');
            if (canvas && canvas.toDataURL) {
                return canvas.toDataURL('image/png');
            }
            const img = container.querySelector('img');
            if (img && img.src) {
                return img.src;
            }
        } catch (e) {
            console.warn('Generador QR local falló, usando fallback:', e);
        }
    }
    // Fallback universal seguro
    return `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${height}&data=${encodeURIComponent(texto)}`;
}

/**
 * Exporta una matriz de datos a un archivo CSV con el carácter UTF-8 BOM (\uFEFF)
 * para garantizar la correcta visualización de tildes, eñes y caracteres especiales en Microsoft Excel.
 * 
 * @param {string} nombreArchivo - Nombre identificador (ej: 'Inventario', 'Bitacora')
 * @param {Array<string>} encabezados - Títulos de las columnas
 * @param {Array<Array<any>>} filas - Datos fila por fila
 */
export function exportarTablaCSV(nombreArchivo, encabezados, filas) {
    if (!Array.isArray(encabezados) || !Array.isArray(filas)) {
        console.error('Parámetros inválidos para exportar CSV');
        return;
    }

    const escaparCelda = (valor) => {
        if (valor === null || valor === undefined) return '""';
        const str = String(valor).replace(/"/g, '""');
        return `"${str}"`;
    };

    const lineaEncabezados = encabezados.map(escaparCelda).join(';');
    const lineasFilas = filas.map(fila => fila.map(escaparCelda).join(';'));
    
    // Prefijo UTF-8 BOM (\uFEFF) para forzar detección de codificación en Excel
    const contenidoCSV = '\uFEFF' + [lineaEncabezados, ...lineasFilas].join('\r\n');

    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const fecha = new Date().toISOString().split('T')[0];
    const nombreDescarga = `LabInventario_${nombreArchivo}_${fecha}.csv`;

    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.setAttribute('download', nombreDescarga);
    enlace.style.display = 'none';

    document.body.appendChild(enlace);
    enlace.click();

    setTimeout(() => {
        document.body.removeChild(enlace);
        URL.revokeObjectURL(enlace.href);
    }, 150);
}

/**
 * Genera y abre una ventana con el Acta Oficial de Asignación y Estado de Activo Tecnológico,
 * lista para imprimir o guardar como PDF en blanco y negro institucional con alta legibilidad.
 * 
 * @param {Object} equipo - Datos completos del equipo
 * @param {Array<Object>} mantenimientos - Historial técnico asociado
 */
export async function imprimirActaEquipo(param, historialParam = null) {
    if (!param) return;

    let equipo = param;
    let mantenimientos = historialParam || [];

    // Si recibe un ID (numérico o string) o un objeto sin datos patrimoniales completos:
    if (typeof param === 'number' || typeof param === 'string' || (param && typeof param === 'object' && !param.codigo_patrimonial && param.id)) {
        const id = typeof param === 'object' ? param.id : param;
        try {
            const res = await obtenerHojaVidaEquipo(id);
            if (res && res.success && res.data) {
                equipo = res.data.equipo || {};
                mantenimientos = res.data.historial_prestamos || [];
            } else {
                const resDet = await obtenerDetalleEquipo(id);
                if (resDet && resDet.success && resDet.data) {
                    equipo = resDet.data;
                }
            }
        } catch (e) {
            console.warn('Error al obtener datos completos del equipo para el acta:', e);
        }
    } else if (equipo && (!mantenimientos || mantenimientos.length === 0) && equipo.historial_prestamos) {
        mantenimientos = equipo.historial_prestamos;
    }

    if (!equipo || (!equipo.codigo_patrimonial && !equipo.id)) {
        console.error('imprimirActaEquipo: No se encontró información válida del activo.');
        return;
    }

    const fechaHoy = new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const horaEmision = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const codPatrimonial = equipo.codigo_patrimonial || '000';
    const codigoDoc = `ACTA-INV-${codPatrimonial}-${new Date().getFullYear()}`;
    const payloadQr = `LAB-INV-${codPatrimonial}`;
    const qrDataUrl = generarQrDataUrl(payloadQr, 130, 130);

    const filasHistorial = Array.isArray(mantenimientos) && mantenimientos.length > 0
        ? mantenimientos.map(p => `
            <tr>
                <td style="white-space: nowrap;">${p.fecha_prestamo ? p.fecha_prestamo.split(' ')[0] : 'N/A'}</td>
                <td><strong>${p.solicitante_nombre || 'Docente / Solicitante'}</strong><br><small style="color: #666;">C.I.: ${p.solicitante_identificacion || 'N/A'}</small></td>
                <td>${p.destino_uso || 'Área Académica'}</td>
                <td><span style="display: inline-block; padding: 2px 6px; font-size: 8pt; font-weight: bold; border-radius: 3px; background: ${p.estado_prestamo === 'ACTIVO' ? '#fff3cd; color: #856404; border: 1px solid #ffeeba' : '#d4edda; color: #155724; border: 1px solid #c3e6cb'};">${p.estado_prestamo === 'ACTIVO' ? 'ACTIVO' : 'DEVUELTO'}</span></td>
                <td>${p.fecha_devolucion_real ? p.fecha_devolucion_real.split(' ')[0] : (p.fecha_devolucion_estimada ? 'Estimada: ' + p.fecha_devolucion_estimada : 'Pendiente / En custodia')}</td>
            </tr>
        `).join('')
        : `
            <tr>
                <td colspan="5" style="text-align: center; color: #555; padding: 14px;">
                    Sin préstamos externos registrados. Activo en custodia directa del laboratorio.
                </td>
            </tr>
        `;

    const htmlActa = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${codigoDoc} - ${codPatrimonial}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 15mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11pt;
            line-height: 1.4;
        }
        .acta-container {
            width: 100%;
            max-width: 100%;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #000000;
            padding-bottom: 10px;
            margin-bottom: 16px;
        }
        .header-title {
            font-size: 13pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin: 0 0 4px 0;
        }
        .header-subtitle {
            font-size: 9.5pt;
            color: #333333;
            margin: 0;
        }
        .header-meta {
            text-align: right;
            font-size: 9pt;
            color: #222222;
        }
        .section-title {
            font-size: 10.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: #f1f1f1;
            padding: 4px 8px;
            border-left: 4px solid #000000;
            margin: 14px 0 8px 0;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .data-table th, .data-table td {
            border: 1px solid #cccccc;
            padding: 6px 8px;
            font-size: 9.5pt;
            text-align: left;
            vertical-align: top;
        }
        .data-table th {
            background-color: #f8f8f8;
            font-weight: 600;
            width: 25%;
        }
        .qr-box {
            text-align: center;
            vertical-align: middle !important;
            padding: 8px !important;
            width: 140px;
        }
        .qr-box img {
            display: block;
            margin: 0 auto 4px auto;
            width: 115px;
            height: 115px;
        }
        .code-highlight {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11pt;
            font-weight: bold;
        }
        .history-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
        }
        .history-table th, .history-table td {
            border: 1px solid #cccccc;
            padding: 5px 6px;
            text-align: left;
        }
        .history-table th {
            background: #f0f0f0;
            font-weight: 700;
        }
        .firmas-grid {
            margin-top: 36px;
            display: flex;
            justify-content: space-between;
            gap: 30px;
            page-break-inside: avoid;
        }
        .firma-col {
            flex: 1;
            text-align: center;
            padding-top: 38px;
            border-top: 1.5px solid #000000;
        }
        .firma-label {
            font-size: 9.5pt;
            font-weight: 700;
            margin-bottom: 3px;
        }
        .firma-sub {
            font-size: 8.5pt;
            color: #444444;
        }
        .footer-note {
            margin-top: 24px;
            font-size: 7.5pt;
            color: #666666;
            text-align: center;
            border-top: 1px dotted #bbbbbb;
            padding-top: 6px;
        }
    </style>
</head>
<body>
    <div class="acta-container">
        <!-- Membrete Institucional -->
        <table class="header-table">
            <tr>
                <td>
                    <h1 class="header-title">Sistema de Gestión y Auditoría de Laboratorios</h1>
                    <p class="header-subtitle">Acta Oficial de Identificación y Ficha Técnica de Activo Tecnológico</p>
                </td>
                <td class="header-meta">
                    <div><strong>Código:</strong> ${codigoDoc}</div>
                    <div><strong>Fecha Emisión:</strong> ${fechaHoy}</div>
                    <div><strong>Hora:</strong> ${horaEmision}</div>
                </td>
            </tr>
        </table>

        <!-- Ficha de Identificación del Activo -->
        <div class="section-title">1. Identificación y Estado Operativo del Activo</div>
        <table class="data-table">
            <tr>
                <th>Código Patrimonial:</th>
                <td><span class="code-highlight">${equipo.codigo_patrimonial || 'N/A'}</span></td>
                <td rowspan="4" class="qr-box">
                    <img src="${qrDataUrl}" alt="QR ${codPatrimonial}">
                    <div style="font-size: 8pt; font-family: monospace; font-weight: bold;">${codPatrimonial}</div>
                </td>
            </tr>
            <tr>
                <th>Número de Serie (S/N):</th>
                <td>${equipo.numero_serie || equipo.serie || 'N/A'}</td>
            </tr>
            <tr>
                <th>Marca y Modelo:</th>
                <td><strong>${equipo.marca || ''} ${equipo.modelo || ''}</strong></td>
            </tr>
            <tr>
                <th>Categoría del Activo:</th>
                <td>${(equipo.categoria || 'EQUIPO').replace(/_/g, ' ')}</td>
            </tr>
            <tr>
                <th>Ubicación Actual:</th>
                <td><strong>${equipo.sala_nombre || 'Laboratorio / Depósito'}</strong></td>
                <td><strong>Puesto:</strong> ${equipo.puesto_codigo || 'Sin puesto fijo'}</td>
            </tr>
            <tr>
                <th>Estado Operativo:</th>
                <td colspan="2"><strong>${equipo.estado || 'OPERATIVO'}</strong></td>
            </tr>
        </table>

        <!-- Especificaciones Técnicas y de Red -->
        <div class="section-title">2. Especificaciones de Hardware & Conectividad</div>
        <table class="data-table">
            <tr>
                <th style="width: 20%;">Procesador (CPU):</th>
                <td style="width: 30%;">${equipo.cpu || 'No especificado'}</td>
                <th style="width: 20%;">Memoria RAM:</th>
                <td style="width: 30%;">${equipo.ram_gb ? `${equipo.ram_gb} GB` : 'No especificado'}</td>
            </tr>
            <tr>
                <th>Almacenamiento:</th>
                <td>${equipo.almacenamiento || 'No especificado'}</td>
                <th>Dirección IP:</th>
                <td><span style="font-family: monospace;">${equipo.ip_asignada || 'No asignada'}</span></td>
            </tr>
            <tr>
                <th>Dirección MAC:</th>
                <td><span style="font-family: monospace;">${equipo.mac_address || 'No registrada'}</span></td>
                <th>Fecha Ingreso:</th>
                <td>${equipo.fecha_ingreso || 'N/A'}</td>
            </tr>
            <tr>
                <th>Observaciones:</th>
                <td colspan="3">${equipo.notas || 'Sin observaciones adicionales registradas.'}</td>
            </tr>
        </table>

        <!-- Historial de Mantenimientos e Incidencias -->
        <div class="section-title">3. Trazabilidad Patrimonial y Control de Préstamos</div>
        <table class="history-table">
            <thead>
                <tr>
                    <th style="width: 16%;">Fecha Préstamo</th>
                    <th style="width: 26%;">Solicitante / C.I.</th>
                    <th style="width: 22%;">Destino / Uso</th>
                    <th style="width: 16%;">Estado</th>
                    <th style="width: 20%;">Fecha Devolución</th>
                </tr>
            </thead>
            <tbody>
                ${filasHistorial}
            </tbody>
        </table>

        <!-- Bloque de Firmas de Responsabilidad -->
        <div class="firmas-grid">
            <div class="firma-col">
                <div class="firma-label">Firma del Responsable de Laboratorio</div>
                <div class="firma-sub">Control de Activos y Asignación Física</div>
            </div>
            <div class="firma-col">
                <div class="firma-label">Firma del Técnico de Soporte / Auditoría</div>
                <div class="firma-sub">Diagnóstico Técnico y Validación Operativa</div>
            </div>
        </div>

        <div class="footer-note">
            Este documento constituye constancia oficial emitida por el Sistema LabInventario. Documento válido para auditorías internas e inventario patrimonial.
        </div>
    </div>

    <script>
        window.addEventListener('load', () => {
            setTimeout(() => {
                window.print();
            }, 300);
        });
    </script>
</body>
</html>`;

    const ventana = window.open('', '_blank');
    if (ventana) {
        ventana.document.open();
        ventana.document.write(htmlActa);
        ventana.document.close();
    } else {
        alert('Por favor, permite las ventanas emergentes (pop-ups) en tu navegador para imprimir el acta oficial.');
    }
}

export function imprimirLoteQRSala(salaNombre, equiposSala) {
    if (!Array.isArray(equiposSala) || equiposSala.length === 0) {
        alert('No se encontraron equipos en esta sala para generar etiquetas.');
        return;
    }

    const etiquetasHtml = equiposSala.map(eq => {
        const payloadQr = `LAB-INV-${eq.codigo_patrimonial}`;
        const qrImg = generarQrDataUrl(payloadQr, 120, 120);
        const puesto = eq.puesto_codigo || 'General / Sin puesto';

        return `
            <div class="sticker">
                <div class="sticker-brand">
                    <span class="brand-badge-box">LAB</span>
                    <span>LabInventario</span>
                </div>
                <div class="sticker-qr-wrap">
                    <img src="${qrImg}" alt="QR ${eq.codigo_patrimonial}" />
                </div>
                <div class="sticker-code">${eq.codigo_patrimonial}</div>
                <div class="sticker-model">${eq.marca || ''} ${eq.modelo || ''}</div>
                <div class="sticker-loc">
                    <span>${puesto}</span>
                    <span class="sticker-serial">${eq.numero_serie ? 'S/N: ' + eq.numero_serie : ''}</span>
                </div>
            </div>
        `;
    }).join('');

    const htmlDoc = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Etiquetas QR - ${salaNombre}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 10mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            background: #ffffff;
            color: #000000;
            margin: 0;
            padding: 0;
        }
        .header-print {
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .header-print h2 {
            margin: 0;
            font-size: 13pt;
            font-weight: 800;
            text-transform: uppercase;
        }
        .header-print span {
            font-size: 9pt;
            color: #444;
        }
        .stickers-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        .sticker {
            border: 1px dashed #000000;
            border-radius: 6px;
            padding: 8px 10px;
            text-align: center;
            background: #ffffff;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            min-height: 185px;
        }
        .sticker-brand {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #222;
            margin-bottom: 4px;
        }
        .brand-badge-box {
            background: #000;
            color: #fff;
            padding: 1px 4px;
            border-radius: 2px;
            font-size: 7pt;
        }
        .sticker-qr-wrap img {
            width: 105px;
            height: 105px;
            display: block;
            margin: 0 auto;
        }
        .sticker-code {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11pt;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-top: 4px;
            color: #000;
        }
        .sticker-model {
            font-size: 8pt;
            font-weight: 600;
            color: #222;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        }
        .sticker-loc {
            font-size: 7.5pt;
            color: #444;
            margin-top: 2px;
            display: flex;
            justify-content: space-between;
            width: 100%;
            border-top: 1px dotted #ccc;
            padding-top: 3px;
        }
        .sticker-serial {
            font-family: monospace;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header-print">
        <div>
            <h2>Planilla de Etiquetas QR - ${salaNombre}</h2>
            <span>Total activos en lote: ${equiposSala.length} | Imprimir en papel autoadhesivo o regular</span>
        </div>
        <span>LabInventario — ${new Date().toLocaleDateString('es-ES')}</span>
    </div>

    <div class="stickers-grid">
        ${etiquetasHtml}
    </div>

    <script>
        window.addEventListener('load', () => {
            setTimeout(() => {
                window.print();
            }, 300);
        });
    </script>
</body>
</html>`;

    const ventana = window.open('', '_blank');
    if (ventana) {
        ventana.document.open();
        ventana.document.write(htmlDoc);
        ventana.document.close();
    } else {
        alert('Por favor, permite las ventanas emergentes (pop-ups) en tu navegador para imprimir las etiquetas QR.');
    }
}
