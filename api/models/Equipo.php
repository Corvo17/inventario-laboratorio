<?php
require_once __DIR__ . '/../config/database.php';

class Equipo {
    public static function getAll(array $filters = []): array {
        $db = Database::getConnection();

        $sql = "
            SELECT 
                e.id,
                e.codigo_patrimonial,
                e.numero_serie,
                e.categoria,
                e.marca,
                e.modelo,
                e.estado,
                e.sala_id,
                e.puesto_id,
                e.cpu,
                e.ram_gb,
                e.almacenamiento,
                e.ip_asignada,
                e.mac_address,
                e.fecha_ingreso,
                e.notas,
                e.created_at,
                s.nombre AS sala_nombre,
                p.codigo_puesto AS puesto_codigo
            FROM equipos e
            LEFT JOIN salas s ON e.sala_id = s.id
            LEFT JOIN puestos p ON e.puesto_id = p.id
            WHERE 1=1
        ";

        $params = [];

        if (!empty($filters['search'])) {
            $sql .= " AND (
                e.codigo_patrimonial LIKE :search_cod OR
                e.numero_serie LIKE :search_ser OR
                e.marca LIKE :search_mar OR
                e.modelo LIKE :search_mod
            )";
            $searchTerm = '%' . trim($filters['search']) . '%';
            $params[':search_cod'] = $searchTerm;
            $params[':search_ser'] = $searchTerm;
            $params[':search_mar'] = $searchTerm;
            $params[':search_mod'] = $searchTerm;
        }

        if (!empty($filters['estado'])) {
            $sql .= " AND e.estado = :estado";
            $params[':estado'] = trim($filters['estado']);
        }

        if (!empty($filters['sala_id']) && $filters['sala_id'] !== 'undefined') {
            $sql .= " AND e.sala_id = :sala_id";
            $params[':sala_id'] = (int)$filters['sala_id'];
        }

        $sql .= " ORDER BY e.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    public static function getById(int $id): ?array {
        $db = Database::getConnection();

        $sqlEquipo = "
            SELECT 
                e.id,
                e.codigo_patrimonial,
                e.numero_serie,
                e.categoria,
                e.marca,
                e.modelo,
                e.estado,
                e.sala_id,
                e.puesto_id,
                e.cpu,
                e.ram_gb,
                e.almacenamiento,
                e.ip_asignada,
                e.mac_address,
                e.fecha_ingreso,
                e.notas,
                e.created_at,
                s.nombre AS sala_nombre,
                p.codigo_puesto AS puesto_codigo,
                p.fila AS puesto_fila,
                p.columna AS puesto_columna
            FROM equipos e
            LEFT JOIN salas s ON e.sala_id = s.id
            LEFT JOIN puestos p ON e.puesto_id = p.id
            WHERE e.id = :id
            LIMIT 1
        ";

        $stmt = $db->prepare($sqlEquipo);
        $stmt->execute([':id' => $id]);
        $equipo = $stmt->fetch();

        if (!$equipo) {
            return null;
        }

        $sqlHistorial = "
            SELECT 
                id,
                fecha_reporte,
                fecha_resolucion,
                tipo,
                prioridad,
                titulo,
                descripcion_falla,
                tecnico_responsable,
                estado_resultado,
                diagnostico_tecnico,
                acciones_realizadas
            FROM mantenimientos
            WHERE equipo_id = :equipo_id
            ORDER BY id DESC
        ";

        $stmtHistorial = $db->prepare($sqlHistorial);
        $stmtHistorial->execute([':equipo_id' => $id]);
        $equipo['historial_mantenimiento'] = $stmtHistorial->fetchAll();

