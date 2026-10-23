<?php
require_once __DIR__ . '/../config/database.php';

class Mantenimiento {
    /**
     * Obtiene el listado de incidencias y mantenimientos con soporte de filtros
     */
    public static function getAll(array $filters = []): array {
        $db = Database::getConnection();

        $sql = "
            SELECT 
                m.id,
                m.equipo_id,
                m.fecha_reporte,
                m.fecha_resolucion,
                m.tipo,
                m.prioridad,
                m.titulo,
                m.descripcion_falla,
                m.diagnostico_tecnico,
                m.acciones_realizadas,
                m.tecnico_responsable,
                m.estado_resultado,
                e.codigo_patrimonial,
                e.marca,
                e.modelo,
                e.estado AS equipo_estado,
                s.nombre AS sala_nombre,
                p.codigo_puesto AS puesto_codigo
            FROM mantenimientos m
            JOIN equipos e ON m.equipo_id = e.id
            LEFT JOIN salas s ON e.sala_id = s.id
            LEFT JOIN puestos p ON e.puesto_id = p.id
            WHERE 1=1
        ";

        $params = [];

        if (!empty($filters['estado_resultado'])) {
            $sql .= " AND m.estado_resultado = :estado_resultado";
            $params[':estado_resultado'] = trim($filters['estado_resultado']);
        }

        if (!empty($filters['prioridad'])) {
            $sql .= " AND m.prioridad = :prioridad";
            $params[':prioridad'] = trim($filters['prioridad']);
        }

        if (!empty($filters['equipo_id'])) {
            $sql .= " AND m.equipo_id = :equipo_id";
            $params[':equipo_id'] = (int)$filters['equipo_id'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (
                m.titulo LIKE :search_tit OR
                m.descripcion_falla LIKE :search_desc OR
                m.tecnico_responsable LIKE :search_tec OR
                e.codigo_patrimonial LIKE :search_cod OR
                e.modelo LIKE :search_mod
            )";
            $searchTerm = '%' . trim($filters['search']) . '%';
            $params[':search_tit'] = $searchTerm;
            $params[':search_desc'] = $searchTerm;
            $params[':search_tec'] = $searchTerm;
            $params[':search_cod'] = $searchTerm;
            $params[':search_mod'] = $searchTerm;
        }

        $sql .= " ORDER BY m.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    /**
     * Registra un nuevo mantenimiento con transacción PDO y transición de estado del equipo
     */
    public static function registrar(array $data): int {
        $db = Database::getConnection();

        // 1. Validaciones
        $required = ['equipo_id', 'tipo', 'prioridad', 'titulo', 'descripcion_falla', 'tecnico_responsable'];
        foreach ($required as $field) {
            if (empty($data[$field]) || trim((string)$data[$field]) === '') {
                throw new InvalidArgumentException("El campo '{$field}' es obligatorio.", 400);
            }
        }

        $equipo_id = (int)$data['equipo_id'];
        $tipo = trim($data['tipo']);

        // 2. Determinar transición de estado del equipo
        // Tipos preventivos pasan a EN_MANTENIMIENTO; correctivos a CON_FALLA
        $nuevoEstadoEquipo = in_array($tipo, ['PREVENTIVO', 'LIMPIEZA'], true) ? 'EN_MANTENIMIENTO' : 'CON_FALLA';

        $db->beginTransaction();

        try {
            // Verificar existencia del equipo
            $stmtChk = $db->prepare("SELECT id FROM equipos WHERE id = :id LIMIT 1");
            $stmtChk->execute([':id' => $equipo_id]);
            if (!$stmtChk->fetch()) {
                throw new RuntimeException("El equipo especificado no existe.", 404);
            }

            // Insertar orden de mantenimiento
            $sqlIns = "
                INSERT INTO mantenimientos (
                    equipo_id,
                    tipo,
                    prioridad,
                    titulo,
                    descripcion_falla,
                    tecnico_responsable,
                    estado_resultado
                ) VALUES (
                    :equipo_id,
                    :tipo,
                    :prioridad,
                    :titulo,
                    :descripcion_falla,
                    :tecnico_responsable,
                    'PENDIENTE'
                )
            ";

            $stmtIns = $db->prepare($sqlIns);
            $stmtIns->execute([
                ':equipo_id'           => $equipo_id,
                ':tipo'                => $tipo,
                ':prioridad'           => trim($data['prioridad']),
                ':titulo'              => trim($data['titulo']),
                ':descripcion_falla'   => trim($data['descripcion_falla']),
                ':tecnico_responsable' => trim($data['tecnico_responsable'])
            ]);

            $mantenimientoId = (int)$db->lastInsertId();

            // Actualizar estado del equipo
            $sqlUpd = "UPDATE equipos SET estado = :nuevo_estado WHERE id = :equipo_id";
            $stmtUpd = $db->prepare($sqlUpd);
            $stmtUpd->execute([
                ':nuevo_estado' => $nuevoEstadoEquipo,
                ':equipo_id'    => $equipo_id
            ]);

            $db->commit();
            return $mantenimientoId;

        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Resuelve una orden de mantenimiento con transacción PDO y actualiza el estado del equipo
     */
    public static function resolver(int $id, array $data): bool {
        $db = Database::getConnection();

        $required = ['diagnostico_tecnico', 'acciones_realizadas'];
        foreach ($required as $field) {
            if (empty($data[$field]) || trim((string)$data[$field]) === '') {
                throw new InvalidArgumentException("El campo '{$field}' es obligatorio.", 400);
            }
        }

        $estadoEquipo = !empty($data['estado_equipo']) ? trim($data['estado_equipo']) : 'OPERATIVO';
        $estadoResultado = ($estadoEquipo === 'DE_BAJA') ? 'DERIVADO_A_BAJA' : 'RESUELTO';

        $db->beginTransaction();

        try {
            // Obtener el mantenimiento y el id del equipo asociado
            $stmtM = $db->prepare("SELECT equipo_id FROM mantenimientos WHERE id = :id LIMIT 1");
            $stmtM->execute([':id' => $id]);
            $mant = $stmtM->fetch();

            if (!$mant) {
                throw new RuntimeException("La orden de mantenimiento #{$id} no existe.", 404);
            }

            $equipo_id = (int)$mant['equipo_id'];

            // Actualizar registro de mantenimiento
            $sqlUpdM = "
                UPDATE mantenimientos SET
                    diagnostico_tecnico = :diag,
                    acciones_realizadas = :acc,
                    estado_resultado = :estado_resultado,
                    fecha_resolucion = NOW()
                WHERE id = :id
            ";

            $stmtUpdM = $db->prepare($sqlUpdM);
            $stmtUpdM->execute([
                ':diag'             => trim($data['diagnostico_tecnico']),
                ':acc'              => trim($data['acciones_realizadas']),
                ':estado_resultado' => $estadoResultado,
                ':id'               => $id
            ]);

            // Actualizar estado del equipo asociado
            $sqlUpdE = "UPDATE equipos SET estado = :estado_equipo WHERE id = :equipo_id";
            $stmtUpdE = $db->prepare($sqlUpdE);
            $stmtUpdE->execute([
                ':estado_equipo' => $estadoEquipo,
                ':equipo_id'     => $equipo_id
            ]);

            $db->commit();
            return true;

        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Métricas estadísticas para el dashboard superior de mantenimientos
     */
    public static function getEstadisticas(): array {
        $db = Database::getConnection();
        $stmt = $db->query("
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN estado_resultado = 'PENDIENTE' THEN 1 ELSE 0 END) AS pendientes,
                SUM(CASE WHEN estado_resultado = 'EN_CURSO' THEN 1 ELSE 0 END) AS en_curso,
                SUM(CASE WHEN estado_resultado = 'RESUELTO' THEN 1 ELSE 0 END) AS resueltos,
                SUM(CASE WHEN estado_resultado = 'DERIVADO_A_BAJA' THEN 1 ELSE 0 END) AS derivados_baja
            FROM mantenimientos
        ");
        $row = $stmt->fetch();
        return [
            'total'          => (int)($row['total'] ?? 0),
            'pendientes'     => (int)($row['pendientes'] ?? 0),
            'en_curso'       => (int)($row['en_curso'] ?? 0),
            'resueltos'      => (int)($row['resueltos'] ?? 0),
            'derivados_baja' => (int)($row['derivados_baja'] ?? 0),
        ];
    }
}
