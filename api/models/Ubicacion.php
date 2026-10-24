<?php
require_once __DIR__ . '/../config/database.php';

class Ubicacion {
    /**
     * Obtiene el listado completo de salas
     */
    public static function getSalas(): array {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT id, nombre, descripcion, capacidad_puestos FROM salas ORDER BY nombre ASC");
        return $stmt->fetchAll();
    }

    /**
     * Obtiene los puestos de una sala que NO estén ocupados,
     * permitiendo opcionalmente incluir el puesto actual del equipo en edición
     */
    public static function getPuestosDisponibles(int $sala_id, ?int $incluir_puesto_id = null): array {
        $db = Database::getConnection();
        
        $sql = "
            SELECT p.id, p.sala_id, p.codigo_puesto, p.fila, p.columna
            FROM puestos p
            WHERE p.sala_id = :sala_id
              AND (
                  p.id NOT IN (
                      SELECT puesto_id 
                      FROM equipos 
                      WHERE puesto_id IS NOT NULL
                  )
        ";

        $params = [':sala_id' => $sala_id];

        if ($incluir_puesto_id && $incluir_puesto_id > 0) {
            $sql .= " OR p.id = :incluir_id ";
            $params[':incluir_id'] = $incluir_puesto_id;
        }

        $sql .= " ) ORDER BY p.codigo_puesto ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Obtiene el mapa completo de todas las salas, sus puestos físicos
     * y los equipos asignados a cada puesto o a la sala en general.
     */
    public static function getMapaCompleto(): array {
        $db = Database::getConnection();

        // 1. Obtener todas las salas ordenadas
        $stmtSalas = $db->query("SELECT id, nombre, descripcion, capacidad_puestos FROM salas ORDER BY id ASC");
        $salas = $stmtSalas->fetchAll();

        // 2. Obtener todos los puestos con sus equipos asignados (si los hay)
        $sqlPuestos = "
            SELECT 
                p.id AS puesto_id,
                p.sala_id,
                p.codigo_puesto,
                p.fila,
                p.columna,
                e.id AS equipo_id,
                e.codigo_patrimonial,
                e.numero_serie,
                e.marca,
                e.modelo,
                e.categoria,
                e.estado AS equipo_estado,
                e.ip_asignada,
                e.cpu,
                e.ram_gb,
                e.almacenamiento
            FROM puestos p
            LEFT JOIN equipos e ON e.puesto_id = p.id
            ORDER BY p.sala_id ASC, p.codigo_puesto ASC
        ";
        $puestosRows = $db->query($sqlPuestos)->fetchAll();

        // Agrupar puestos por sala_id
        $puestosPorSala = [];
        foreach ($puestosRows as $row) {
            $sId = (int)$row['sala_id'];
            if (!isset($puestosPorSala[$sId])) {
                $puestosPorSala[$sId] = [];
            }

            $ocupado = !empty($row['equipo_id']);
            $puestosPorSala[$sId][] = [
                'id'            => (int)$row['puesto_id'],
                'codigo_puesto' => $row['codigo_puesto'],
                'fila'          => $row['fila'] ? (int)$row['fila'] : null,
                'columna'       => $row['columna'] ? (int)$row['columna'] : null,
                'ocupado'       => $ocupado,
                'estado'        => $ocupado ? $row['equipo_estado'] : 'LIBRE',
                'equipo'        => $ocupado ? [
                    'id'                 => (int)$row['equipo_id'],
                    'codigo_patrimonial' => $row['codigo_patrimonial'],
                    'numero_serie'       => $row['numero_serie'],
                    'marca'              => $row['marca'],
                    'modelo'             => $row['modelo'],
                    'categoria'          => $row['categoria'],
                    'estado'             => $row['equipo_estado'],
                    'ip_asignada'        => $row['ip_asignada'],
                    'cpu'                => $row['cpu'],
                    'ram_gb'             => $row['ram_gb'],
                    'almacenamiento'     => $row['almacenamiento']
                ] : null
            ];
        }

        // 3. Obtener equipos en cada sala sin puesto asignado (ej. Depósito o equipos generales)
        $sqlEquiposSinPuesto = "
            SELECT 
                e.id,
                e.sala_id,
                e.codigo_patrimonial,
                e.numero_serie,
                e.marca,
                e.modelo,
                e.categoria,
                e.estado,
                e.ip_asignada,
                e.cpu,
                e.ram_gb,
                e.almacenamiento
            FROM equipos e
            WHERE e.puesto_id IS NULL AND e.sala_id IS NOT NULL
            ORDER BY e.sala_id ASC, e.id DESC
        ";
        $equiposSinPuestoRows = $db->query($sqlEquiposSinPuesto)->fetchAll();
        $sinPuestoPorSala = [];
        foreach ($equiposSinPuestoRows as $row) {
            $sId = (int)$row['sala_id'];
            if (!isset($sinPuestoPorSala[$sId])) {
                $sinPuestoPorSala[$sId] = [];
            }
            $sinPuestoPorSala[$sId][] = [
                'id'                 => (int)$row['id'],
                'codigo_patrimonial' => $row['codigo_patrimonial'],
                'numero_serie'       => $row['numero_serie'],
                'marca'              => $row['marca'],
                'modelo'             => $row['modelo'],
                'categoria'          => $row['categoria'],
                'estado'             => $row['estado'],
                'ip_asignada'        => $row['ip_asignada'],
                'cpu'                => $row['cpu'],
                'ram_gb'             => $row['ram_gb'],
                'almacenamiento'     => $row['almacenamiento']
            ];
        }

        // 4. Armar estructura jerárquica con métricas de ocupación real
        $mapa = [];
        foreach ($salas as $sala) {
            $sId = (int)$sala['id'];
            $puestos = $puestosPorSala[$sId] ?? [];
            $equiposSinPuesto = $sinPuestoPorSala[$sId] ?? [];

            $capacidad = (int)$sala['capacidad_puestos'];
            $puestosTotales = count($puestos);
            $puestosOcupados = 0;
            foreach ($puestos as $p) {
                if ($p['ocupado']) $puestosOcupados++;
            }
            $puestosLibres = $puestosTotales - $puestosOcupados;

            $divisor = $puestosTotales > 0 ? $puestosTotales : ($capacidad > 0 ? $capacidad : 0);
            $pct = $divisor > 0 ? round(($puestosOcupados / $divisor) * 100) : 0;

            $esDeposito = ($capacidad === 0 || stripos($sala['nombre'], 'depósito') !== false || stripos($sala['nombre'], 'deposito') !== false);

            $mapa[] = [
                'id'                   => $sId,
                'nombre'               => $sala['nombre'],
                'descripcion'          => $sala['descripcion'],
                'capacidad_puestos'    => $capacidad,
                'puestos_totales'      => $puestosTotales,
                'puestos_ocupados'     => $puestosOcupados,
                'puestos_libres'       => $puestosLibres,
                'porcentaje_ocupacion' => $pct,
                'es_deposito'          => $esDeposito,
                'puestos'              => $puestos,
                'equipos_sin_puesto'   => $equiposSinPuesto
            ];
        }

        return $mapa;
    }

    /**
     * Reubica un equipo a una nueva sala y puesto físico (o sin puesto fijo).
     */
    public static function reubicarEquipo(int $equipo_id, int $nueva_sala_id, ?int $nuevo_puesto_id = null): bool {
        $db = Database::getConnection();

        if ($equipo_id <= 0) {
            throw new InvalidArgumentException("ID de equipo inválido.", 400);
        }
        if ($nueva_sala_id <= 0) {
            throw new InvalidArgumentException("ID de sala destino inválido.", 400);
        }

        $db->beginTransaction();
        try {
            // 1. Validar que la sala destino exista
            $stmtSala = $db->prepare("SELECT id, nombre FROM salas WHERE id = :sala_id LIMIT 1");
            $stmtSala->execute([':sala_id' => $nueva_sala_id]);
            $sala = $stmtSala->fetch();
            if (!$sala) {
                throw new RuntimeException("La sala destino #{$nueva_sala_id} no existe.", 404);
            }

            // 2. Validar que el equipo exista
            $stmtEquipo = $db->prepare("SELECT id, codigo_patrimonial, sala_id, puesto_id FROM equipos WHERE id = :id FOR UPDATE");
            $stmtEquipo->execute([':id' => $equipo_id]);
            $equipo = $stmtEquipo->fetch();
            if (!$equipo) {
                throw new RuntimeException("El equipo #{$equipo_id} no existe.", 404);
            }

            // 3. Validar puesto destino si se especifica
            if ($nuevo_puesto_id !== null && $nuevo_puesto_id > 0) {
                // Verificar que el puesto pertenezca a la sala destino
                $stmtPuesto = $db->prepare("SELECT id, sala_id, codigo_puesto FROM puestos WHERE id = :puesto_id LIMIT 1");
                $stmtPuesto->execute([':puesto_id' => $nuevo_puesto_id]);
                $puesto = $stmtPuesto->fetch();
                if (!$puesto) {
                    throw new RuntimeException("El puesto destino #{$nuevo_puesto_id} no existe.", 404);
                }
                if ((int)$puesto['sala_id'] !== $nueva_sala_id) {
                    throw new InvalidArgumentException("El puesto {$puesto['codigo_puesto']} no pertenece a la sala seleccionada.", 400);
                }

                // Verificar si ya está ocupado por otra máquina
                $stmtOcupado = $db->prepare("SELECT id, codigo_patrimonial FROM equipos WHERE puesto_id = :puesto_id AND id != :id LIMIT 1");
                $stmtOcupado->execute([':puesto_id' => $nuevo_puesto_id, ':id' => $equipo_id]);
                $ocupante = $stmtOcupado->fetch();
                if ($ocupante) {
                    throw new RuntimeException("El puesto {$puesto['codigo_puesto']} ya está ocupado por el equipo {$ocupante['codigo_patrimonial']}.", 409);
                }
            } else {
                $nuevo_puesto_id = null;
            }

            // 4. Actualizar ubicación en equipos (libera automáticamente el puesto anterior)
            $stmtUpdate = $db->prepare("
                UPDATE equipos 
                SET sala_id = :sala_id, puesto_id = :puesto_id 
                WHERE id = :id
            ");
            $stmtUpdate->execute([
                ':sala_id'   => $nueva_sala_id,
                ':puesto_id' => $nuevo_puesto_id,
                ':id'        => $equipo_id
            ]);

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
     * Obtiene metricas y estadisticas globales de salas y puestos
     */
    public static function getStats(): array {
        $db = Database::getConnection();

        $stmtSalas = $db->query('SELECT COUNT(*) FROM salas');
        $totalSalas = (int)$stmtSalas->fetchColumn();

        $stmtPuestos = $db->query('SELECT COUNT(*) FROM puestos');
        $totalPuestos = (int)$stmtPuestos->fetchColumn();

        $stmtOcupados = $db->query('SELECT COUNT(*) FROM equipos WHERE puesto_id IS NOT NULL');
        $puestosOcupados = (int)$stmtOcupados->fetchColumn();

        $puestosLibres = max(0, $totalPuestos - $puestosOcupados);
        $tasaOcupacion = $totalPuestos > 0 ? round(($puestosOcupados / $totalPuestos) * 100, 1) : 0;

        return [
            'total_salas' => $totalSalas,
            'total_puestos' => $totalPuestos,
            'puestos_ocupados' => $puestosOcupados,
            'puestos_libres' => $puestosLibres,
            'tasa_ocupacion' => $tasaOcupacion
        ];
    }
}
