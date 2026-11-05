<?php
require_once __DIR__ . '/../config/database.php';

class Ubicacion {
    /**
     * Obtiene el listado completo de salas con fallback seguro si faltan columnas opcionales
     */
    public static function getSalas(): array {
        $db = Database::getConnection();
        try {
            $stmt = $db->query("
                SELECT id, nombre, edificio, piso, descripcion, COALESCE(tipo, 'LABORATORIO') AS tipo, capacidad_puestos 
                FROM salas 
                ORDER BY (COALESCE(tipo, 'LABORATORIO') = 'ALMACEN') ASC, nombre ASC
            ");
            return $stmt->fetchAll();
        } catch (Throwable $e) {
            $stmtFallback = $db->query("
                SELECT id, nombre, NULL AS edificio, NULL AS piso, descripcion, 'LABORATORIO' AS tipo, capacidad_puestos 
                FROM salas 
                ORDER BY nombre ASC
            ");
            return $stmtFallback->fetchAll();
        }
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

        // 1. Obtener todas las salas ordenadas (Laboratorios primero, Almacén al final) con fallback seguro
        try {
            $stmtSalas = $db->query("
                SELECT id, nombre, edificio, piso, descripcion, COALESCE(tipo, 'LABORATORIO') AS tipo, capacidad_puestos 
                FROM salas 
                ORDER BY (COALESCE(tipo, 'LABORATORIO') = 'ALMACEN') ASC, id ASC
            ");
            $salas = $stmtSalas->fetchAll();
        } catch (Throwable $e) {
            $stmtSalas = $db->query("
                SELECT id, nombre, NULL AS edificio, NULL AS piso, descripcion, 'LABORATORIO' AS tipo, capacidad_puestos 
                FROM salas 
                ORDER BY id ASC
            ");
            $salas = $stmtSalas->fetchAll();
        }

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

        // 3. Obtener equipos operativos sin puesto asignado (en Depósito / Reserva)
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
            WHERE e.puesto_id IS NULL AND e.estado = 'OPERATIVO'
            ORDER BY e.id DESC
        ";
        $equiposSinPuestoRows = $db->query($sqlEquiposSinPuesto)->fetchAll();

        // Identificar sala de depósito/almacén para agrupar de forma unificada los activos en reserva
        $depositoSalaId = null;
        foreach ($salas as $s) {
            if (($s['tipo'] ?? '') === 'ALMACEN' || stripos($s['nombre'], 'depósito') !== false || stripos($s['nombre'], 'deposito') !== false) {
                $depositoSalaId = (int)$s['id'];
                break;
            }
        }

        $sinPuestoPorSala = [];
        foreach ($equiposSinPuestoRows as $row) {
            $sId = $depositoSalaId !== null ? $depositoSalaId : (int)$row['sala_id'];
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

            $esDeposito = (($sala['tipo'] ?? '') === 'ALMACEN' || stripos($sala['nombre'], 'depósito') !== false || stripos($sala['nombre'], 'deposito') !== false);

            $mapa[] = [
                'id'                   => $sId,
                'nombre'               => $sala['nombre'],
                'edificio'             => $sala['edificio'] ?? null,
                'piso'                 => $sala['piso'] ?? null,
                'descripcion'          => $sala['descripcion'],
                'tipo'                 => $esDeposito ? 'ALMACEN' : ($sala['tipo'] ?? 'LABORATORIO'),
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
                // Si se reubica sin puesto fijo (reserva), vincular a la sala de Almacén/Depósito
                $stmtDep = $db->query("
                    SELECT id FROM salas 
                    WHERE tipo = 'ALMACEN' 
                       OR LOWER(nombre) LIKE '%depósito%' 
                       OR LOWER(nombre) LIKE '%deposito%' 
                    ORDER BY (tipo = 'ALMACEN') DESC, id ASC 
                    LIMIT 1
                ");
                $depId = $stmtDep->fetchColumn();
                if ($depId) {
                    $nueva_sala_id = (int)$depId;
                }
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

    /**
     * Crea una nueva sala / laboratorio validando que el nombre no esté duplicado
     */
    public static function crearSala(
        string $nombre,
        ?string $descripcion = null,
        int $capacidad = 0,
        ?string $edificio = null,
        ?string $piso = null,
        string $tipo = 'LABORATORIO'
    ): int {
        $db = Database::getConnection();
        $nombreLimpio = trim($nombre);
        if ($nombreLimpio === '') {
            throw new InvalidArgumentException("El nombre de la sala es obligatorio.", 400);
        }

        // Validar duplicado de nombre
        $stmtChk = $db->prepare("SELECT id FROM salas WHERE LOWER(nombre) = LOWER(:nombre) LIMIT 1");
        $stmtChk->execute([':nombre' => $nombreLimpio]);
        if ($stmtChk->fetch()) {
            throw new RuntimeException("Ya existe una sala registrada con el nombre '{$nombreLimpio}'.", 409);
        }

        $edificioLimpio = $edificio !== null && trim($edificio) !== '' ? trim($edificio) : null;
        $pisoLimpio = $piso !== null && trim($piso) !== '' ? trim($piso) : null;
        $descLimpia = $descripcion !== null && trim($descripcion) !== '' ? trim($descripcion) : null;
        if ($descLimpia === null && ($edificioLimpio !== null || $pisoLimpio !== null)) {
            $partes = array_filter([$edificioLimpio, $pisoLimpio]);
            $descLimpia = implode(', ', $partes);
        }
        $tipoValido = in_array(strtoupper(trim($tipo)), ['LABORATORIO', 'ALMACEN'], true)
            ? strtoupper(trim($tipo))
            : 'LABORATORIO';

        $stmt = $db->prepare("
            INSERT INTO salas (nombre, edificio, piso, descripcion, tipo, capacidad_puestos) 
            VALUES (:nombre, :edificio, :piso, :descripcion, :tipo, :capacidad)
        ");
        $stmt->execute([
            ':nombre'      => $nombreLimpio,
            ':edificio'    => $edificioLimpio,
            ':piso'        => $pisoLimpio,
            ':descripcion' => $descLimpia,
            ':tipo'        => $tipoValido,
            ':capacidad'   => max(0, $capacidad)
        ]);
        return (int)$db->lastInsertId();
    }

    /**
     * Renombra o modifica los datos de una sala sin afectar sus puestos físicos (Rol ADMIN)
     */
    public static function actualizarSala(
        int $id_sala,
        string $nombre,
        ?string $edificio = null,
        ?string $piso = null,
        ?string $descripcion = null,
        ?int $capacidad = null
    ): array {
        $db = Database::getConnection();

        if ($id_sala <= 0) {
            throw new InvalidArgumentException("El ID de la sala es obligatorio y debe ser válido.", 400);
        }

        $nombreLimpio = trim($nombre);
        if ($nombreLimpio === '') {
            throw new InvalidArgumentException("El nombre de la sala es obligatorio.", 400);
        }

        // 1. Verificar que la sala exista
        $stmtActual = $db->prepare("SELECT id, nombre, edificio, piso, descripcion, tipo, capacidad_puestos FROM salas WHERE id = :id LIMIT 1");
        $stmtActual->execute([':id' => $id_sala]);
        $salaActual = $stmtActual->fetch(PDO::FETCH_ASSOC);
        if (!$salaActual) {
            throw new RuntimeException("La sala especificada no existe.", 404);
        }

        // 2. Validar que el nuevo nombre no esté duplicado en otra sala
        $stmtDup = $db->prepare("SELECT id FROM salas WHERE LOWER(nombre) = LOWER(:nombre) AND id != :id LIMIT 1");
        $stmtDup->execute([
            ':nombre' => $nombreLimpio,
            ':id'     => $id_sala
        ]);
        if ($stmtDup->fetch()) {
            throw new RuntimeException("Ya existe otra sala registrada con el nombre '{$nombreLimpio}'.", 409);
        }

        $nuevoEdificio = $edificio !== null ? (trim($edificio) !== '' ? trim($edificio) : null) : $salaActual['edificio'];
        $nuevoPiso = $piso !== null ? (trim($piso) !== '' ? trim($piso) : null) : $salaActual['piso'];

        if ($descripcion !== null && trim($descripcion) !== '') {
            $nuevaDescripcion = trim($descripcion);
        } elseif ($edificio !== null || $piso !== null) {
            $partes = array_filter([$nuevoEdificio, $nuevoPiso]);
            $nuevaDescripcion = !empty($partes) ? implode(', ', $partes) : $salaActual['descripcion'];
        } else {
            $nuevaDescripcion = $salaActual['descripcion'];
        }

        $nuevaCapacidad = $capacidad !== null ? max(0, $capacidad) : (int)$salaActual['capacidad_puestos'];

        $stmtUpd = $db->prepare("
            UPDATE salas 
            SET nombre = :nombre,
                edificio = :edificio,
                piso = :piso,
                descripcion = :descripcion,
                capacidad_puestos = :capacidad
            WHERE id = :id
        ");
        $stmtUpd->execute([
            ':nombre'      => $nombreLimpio,
            ':edificio'    => $nuevoEdificio,
            ':piso'        => $nuevoPiso,
            ':descripcion' => $nuevaDescripcion,
            ':capacidad'   => $nuevaCapacidad,
            ':id'          => $id_sala
        ]);

        return [
            'id'                => $id_sala,
            'nombre'            => $nombreLimpio,
            'edificio'          => $nuevoEdificio,
            'piso'              => $nuevoPiso,
            'descripcion'       => $nuevaDescripcion,
            'tipo'              => $salaActual['tipo'],
            'capacidad_puestos' => $nuevaCapacidad
        ];
    }

    /**
     * Elimina una sala y sus puestos vacíos dentro de una transacción SQL,
     * rechazando con HTTP 409 Conflict si tiene equipos asignados.
     */
    public static function eliminarSala(int $id_sala): bool {
        $db = Database::getConnection();

        if ($id_sala <= 0) {
            throw new InvalidArgumentException("El ID de la sala es obligatorio.", 400);
        }

        // 1. Verificar que la sala exista
        $stmtSala = $db->prepare("SELECT id, nombre, COALESCE(tipo, 'LABORATORIO') AS tipo FROM salas WHERE id = :id LIMIT 1");
        $stmtSala->execute([':id' => $id_sala]);
        $sala = $stmtSala->fetch(PDO::FETCH_ASSOC);
        if (!$sala) {
            throw new RuntimeException("La sala especificada no existe.", 404);
        }

        // 2. Verificar integridad referencial: ¿tiene equipos asignados a alguno de sus puestos o a la sala?
        $stmtEquipos = $db->prepare("
            SELECT COUNT(*) 
            FROM equipos 
            WHERE sala_id = :sala_id 
               OR puesto_id IN (SELECT id FROM puestos WHERE sala_id = :sala_id_puestos)
        ");
        $stmtEquipos->execute([
            ':sala_id'         => $id_sala,
            ':sala_id_puestos' => $id_sala
        ]);
        $equiposAsignados = (int)$stmtEquipos->fetchColumn();

        if ($equiposAsignados > 0) {
            throw new RuntimeException(
                "No se puede eliminar la sala porque tiene equipos asignados. Reubique los equipos al depósito antes de eliminarla.",
                409
            );
        }

        // 3. Eliminar puestos vacíos y la sala dentro de una transacción SQL (BEGIN ... COMMIT)
        $db->beginTransaction();
        try {
            $stmtDelPuestos = $db->prepare("DELETE FROM puestos WHERE sala_id = :sala_id");
            $stmtDelPuestos->execute([':sala_id' => $id_sala]);

            $stmtDelSala = $db->prepare("DELETE FROM salas WHERE id = :id");
            $stmtDelSala->execute([':id' => $id_sala]);

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
     * Agrega el siguiente puesto físico a una sala con código autogenerado
     */
    public static function agregarPuesto(int $sala_id): array {
        $db = Database::getConnection();

        // 1. Validar que la sala exista
        $stmtSala = $db->prepare("SELECT id, nombre FROM salas WHERE id = :id");
        $stmtSala->execute([':id' => $sala_id]);
        $sala = $stmtSala->fetch(PDO::FETCH_ASSOC);
        if (!$sala) {
            throw new RuntimeException("La sala especificada no existe.", 404);
        }

        // 2. Obtener puestos existentes para determinar prefijo y correlativo
        $stmtPuestos = $db->prepare("SELECT id, codigo_puesto, fila, columna FROM puestos WHERE sala_id = :sala_id ORDER BY id ASC");
        $stmtPuestos->execute([':sala_id' => $sala_id]);
        $puestos = $stmtPuestos->fetchAll(PDO::FETCH_ASSOC);

        $prefijo = '';
        $maxNum = 0;
        $padding = 2;

        if (!empty($puestos)) {
            foreach ($puestos as $p) {
                if (preg_match('/^(.*-P)(\d+)$/i', $p['codigo_puesto'], $m)) {
                    $prefijo = $m[1];
                    $num = (int)$m[2];
                    if ($num > $maxNum) {
                        $maxNum = $num;
                        $padding = strlen($m[2]);
                    }
                } elseif (preg_match('/^(.*)(\d+)$/', $p['codigo_puesto'], $m)) {
                    if (empty($prefijo)) $prefijo = $m[1];
                    $num = (int)$m[2];
                    if ($num > $maxNum) {
                        $maxNum = $num;
                        $padding = strlen($m[2]);
                    }
                }
            }
        }

        if (empty($prefijo)) {
            if (preg_match('/(?:lab(?:oratorio)?)\s*(\d+)/i', $sala['nombre'], $m)) {
                $prefijo = "LAB{$m[1]}-P";
            } else {
                $prefijo = "LAB{$sala_id}-P";
            }
            $maxNum = count($puestos);
        }

        // 3. Generar siguiente código único garantizado
        $siguienteNum = $maxNum + 1;
        do {
            $codigoPuesto = sprintf("%s%0{$padding}d", $prefijo, $siguienteNum);
            $check = $db->prepare("SELECT COUNT(*) FROM puestos WHERE codigo_puesto = :codigo");
            $check->execute([':codigo' => $codigoPuesto]);
            $existe = (int)$check->fetchColumn() > 0;
            if ($existe) {
                $siguienteNum++;
            }
        } while ($existe);

        // 4. Calcular coordenadas de cuadrícula (5 puestos por fila)
        $count = count($puestos);
        $columna = ($count % 5) + 1;
        $fila = intdiv($count, 5) + 1;

        $stmtInsert = $db->prepare("INSERT INTO puestos (sala_id, codigo_puesto, fila, columna) VALUES (:sala_id, :codigo, :fila, :columna)");
        $stmtInsert->execute([
            ':sala_id' => $sala_id,
            ':codigo'  => $codigoPuesto,
            ':fila'    => $fila,
            ':columna' => $columna
        ]);

        $nuevoId = (int)$db->lastInsertId();

        return [
            'id'            => $nuevoId,
            'sala_id'       => $sala_id,
            'codigo_puesto' => $codigoPuesto,
            'fila'          => $fila,
            'columna'       => $columna
        ];
    }

    /**
     * Elimina un puesto físico solo si no tiene ningún activo asociado
     */
    public static function eliminarPuesto(int $puesto_id): bool {
        $db = Database::getConnection();

        // 1. Verificar existencia del puesto
        $stmtPuesto = $db->prepare("SELECT id, codigo_puesto FROM puestos WHERE id = :id");
        $stmtPuesto->execute([':id' => $puesto_id]);
        $puesto = $stmtPuesto->fetch(PDO::FETCH_ASSOC);
        if (!$puesto) {
            throw new RuntimeException("El puesto especificado no existe.", 404);
        }

        // 2. Validar que no tenga equipos asignados
        $stmtOcupado = $db->prepare("SELECT COUNT(*) FROM equipos WHERE puesto_id = :puesto_id");
        $stmtOcupado->execute([':puesto_id' => $puesto_id]);
        $totalEquipos = (int)$stmtOcupado->fetchColumn();

        if ($totalEquipos > 0) {
            throw new RuntimeException("El puesto está ocupado por un activo.", 409);
        }

        // 3. Eliminar puesto
        $stmtDel = $db->prepare("DELETE FROM puestos WHERE id = :id");
        $stmtDel->execute([':id' => $puesto_id]);

        return true;
    }
}