        return $equipo;
    }

    public static function create(array $data): int {
        $db = Database::getConnection();

        $required = ['codigo_patrimonial', 'numero_serie', 'categoria', 'marca', 'modelo', 'estado', 'sala_id'];
        foreach ($required as $field) {
            if (empty($data[$field]) || trim((string)$data[$field]) === '') {
                throw new InvalidArgumentException("El campo '{$field}' es obligatorio.", 400);
            }
        }

        $codigo = trim($data['codigo_patrimonial']);
        $serial = trim($data['numero_serie']);

        $stmt = $db->prepare("SELECT id FROM equipos WHERE codigo_patrimonial = :codigo LIMIT 1");
        $stmt->execute([':codigo' => $codigo]);
        if ($stmt->fetch()) {
            throw new RuntimeException("El código patrimonial '{$codigo}' ya está registrado.", 409);
        }

        $stmt = $db->prepare("SELECT id FROM equipos WHERE numero_serie = :serial LIMIT 1");
        $stmt->execute([':serial' => $serial]);
        if ($stmt->fetch()) {
            throw new RuntimeException("El número de serie '{$serial}' ya está registrado.", 409);
        }

                $puesto_id = null;
        if (!empty($data['puesto_id']) && (int)$data['puesto_id'] > 0) {
            $puesto_id = (int)$data['puesto_id'];
            $sala_id = (int)$data['sala_id'];

            // Validar que el puesto pertenezca a la sala seleccionada
            $stmtPuesto = $db->prepare("SELECT sala_id FROM puestos WHERE id = :puesto_id LIMIT 1");
            $stmtPuesto->execute([':puesto_id' => $puesto_id]);
            $puestoRow = $stmtPuesto->fetch();
            if (!$puestoRow || (int)$puestoRow['sala_id'] !== $sala_id) {
                throw new InvalidArgumentException("El puesto no pertenece a la sala seleccionada.", 400);
            }

            $chk = $db->prepare("SELECT id FROM equipos WHERE puesto_id = :puesto_id LIMIT 1");
            $chk->execute([':puesto_id' => $puesto_id]);
            if ($chk->fetch()) {
                throw new RuntimeException("El puesto seleccionado ya está asignado a otro equipo.", 409);
            }
        }

        $sql = "
            INSERT INTO equipos (
                codigo_patrimonial,
                numero_serie,
                categoria,
                marca,
                modelo,
                estado,
                sala_id,
                puesto_id,
                cpu,
                ram_gb,
                almacenamiento,
                ip_asignada,
                mac_address,
                fecha_ingreso,
                notas
            ) VALUES (
                :codigo_patrimonial,
                :numero_serie,
                :categoria,
                :marca,
                :modelo,
                :estado,
                :sala_id,
                :puesto_id,
                :cpu,
                :ram_gb,
                :almacenamiento,
                :ip_asignada,
                :mac_address,
                :fecha_ingreso,
                :notas
            )
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':codigo_patrimonial' => $codigo,
            ':numero_serie'       => $serial,
            ':categoria'          => trim($data['categoria']),
            ':marca'              => trim($data['marca']),
            ':modelo'             => trim($data['modelo']),
            ':estado'             => trim($data['estado']),
            ':sala_id'            => (int)$data['sala_id'],
            ':puesto_id'          => $puesto_id,
            ':cpu'                => !empty($data['cpu']) ? trim($data['cpu']) : null,
            ':ram_gb'             => (!empty($data['ram_gb']) && (int)$data['ram_gb'] > 0) ? (int)$data['ram_gb'] : null,
            ':almacenamiento'     => !empty($data['almacenamiento']) ? trim($data['almacenamiento']) : null,
            ':ip_asignada'        => !empty($data['ip_asignada']) ? trim($data['ip_asignada']) : null,
            ':mac_address'        => !empty($data['mac_address']) ? trim($data['mac_address']) : null,
            ':fecha_ingreso'      => !empty($data['fecha_ingreso']) ? trim($data['fecha_ingreso']) : date('Y-m-d'),
            ':notas'              => !empty($data['notas']) ? trim($data['notas']) : null,
        ]);

        return (int)$db->lastInsertId();
    }

    /**
     * Actualiza la información y especificaciones de un equipo
     */
    public static function update(int $id, array $data): bool {
        $db = Database::getConnection();

        // 1. Validar requeridos
        $required = ['codigo_patrimonial', 'numero_serie', 'categoria', 'marca', 'modelo', 'estado', 'sala_id'];
        foreach ($required as $field) {
            if (empty($data[$field]) || trim((string)$data[$field]) === '') {
                throw new InvalidArgumentException("El campo '{$field}' es obligatorio.", 400);
            }
        }

        $codigo = trim($data['codigo_patrimonial']);
        $serial = trim($data['numero_serie']);

        // 2. Verificar duplicados excluyendo el ID actual
        $stmtCod = $db->prepare("SELECT id FROM equipos WHERE codigo_patrimonial = :codigo AND id != :id LIMIT 1");
        $stmtCod->execute([':codigo' => $codigo, ':id' => $id]);
        if ($stmtCod->fetch()) {
            throw new RuntimeException("El código patrimonial '{$codigo}' ya está asignado a otro equipo.", 409);
        }

        $stmtSer = $db->prepare("SELECT id FROM equipos WHERE numero_serie = :serial AND id != :id LIMIT 1");
        $stmtSer->execute([':serial' => $serial, ':id' => $id]);
        if ($stmtSer->fetch()) {
            throw new RuntimeException("El número de serie '{$serial}' ya está asignado a otro equipo.", 409);
        }

        // 3. Validar puesto
        $puesto_id = null;
        if (!empty($data['puesto_id']) && (int)$data['puesto_id'] > 0) {
            $puesto_id = (int)$data['puesto_id'];
            $sala_id = (int)$data['sala_id'];

            // Validar que el puesto pertenezca a la sala seleccionada
            $stmtPuesto = $db->prepare("SELECT sala_id FROM puestos WHERE id = :puesto_id LIMIT 1");
            $stmtPuesto->execute([':puesto_id' => $puesto_id]);
            $puestoRow = $stmtPuesto->fetch();
            if (!$puestoRow || (int)$puestoRow['sala_id'] !== $sala_id) {
                throw new InvalidArgumentException("El puesto no pertenece a la sala seleccionada.", 400);
            }

            $chk = $db->prepare("SELECT id FROM equipos WHERE puesto_id = :puesto_id AND id != :id LIMIT 1");
            $chk->execute([':puesto_id' => $puesto_id, ':id' => $id]);
            if ($chk->fetch()) {
                throw new RuntimeException("El puesto seleccionado ya está ocupado por otro activo.", 409);
            }
        }

        // 4. Actualizar
        $sql = "
            UPDATE equipos SET
                codigo_patrimonial = :codigo_patrimonial,
                numero_serie       = :numero_serie,
                categoria          = :categoria,
                marca              = :marca,
                modelo             = :modelo,
                estado             = :estado,
                sala_id            = :sala_id,
                puesto_id          = :puesto_id,
                cpu                = :cpu,
                ram_gb             = :ram_gb,
                almacenamiento     = :almacenamiento,
                ip_asignada        = :ip_asignada,
                mac_address        = :mac_address,
                fecha_ingreso      = :fecha_ingreso,
                notas              = :notas
            WHERE id = :id
        ";

        $stmt = $db->prepare($sql);
        return $stmt->execute([
            ':id'                 => $id,
            ':codigo_patrimonial' => $codigo,
            ':numero_serie'       => $serial,
            ':categoria'          => trim($data['categoria']),
            ':marca'              => trim($data['marca']),
            ':modelo'             => trim($data['modelo']),
            ':estado'             => trim($data['estado']),
            ':sala_id'            => (int)$data['sala_id'],
            ':puesto_id'          => $puesto_id,
            ':cpu'                => !empty($data['cpu']) ? trim($data['cpu']) : null,
            ':ram_gb'             => (!empty($data['ram_gb']) && (int)$data['ram_gb'] > 0) ? (int)$data['ram_gb'] : null,
            ':almacenamiento'     => !empty($data['almacenamiento']) ? trim($data['almacenamiento']) : null,
            ':ip_asignada'        => !empty($data['ip_asignada']) ? trim($data['ip_asignada']) : null,
            ':mac_address'        => !empty($data['mac_address']) ? trim($data['mac_address']) : null,
            ':fecha_ingreso'      => !empty($data['fecha_ingreso']) ? trim($data['fecha_ingreso']) : date('Y-m-d'),
            ':notas'              => !empty($data['notas']) ? trim($data['notas']) : null,
        ]);
    }

    /**
     * Métricas consolidadas ejecutivas para el Dashboard
     */
    public static function getDashboardMetrics(): array {
        $db = Database::getConnection();

        // 1. Conteo general y por estados patrimoniales
        $sqlCounts = "
            SELECT 
                COUNT(*) AS total_equipos,
                SUM(CASE WHEN estado = 'OPERATIVO' THEN 1 ELSE 0 END) AS operativos,
                SUM(CASE WHEN estado = 'EN_PRESTAMO' THEN 1 ELSE 0 END) AS en_prestamo,
                SUM(CASE WHEN estado = 'DE_BAJA' THEN 1 ELSE 0 END) AS de_baja,
                SUM(CASE WHEN puesto_id IS NOT NULL THEN 1 ELSE 0 END) AS puestos_ocupados,
                SUM(CASE WHEN puesto_id IS NULL THEN 1 ELSE 0 END) AS equipos_deposito
            FROM equipos
        ";
        $stmtCounts = $db->query($sqlCounts);
        $counts = $stmtCounts->fetch();

        $total = (int)($counts['total_equipos'] ?? 0);
        $operativos = (int)($counts['operativos'] ?? 0);
        $enPrestamo = (int)($counts['en_prestamo'] ?? 0);
        $deBaja = (int)($counts['de_baja'] ?? 0);
        $puestosOcupados = (int)($counts['puestos_ocupados'] ?? 0);
        $equiposDeposito = (int)($counts['equipos_deposito'] ?? 0);

        $tasaOperatividad = $total > 0 ? round(($operativos / $total) * 100, 1) : 0;

        // 2. Capacidad total de puestos en todas las salas
        $stmtCapacidad = $db->query("SELECT COALESCE(SUM(capacidad_puestos), 0) FROM salas");
        $totalCapacidadPuestos = (int)$stmtCapacidad->fetchColumn();

        // 3. Ocupación física real por sala
        $sqlSalas = "
            SELECT 
                s.id AS sala_id,
                s.nombre AS sala_nombre,
                s.capacidad_puestos,
                COUNT(e.id) AS total_equipos,
                SUM(CASE WHEN e.puesto_id IS NOT NULL THEN 1 ELSE 0 END) AS puestos_ocupados,
                SUM(CASE WHEN e.estado = 'OPERATIVO' THEN 1 ELSE 0 END) AS operativos
            FROM salas s
            LEFT JOIN equipos e ON s.id = e.sala_id
            GROUP BY s.id, s.nombre, s.capacidad_puestos
            ORDER BY s.nombre ASC
        ";
        $stmtSalas = $db->query($sqlSalas);
        $rawSalas = $stmtSalas->fetchAll();

        $equiposPorSala = array_map(function($s) {
            $capacidad = (int)$s['capacidad_puestos'];
            $ocupados = (int)$s['puestos_ocupados'];
            $libres = max(0, $capacidad - $ocupados);
            $porcentajeOcupacion = $capacidad > 0 ? round(($ocupados / $capacidad) * 100) : 0;

            return [
                'sala_id'              => (int)$s['sala_id'],
                'sala_nombre'          => $s['sala_nombre'],
                'capacidad_puestos'    => $capacidad,
                'total_equipos'        => (int)$s['total_equipos'],
                'puestos_ocupados'     => $ocupados,
                'puestos_libres'       => $libres,
                'porcentaje_ocupacion' => $porcentajeOcupacion,
                'operativos'           => (int)$s['operativos']
            ];
        }, $rawSalas);

        // 4. Distribución por Categorías
        $sqlCategorias = "
            SELECT categoria, COUNT(*) AS total
            FROM equipos
            GROUP BY categoria
            ORDER BY total DESC
        ";
        $stmtCategorias = $db->query($sqlCategorias);
        $distribucionCategorias = $stmtCategorias->fetchAll();

        // 5. Últimos Movimientos Patrimoniales
        $sqlMovimientos = "
            (
                SELECT 
                    'PRESTAMO' AS tipo_evento,
                    p.fecha_prestamo AS fecha,
                    e.codigo_patrimonial,
                    CONCAT(e.marca, ' ', e.modelo) AS modelo,
                    CONCAT('Préstamo asignado a ', p.solicitante_nombre, ' (', p.destino_uso, ')') AS descripcion,
                    'MEDIA' AS prioridad,
                    p.estado_prestamo AS estado
                FROM prestamos p
                JOIN equipos e ON p.equipo_id = e.id
            )
            UNION ALL
            (
                SELECT 
                    'DEVOLUCION' AS tipo_evento,
                    p.fecha_devolucion_real AS fecha,
                    e.codigo_patrimonial,
                    CONCAT(e.marca, ' ', e.modelo) AS modelo,
                    CONCAT('Devolución de préstamo por ', p.solicitante_nombre) AS descripcion,
                    'BAJA' AS prioridad,
                    'DEVUELTO' AS estado
                FROM prestamos p
                JOIN equipos e ON p.equipo_id = e.id
                WHERE p.fecha_devolucion_real IS NOT NULL
            )
            UNION ALL
            (
                SELECT 
                    'ALTA_EQUIPO' AS tipo_evento,
                    e.created_at AS fecha,
                    e.codigo_patrimonial,
                    CONCAT(e.marca, ' ', e.modelo) AS modelo,
                    CONCAT('Alta de nuevo activo patrimonial (', REPLACE(e.categoria, '_', ' '), ')') AS descripcion,
                    'BAJA' AS prioridad,
                    e.estado AS estado
                FROM equipos e
            )
            ORDER BY fecha DESC
            LIMIT 6
        ";
        $stmtMovimientos = $db->query($sqlMovimientos);
        $ultimosMovimientos = $stmtMovimientos->fetchAll();

        return [
            'total_equipos'           => $total,
            'operativos'              => $operativos,
            'en_prestamo'             => $enPrestamo,
            'de_baja'                 => $deBaja,
            'tasa_operatividad'       => $tasaOperatividad,
            'puestos_ocupados'        => $puestosOcupados,
            'total_capacidad_puestos' => $totalCapacidadPuestos,
            'equipos_deposito'        => $equiposDeposito,
            'repuestos_deposito'      => $equiposDeposito,
            'equipos_por_sala'        => $equiposPorSala,
            'distribucion_categorias' => $distribucionCategorias,
            'ultimos_movimientos'     => $ultimosMovimientos
        ];
    }

    /**
     * Devuelve la Hoja de Vida y Trazabilidad cronológica completa de un equipo.
     */
    public static function getHojaVida(int $id): ?array {
        $db = Database::getConnection();

        // 1. Datos completos del equipo
        $sqlEquipo = "
            SELECT 
                e.id,
                e.codigo_patrimonial,
                e.numero_serie,
                e.categoria,
                e.marca,
                e.modelo,
                e.estado,
                e.sala_id,
                e.puesto_id,
                e.cpu,
                e.ram_gb,
                e.almacenamiento,
                e.ip_asignada,
                e.mac_address,
                e.fecha_ingreso,
                e.notas,
                e.created_at,
                s.nombre AS sala_nombre,
                p.codigo_puesto AS puesto_codigo,
                p.fila AS puesto_fila,
                p.columna AS puesto_columna
            FROM equipos e
            LEFT JOIN salas s ON e.sala_id = s.id
            LEFT JOIN puestos p ON e.puesto_id = p.id
            WHERE e.id = :id
            LIMIT 1
        ";
        $stmtEquipo = $db->prepare($sqlEquipo);
        $stmtEquipo->execute([':id' => $id]);
        $equipo = $stmtEquipo->fetch();

        if (!$equipo) {
            return null;
        }

        // 2. Historial de Préstamos
        $sqlPrestamos = "
            SELECT 
                id,
                equipo_id,
                solicitante_nombre,
                solicitante_identificacion,
                destino_uso,
                fecha_prestamo,
                fecha_devolucion_estimada,
                fecha_devolucion_real,
                estado_prestamo,
                observaciones
            FROM prestamos
            WHERE equipo_id = :equipo_id
            ORDER BY fecha_prestamo DESC, id DESC
        ";
        $stmtPrest = $db->prepare($sqlPrestamos);
        $stmtPrest->execute([':equipo_id' => $id]);
        $prestamos = $stmtPrest->fetchAll();

        // 3. Préstamo Activo actual (si existe)
        $prestamoActivo = null;
        foreach ($prestamos as $pr) {
            if ($pr['estado_prestamo'] === 'ACTIVO') {
                $prestamoActivo = $pr;
                break;
            }
        }

        // 4. Construcción de Línea de Tiempo Patrimonial Unificada
        $timeline = [];

        // Hito: Alta e Incorporación
        $fechaAlta = !empty($equipo['created_at']) ? $equipo['created_at'] : (!empty($equipo['fecha_ingreso']) ? $equipo['fecha_ingreso'] . ' 08:00:00' : date('Y-m-d H:i:s'));
        $ubicacionTexto = ($equipo['sala_nombre'] ?? 'Sin sala asignada') . ($equipo['puesto_codigo'] ? " (Puesto {$equipo['puesto_codigo']})" : '');
        
        $timeline[] = [
            'tipo'        => 'ALTA',
            'categoria'   => 'INCORPORACION',
            'titulo'      => 'Alta e Incorporación al Inventario',
            'fecha'       => $fechaAlta,
            'ubicacion'   => $ubicacionTexto,
            'descripcion' => "Incorporación formal del activo al inventario. Ubicación inicial: {$ubicacionTexto}.",
            'estado'      => $equipo['estado'],
            'badge_tipo'  => 'success',
            'icono'       => 'fa-box-archive'
        ];

        // Hito: Asignación a Puesto Físico (si está en puesto)
        if (!empty($equipo['puesto_codigo'])) {
            $timeline[] = [
                'tipo'        => 'REUBICACION',
                'categoria'   => 'ASIGNACION_FISICA',
                'titulo'      => 'Asignación a Puesto Físico',
                'fecha'       => $fechaAlta,
                'ubicacion'   => "{$equipo['sala_nombre']} - {$equipo['puesto_codigo']}",
                'descripcion' => "Activo instalado en {$equipo['sala_nombre']}, puesto {$equipo['puesto_codigo']}.",
                'estado'      => 'OPERATIVO',
                'badge_tipo'  => 'outline',
                'icono'       => 'fa-desktop'
            ];
        }

        // Hitos: Préstamos
        foreach ($prestamos as $p) {
            $esActivo = ($p['estado_prestamo'] === 'ACTIVO');
            $descPrestamo = "Asignado a: {$p['solicitante_nombre']} (ID: {$p['solicitante_identificacion']}) para destino: {$p['destino_uso']}.";
            if (!empty($p['observaciones'])) {
                $descPrestamo .= " Obs: {$p['observaciones']}";
            }
            if (!$esActivo && !empty($p['fecha_devolucion_real'])) {
                $descPrestamo .= " [Devuelto el {$p['fecha_devolucion_real']}]";
            }

            $timeline[] = [
                'tipo'                      => 'PRESTAMO',
                'id'                        => (int)$p['id'],
                'categoria'                 => 'PRESTAMO',
                'titulo'                    => ($esActivo ? 'Préstamo Activo: ' : 'Préstamo Concluido: ') . $p['solicitante_nombre'],
                'fecha'                     => $p['fecha_prestamo'],
                'fecha_devolucion_estimada' => $p['fecha_devolucion_estimada'],
                'fecha_devolucion_real'     => $p['fecha_devolucion_real'],
                'solicitante_nombre'        => $p['solicitante_nombre'],
                'solicitante_identificacion'=> $p['solicitante_identificacion'],
                'destino_uso'               => $p['destino_uso'],
                'descripcion'               => $descPrestamo,
                'estado'                    => $p['estado_prestamo'],
                'badge_tipo'                => $esActivo ? 'primary' : 'outline',
                'icono'                     => $esActivo ? 'fa-handshake-angle' : 'fa-handshake'
            ];
        }

        // Ordenar la línea de tiempo de forma cronológica descendente
        usort($timeline, function($a, $b) {
            return strtotime($b['fecha']) <=> strtotime($a['fecha']);
        });

        return [
            'equipo'                   => $equipo,
            'prestamo_activo'          => $prestamoActivo,
            'historial_mantenimientos' => [],
            'historial_prestamos'      => $prestamos,
            'timeline'                 => $timeline
        ];
    }

    /**
     * Registra un nuevo préstamo y pasa el equipo a 'EN_PRESTAMO'.
     */
    public static function registrarPrestamo(array $data): int {
        $db = Database::getConnection();

        $equipoId = (int)($data['equipo_id'] ?? 0);
        if ($equipoId <= 0) {
            throw new InvalidArgumentException("ID de equipo inválido.", 400);
        }

        $nombre = trim((string)($data['solicitante_nombre'] ?? ''));
        $identificacion = trim((string)($data['solicitante_identificacion'] ?? ''));
        $destino = trim((string)($data['destino_uso'] ?? ''));
        $fechaEstimada = !empty($data['fecha_devolucion_estimada']) ? trim((string)$data['fecha_devolucion_estimada']) : null;
        $observaciones = !empty($data['observaciones']) ? trim((string)$data['observaciones']) : null;

        if ($nombre === '') {
            throw new InvalidArgumentException("El nombre del solicitante / docente es obligatorio.", 400);
        }
        if ($identificacion === '') {
            throw new InvalidArgumentException("La cédula o ID institucional del solicitante es obligatoria.", 400);
        }
        if ($destino === '') {
            throw new InvalidArgumentException("El aula o destino de uso es obligatorio.", 400);
        }

        $db->beginTransaction();
        try {
            $stmtEquipo = $db->prepare("SELECT id, estado FROM equipos WHERE id = :id FOR UPDATE");
            $stmtEquipo->execute([':id' => $equipoId]);
            $equipo = $stmtEquipo->fetch();

            if (!$equipo) {
                throw new RuntimeException("El equipo #{$equipoId} no existe.", 404);
            }
            if ($equipo['estado'] === 'EN_PRESTAMO') {
                throw new RuntimeException("El equipo ya se encuentra actualmente asignado en préstamo activo.", 409);
            }
            if ($equipo['estado'] === 'DE_BAJA') {
                throw new RuntimeException("No se puede prestar un equipo que ha sido dado de baja patrimonial.", 409);
            }

            // Validar que no haya préstamo activo huérfano
            $chkLoan = $db->prepare("SELECT id FROM prestamos WHERE equipo_id = :equipo_id AND estado_prestamo = 'ACTIVO' LIMIT 1");
            $chkLoan->execute([':equipo_id' => $equipoId]);
            if ($chkLoan->fetch()) {
                throw new RuntimeException("El equipo ya tiene un registro de préstamo activo pendiente de devolución.", 409);
            }

            // Insertar préstamo
            $sqlInsert = "
                INSERT INTO prestamos (
                    equipo_id,
                    solicitante_nombre,
                    solicitante_identificacion,
                    destino_uso,
                    fecha_devolucion_estimada,
                    observaciones,
                    estado_prestamo,
                    fecha_prestamo
                ) VALUES (
                    :equipo_id,
                    :solicitante_nombre,
                    :solicitante_identificacion,
                    :destino_uso,
                    :fecha_devolucion_estimada,
                    :observaciones,
                    'ACTIVO',
                    NOW()
                )
            ";
            $stmtInsert = $db->prepare($sqlInsert);
            $stmtInsert->execute([
                ':equipo_id'                 => $equipoId,
                ':solicitante_nombre'        => $nombre,
                ':solicitante_identificacion'=> $identificacion,
                ':destino_uso'               => $destino,
                ':fecha_devolucion_estimada' => $fechaEstimada,
                ':observaciones'             => $observaciones
            ]);
            $prestamoId = (int)$db->lastInsertId();

            // Actualizar estado del equipo a EN_PRESTAMO
            $stmtUpd = $db->prepare("UPDATE equipos SET estado = 'EN_PRESTAMO' WHERE id = :id");
            $stmtUpd->execute([':id' => $equipoId]);

            $db->commit();
            return $prestamoId;
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Marca un préstamo como DEVUELTO y restaura el estado del equipo a 'OPERATIVO'.
     */
    public static function devolverPrestamo(int $equipoId = 0, int $prestamoId = 0): bool {
        $db = Database::getConnection();

        if ($equipoId <= 0 && $prestamoId <= 0) {
            throw new InvalidArgumentException("Debe especificar equipo_id o prestamo_id para procesar la devolución.", 400);
        }

        $db->beginTransaction();
        try {
            if ($prestamoId > 0) {
                $stmt = $db->prepare("SELECT id, equipo_id, estado_prestamo FROM prestamos WHERE id = :id FOR UPDATE");
                $stmt->execute([':id' => $prestamoId]);
                $prestamo = $stmt->fetch();
                if (!$prestamo) {
                    throw new RuntimeException("El préstamo #{$prestamoId} no existe.", 404);
                }
                $targetEquipoId = (int)$prestamo['equipo_id'];
                $targetPrestamoId = (int)$prestamo['id'];
            } else {
                $stmt = $db->prepare("SELECT id, equipo_id, estado_prestamo FROM prestamos WHERE equipo_id = :equipo_id AND estado_prestamo = 'ACTIVO' ORDER BY id DESC LIMIT 1 FOR UPDATE");
                $stmt->execute([':equipo_id' => $equipoId]);
                $prestamo = $stmt->fetch();
                if (!$prestamo) {
                    // Si el equipo estaba marcado EN_PRESTAMO pero no hay registro activo, restauramos su estado
                    $stmtRestore = $db->prepare("UPDATE equipos SET estado = 'OPERATIVO' WHERE id = :id");
                    $stmtRestore->execute([':id' => $equipoId]);
                    $db->commit();
                    return true;
                }
                $targetEquipoId = (int)$prestamo['equipo_id'];
                $targetPrestamoId = (int)$prestamo['id'];
            }

            // Marcar préstamo como DEVUELTO
            $stmtClose = $db->prepare("UPDATE prestamos SET estado_prestamo = 'DEVUELTO', fecha_devolucion_real = NOW() WHERE id = :id");
            $stmtClose->execute([':id' => $targetPrestamoId]);

            // Restaurar equipo a OPERATIVO
            $stmtRestore = $db->prepare("UPDATE equipos SET estado = 'OPERATIVO' WHERE id = :id");
            $stmtRestore->execute([':id' => $targetEquipoId]);

            $db->commit();
            return true;
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Da de baja patrimonial a un equipo y libera su puesto físico si lo tenía ocupado.
     */
    public static function darDeBaja(int $id, string $motivo = ''): bool {
        $db = Database::getConnection();

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("SELECT id, estado, puesto_id, notas FROM equipos WHERE id = :id LIMIT 1 FOR UPDATE");
            $stmt->execute([':id' => $id]);
            $equipo = $stmt->fetch();
            if (!$equipo) {
                throw new RuntimeException("El equipo #{$id} no existe.", 404);
            }

            $notaBaja = trim("BAJA PATRIMONIAL: " . $motivo . " [" . date('Y-m-d H:i') . "]");
            $nuevasNotas = !empty($equipo['notas']) ? ($equipo['notas'] . "\n" . $notaBaja) : $notaBaja;

            // 1. Actualizar estado del equipo a DE_BAJA y liberar puesto
            $update = $db->prepare("UPDATE equipos SET estado = 'DE_BAJA', puesto_id = NULL, notas = :notas WHERE id = :id");
            $update->execute([':notas' => $nuevasNotas, ':id' => $id]);

            // 2. Si tiene préstamos activos, marcarlos automáticamente como DEVUELTO con fecha_devolucion_real = NOW()
            $stmtPrestamos = $db->prepare("
                UPDATE prestamos 
                SET estado_prestamo = 'DEVUELTO', 
                    fecha_devolucion_real = NOW(),
                    observaciones = CONCAT(COALESCE(observaciones, ''), '\n[Devolución automática por baja patrimonial]')
                WHERE equipo_id = :equipo_id AND estado_prestamo = 'ACTIVO'
            ");
            $stmtPrestamos->execute([':equipo_id' => $id]);

            $db->commit();
            return true;
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

}
