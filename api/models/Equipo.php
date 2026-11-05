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

    /**
     * Obtiene el ID de la sala de Almacén / Depósito Central con fallback seguro de esquema
     */
    public static function getDepositoSalaId(PDO $db): ?int {
        try {
            $stmt = $db->query("
                SELECT id FROM salas 
                WHERE tipo = 'ALMACEN' 
                   OR LOWER(nombre) LIKE '%depósito%' 
                   OR LOWER(nombre) LIKE '%deposito%' 
                ORDER BY (tipo = 'ALMACEN') DESC, id ASC 
                LIMIT 1
            ");
            $id = $stmt->fetchColumn();
            return $id ? (int)$id : null;
        } catch (Throwable $e) {
            try {
                $stmtFallback = $db->query("
                    SELECT id FROM salas 
                    WHERE LOWER(nombre) LIKE '%depósito%' 
                       OR LOWER(nombre) LIKE '%deposito%' 
                       OR capacidad_puestos = 0
                    ORDER BY id ASC 
                    LIMIT 1
                ");
                $id = $stmtFallback->fetchColumn();
                return $id ? (int)$id : null;
            } catch (Throwable $inner) {
                return null;
            }
        }
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
        $estado = strtoupper(trim($data['estado']));
        if (in_array($estado, ['PRESTAMO', 'EN_PRESTAMO'], true)) {
            $estado = 'OPERATIVO';
        }
        if (!in_array($estado, ['OPERATIVO', 'DE_BAJA'], true)) {
            throw new InvalidArgumentException("El estado '{$estado}' no es válido. Estados permitidos: OPERATIVO, DE_BAJA.", 400);
        }

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

        $sala_id = (int)$data['sala_id'];
        $puesto_id = null;

        if ($estado === 'DE_BAJA') {
            $puesto_id = null;
        } elseif (!empty($data['puesto_id']) && (int)$data['puesto_id'] > 0) {
            $puesto_id = (int)$data['puesto_id'];

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
        } else {
            // Equipo OPERATIVO sin puesto asignado -> vincular a la sala de Depósito/Almacén
            $depositoId = self::getDepositoSalaId($db);
            if ($depositoId !== null) {
                $sala_id = $depositoId;
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
            ':estado'             => $estado,
            ':sala_id'            => $sala_id,
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
        $estado = strtoupper(trim($data['estado']));
        if (in_array($estado, ['PRESTAMO', 'EN_PRESTAMO'], true)) {
            $estado = 'OPERATIVO';
        }
        if (!in_array($estado, ['OPERATIVO', 'DE_BAJA'], true)) {
            throw new InvalidArgumentException("El estado '{$estado}' no es válido. Estados permitidos: OPERATIVO, DE_BAJA.", 400);
        }

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

        // 3. Validar puesto y sincronizar sala de depósito si corresponde
        $sala_id = (int)$data['sala_id'];
        $puesto_id = null;

        if ($estado === 'DE_BAJA') {
            $puesto_id = null;
        } elseif (!empty($data['puesto_id']) && (int)$data['puesto_id'] > 0) {
            $puesto_id = (int)$data['puesto_id'];

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
        } else {
            // Equipo OPERATIVO sin puesto asignado -> vincular a la sala de Depósito/Almacén
            $depositoId = self::getDepositoSalaId($db);
            if ($depositoId !== null) {
                $sala_id = $depositoId;
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
            ':estado'             => $estado,
            ':sala_id'            => $sala_id,
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

        $depositoSalaId = self::getDepositoSalaId($db);

        // 1. Conteo general y por estados patrimoniales ('OPERATIVO', 'DE_BAJA')
        // Garantiza la identidad: puestos_ocupados + equipos_deposito + de_baja = total_equipos
        try {
            $sqlCounts = "
                SELECT 
                    COUNT(*) AS total_equipos,
                    SUM(CASE WHEN e.estado = 'OPERATIVO' THEN 1 ELSE 0 END) AS operativos,
                    SUM(CASE WHEN e.estado = 'DE_BAJA' THEN 1 ELSE 0 END) AS de_baja,
                    SUM(CASE 
                        WHEN e.estado = 'OPERATIVO' 
                         AND e.puesto_id IS NOT NULL 
                         AND COALESCE(s.tipo, 'LABORATORIO') != 'ALMACEN' 
                        THEN 1 ELSE 0 
                    END) AS puestos_ocupados,
                    SUM(CASE 
                        WHEN e.estado = 'OPERATIVO' 
                         AND (COALESCE(s.tipo, 'LABORATORIO') = 'ALMACEN' OR e.puesto_id IS NULL) 
                        THEN 1 ELSE 0 
                    END) AS equipos_deposito
                FROM equipos e
                LEFT JOIN salas s ON e.sala_id = s.id
            ";
            $stmtCounts = $db->query($sqlCounts);
            $counts = $stmtCounts->fetch();
        } catch (Throwable $e) {
            $sqlCountsFallback = "
                SELECT 
                    COUNT(*) AS total_equipos,
                    SUM(CASE WHEN e.estado = 'OPERATIVO' THEN 1 ELSE 0 END) AS operativos,
                    SUM(CASE WHEN e.estado = 'DE_BAJA' THEN 1 ELSE 0 END) AS de_baja,
                    SUM(CASE WHEN e.estado = 'OPERATIVO' AND e.puesto_id IS NOT NULL THEN 1 ELSE 0 END) AS puestos_ocupados,
                    SUM(CASE WHEN e.estado = 'OPERATIVO' AND e.puesto_id IS NULL THEN 1 ELSE 0 END) AS equipos_deposito
                FROM equipos e
            ";
            $counts = $db->query($sqlCountsFallback)->fetch();
        }

        $total = (int)($counts['total_equipos'] ?? 0);
        $operativos = (int)($counts['operativos'] ?? 0);
        $deBaja = (int)($counts['de_baja'] ?? 0);
        $puestosOcupados = (int)($counts['puestos_ocupados'] ?? 0);
        $equiposDeposito = (int)($counts['equipos_deposito'] ?? 0);

        // Disponibilidad en Depósito / Reserva = (Equipos Operativos en Depósito / Total Equipos Operativos) * 100
        $tasaDisponibilidad = $operativos > 0 ? round(($equiposDeposito / $operativos) * 100, 1) : 0;

        // 2. Capacidad total de puestos en salas de laboratorio (excluyendo almacén)
        try {
            $stmtCapacidad = $db->query("
                SELECT COALESCE(SUM(capacidad_puestos), 0) 
                FROM salas 
                WHERE COALESCE(tipo, 'LABORATORIO') != 'ALMACEN'
            ");
            $totalCapacidadPuestos = (int)$stmtCapacidad->fetchColumn();
        } catch (Throwable $e) {
            $stmtCapacidad = $db->query("SELECT COALESCE(SUM(capacidad_puestos), 0) FROM salas");
            $totalCapacidadPuestos = (int)$stmtCapacidad->fetchColumn();
        }

        // 3. Ocupación física real por sala (unificando la sala de depósito/almacén con el KPI superior)
        try {
            $sqlSalas = "
                SELECT 
                    s.id AS sala_id,
                    s.nombre AS sala_nombre,
                    COALESCE(s.tipo, 'LABORATORIO') AS tipo,
                    s.capacidad_puestos,
                    (SELECT COUNT(*) FROM puestos p WHERE p.sala_id = s.id) AS puestos_reales,
                    COUNT(e.id) AS total_equipos,
                    SUM(CASE WHEN e.estado = 'OPERATIVO' AND e.puesto_id IS NOT NULL THEN 1 ELSE 0 END) AS puestos_ocupados,
                    SUM(CASE WHEN e.estado = 'OPERATIVO' THEN 1 ELSE 0 END) AS operativos
                FROM salas s
                LEFT JOIN equipos e ON s.id = e.sala_id
                GROUP BY s.id, s.nombre, s.tipo, s.capacidad_puestos
                ORDER BY (COALESCE(s.tipo, 'LABORATORIO') = 'ALMACEN') ASC, s.nombre ASC
            ";
            $stmtSalas = $db->query($sqlSalas);
            $rawSalas = $stmtSalas->fetchAll();
        } catch (Throwable $e) {
            $sqlSalasFallback = "
                SELECT 
                    s.id AS sala_id,
                    s.nombre AS sala_nombre,
                    'LABORATORIO' AS tipo,
                    s.capacidad_puestos,
                    (SELECT COUNT(*) FROM puestos p WHERE p.sala_id = s.id) AS puestos_reales,
                    COUNT(e.id) AS total_equipos,
                    SUM(CASE WHEN e.estado = 'OPERATIVO' AND e.puesto_id IS NOT NULL THEN 1 ELSE 0 END) AS puestos_ocupados,
                    SUM(CASE WHEN e.estado = 'OPERATIVO' THEN 1 ELSE 0 END) AS operativos
                FROM salas s
                LEFT JOIN equipos e ON s.id = e.sala_id
                GROUP BY s.id, s.nombre, s.capacidad_puestos
                ORDER BY s.nombre ASC
            ";
            $rawSalas = $db->query($sqlSalasFallback)->fetchAll();
        }

        $equiposPorSala = array_map(function($s) use ($equiposDeposito, $depositoSalaId) {
            $salaId = (int)$s['sala_id'];
            $esDeposito = ($s['tipo'] === 'ALMACEN') 
                || ($depositoSalaId !== null && $salaId === $depositoSalaId)
                || stripos($s['sala_nombre'], 'depósito') !== false 
                || stripos($s['sala_nombre'], 'deposito') !== false;

            if ($esDeposito) {
                return [
                    'sala_id'              => $salaId,
                    'sala_nombre'          => $s['sala_nombre'],
                    'tipo'                 => 'ALMACEN',
                    'es_deposito'          => true,
                    'capacidad_puestos'    => 0,
                    'total_equipos'        => $equiposDeposito,
                    'puestos_ocupados'     => 0,
                    'puestos_libres'       => 0,
                    'porcentaje_ocupacion' => 0,
                    'operativos'           => $equiposDeposito
                ];
            }

            $capacidad = (int)$s['capacidad_puestos'] > 0 ? (int)$s['capacidad_puestos'] : (int)$s['puestos_reales'];
            $ocupados = (int)$s['puestos_ocupados'];
            $libres = max(0, $capacidad - $ocupados);
            $porcentajeOcupacion = $capacidad > 0 ? round(($ocupados / $capacidad) * 100) : 0;

            return [
                'sala_id'              => $salaId,
                'sala_nombre'          => $s['sala_nombre'],
                'tipo'                 => 'LABORATORIO',
                'es_deposito'          => false,
                'capacidad_puestos'    => $capacidad,
                'total_equipos'        => $ocupados,
                'puestos_ocupados'     => $ocupados,
                'puestos_libres'       => $libres,
                'porcentaje_ocupacion' => $porcentajeOcupacion,
                'operativos'           => $ocupados
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

        // 5. Actividad Patrimonial Reciente (Altas, Bajas y Reubicaciones Físicas)
        $sqlMovimientos = "
            (
                SELECT 
                    'ALTA_EQUIPO' AS tipo_evento,
                    e.created_at AS fecha,
                    e.codigo_patrimonial,
                    CONCAT(e.marca, ' ', e.modelo) AS modelo,
                    CONCAT('Alta de activo patrimonial (', REPLACE(e.categoria, '_', ' '), ') en ', COALESCE(s.nombre, 'Laboratorio')) AS descripcion,
                    'BAJA' AS prioridad,
                    e.estado AS estado
                FROM equipos e
                LEFT JOIN salas s ON e.sala_id = s.id
            )
            UNION ALL
            (
                SELECT 
                    'REUBICACION' AS tipo_evento,
                    e.created_at AS fecha,
                    e.codigo_patrimonial,
                    CONCAT(e.marca, ' ', e.modelo) AS modelo,
                    CONCAT('Ubicado físicamente en puesto ', p.codigo_puesto, ' (', COALESCE(s.nombre, 'Sala'), ')') AS descripcion,
                    'BAJA' AS prioridad,
                    e.estado AS estado
                FROM equipos e
                JOIN puestos p ON e.puesto_id = p.id
                LEFT JOIN salas s ON e.sala_id = s.id
            )
            UNION ALL
            (
                SELECT 
                    'BAJA_EQUIPO' AS tipo_evento,
                    e.created_at AS fecha,
                    e.codigo_patrimonial,
                    CONCAT(e.marca, ' ', e.modelo) AS modelo,
                    CONCAT('Baja patrimonial registrada en ', COALESCE(s.nombre, 'Laboratorio')) AS descripcion,
                    'ALTA' AS prioridad,
                    'DE_BAJA' AS estado
                FROM equipos e
                LEFT JOIN salas s ON e.sala_id = s.id
                WHERE e.estado = 'DE_BAJA'
            )
            ORDER BY fecha DESC
            LIMIT 6
        ";
        $stmtMovimientos = $db->query($sqlMovimientos);
        $ultimosMovimientos = $stmtMovimientos->fetchAll();

        return [
            'total_equipos'           => $total,
            'operativos'              => $operativos,
            'de_baja'                 => $deBaja,
            'disponibles_reserva'     => $equiposDeposito,
            'tasa_disponibilidad'     => $tasaDisponibilidad,
            'tasa_operatividad'       => $tasaDisponibilidad,
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

        // 2. Construcción de Línea de Tiempo Patrimonial Unificada
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
            'descripcion' => "Incorporación formal del activo al inventario. Ubicación: {$ubicacionTexto}.",
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

        // Hito: Baja Patrimonial (si el equipo está DE_BAJA)
        if ($equipo['estado'] === 'DE_BAJA') {
            $timeline[] = [
                'tipo'        => 'BAJA',
                'categoria'   => 'DESINCORPORACION',
                'titulo'      => 'Baja Patrimonial del Activo',
                'fecha'       => $fechaAlta,
                'ubicacion'   => $equipo['sala_nombre'] ?? 'Depósito',
                'descripcion' => !empty($equipo['notas']) ? $equipo['notas'] : 'Activo desincorporado del inventario operativo.',
                'estado'      => 'DE_BAJA',
                'badge_tipo'  => 'destructive',
                'icono'       => 'fa-ban'
            ];
        }

        // Ordenar la línea de tiempo de forma cronológica descendente
        usort($timeline, function($a, $b) {
            return strtotime($b['fecha']) <=> strtotime($a['fecha']);
        });

        return [
            'equipo'                   => $equipo,
            'historial_mantenimientos' => [],
            'timeline'                 => $timeline
        ];
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

            // Actualizar estado del equipo a DE_BAJA y liberar puesto
            $update = $db->prepare("UPDATE equipos SET estado = 'DE_BAJA', puesto_id = NULL, notas = :notas WHERE id = :id");
            $update->execute([':notas' => $nuevasNotas, ':id' => $id]);

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
