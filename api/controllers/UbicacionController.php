<?php
require_once __DIR__ . '/../models/Ubicacion.php';
require_once __DIR__ . '/../config/database.php';

class UbicacionController {
    public static function salas(): void {
        try {
            $salas = Ubicacion::getSalas();
            Database::sendJson(['success' => true, 'data' => $salas], 200);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error al obtener salas: ' . $e->getMessage()], 500);
        }
    }

    public static function puestos(): void {
        try {
            if (!isset($_GET['sala_id']) || trim($_GET['sala_id']) === '') {
                Database::sendJson(['success' => false, 'message' => 'El parámetro sala_id es obligatorio.'], 400);
                return;
            }

            $sala_id = (int)$_GET['sala_id'];
            $incluir_puesto_id = !empty($_GET['incluir_puesto_id']) ? (int)$_GET['incluir_puesto_id'] : null;

            $puestos = Ubicacion::getPuestosDisponibles($sala_id, $incluir_puesto_id);

            Database::sendJson([
                'success' => true,
                'sala_id' => $sala_id,
                'data'    => $puestos
            ], 200);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error al obtener puestos: ' . $e->getMessage()], 500);
        }
    }

    public static function mapaCompleto(): void {
        try {
            $mapa = Ubicacion::getMapaCompleto();
            Database::sendJson([
                'success' => true,
                'count'   => count($mapa),
                'data'    => $mapa
            ], 200);
        } catch (Throwable $e) {
            Database::sendJson([
                'success' => false,
                'message' => 'Error al obtener mapa completo de ubicaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    public static function reubicarEquipo(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            if (!is_array($data)) {
                Database::sendJson(['success' => false, 'message' => 'Cuerpo JSON inválido o vacío.'], 400);
                return;
            }

            $equipoId = (int)($data['equipo_id'] ?? 0);
            $nuevaSalaId = (int)($data['nueva_sala_id'] ?? 0);
            $nuevoPuestoId = !empty($data['nuevo_puesto_id']) && (int)$data['nuevo_puesto_id'] > 0 
                ? (int)$data['nuevo_puesto_id'] 
                : null;

            Ubicacion::reubicarEquipo($equipoId, $nuevaSalaId, $nuevoPuestoId);

            Database::sendJson([
                'success' => true,
                'message' => 'Equipo reubicado exitosamente y mapa actualizado.'
            ], 200);
        } catch (InvalidArgumentException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], 400);
        } catch (RuntimeException $e) {
            $code = $e->getCode() === 409 ? 409 : ($e->getCode() === 404 ? 404 : 500);
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $code);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error al reubicar equipo: ' . $e->getMessage()], 500);
        }
    }


    public static function stats(): void {
        try {
            $stats = Ubicacion::getStats();
            Database::sendJson([
                'success' => true,
                'data'    => $stats
            ], 200);
        } catch (Throwable $e) {
            Database::sendJson([
                'success' => false,
                'message' => 'Error al obtener estadisticas de ubicaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    public static function crearSala(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            if (!is_array($data) || empty(trim($data['nombre'] ?? ''))) {
                Database::sendJson(['success' => false, 'message' => 'El nombre de la sala es obligatorio.'], 400);
                return;
            }

            $nombre = trim($data['nombre']);
            $descripcion = isset($data['descripcion']) && trim((string)$data['descripcion']) !== '' ? trim((string)$data['descripcion']) : null;
            $edificio = isset($data['edificio']) && trim((string)$data['edificio']) !== '' ? trim((string)$data['edificio']) : null;
            $piso = isset($data['piso']) && trim((string)$data['piso']) !== '' ? trim((string)$data['piso']) : null;
            $capacidad = isset($data['capacidad_puestos']) ? (int)$data['capacidad_puestos'] : 0;
            $tipo = isset($data['tipo']) ? (string)$data['tipo'] : 'LABORATORIO';

            $id = Ubicacion::crearSala($nombre, $descripcion, $capacidad, $edificio, $piso, $tipo);

            Database::sendJson([
                'success' => true,
                'message' => 'Sala creada exitosamente.',
                'id'      => $id
            ], 201);
        } catch (InvalidArgumentException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], 400);
        } catch (RuntimeException $e) {
            $code = $e->getCode() === 409 ? 409 : ($e->getCode() === 404 ? 404 : 400);
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $code);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error al crear sala: ' . $e->getMessage()], 500);
        }
    }

    public static function actualizarSala(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            if (!is_array($data)) {
                $data = [];
            }

            $idSala = (int)($data['id_sala'] ?? $data['sala_id'] ?? $data['id'] ?? $_GET['id_sala'] ?? $_GET['id'] ?? 0);
            $nombre = trim((string)($data['nombre'] ?? ''));

            if ($idSala <= 0) {
                Database::sendJson(['success' => false, 'message' => 'El parámetro id_sala es obligatorio.'], 400);
                return;
            }

            if ($nombre === '') {
                Database::sendJson(['success' => false, 'message' => 'El nombre de la sala es obligatorio.'], 400);
                return;
            }

            $edificio = array_key_exists('edificio', $data) ? (string)$data['edificio'] : null;
            $piso = array_key_exists('piso', $data) ? (string)$data['piso'] : null;
            $descripcion = array_key_exists('descripcion', $data) ? (string)$data['descripcion'] : null;
            $capacidad = isset($data['capacidad_puestos']) && $data['capacidad_puestos'] !== '' ? (int)$data['capacidad_puestos'] : null;

            $salaActualizada = Ubicacion::actualizarSala($idSala, $nombre, $edificio, $piso, $descripcion, $capacidad);

            Database::sendJson([
                'success' => true,
                'message' => 'Sala actualizada exitosamente.',
                'data'    => $salaActualizada
            ], 200);
        } catch (InvalidArgumentException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], 400);
        } catch (RuntimeException $e) {
            $code = $e->getCode() === 409 ? 409 : ($e->getCode() === 404 ? 404 : 400);
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $code);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error al actualizar sala: ' . $e->getMessage()], 500);
        }
    }

    public static function eliminarSala(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            if (!is_array($data)) {
                $data = [];
            }

            $idSala = (int)($data['id_sala'] ?? $data['sala_id'] ?? $data['id'] ?? $_GET['id_sala'] ?? $_GET['id'] ?? 0);

            if ($idSala <= 0) {
                Database::sendJson(['success' => false, 'message' => 'El parámetro id_sala es obligatorio.'], 400);
                return;
            }

            Ubicacion::eliminarSala($idSala);

            Database::sendJson([
                'success' => true,
                'message' => 'Sala y puestos libres eliminados exitosamente.'
            ], 200);
        } catch (InvalidArgumentException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], 400);
        } catch (RuntimeException $e) {
            $code = $e->getCode() === 409 ? 409 : ($e->getCode() === 404 ? 404 : 400);
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $code);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error al eliminar sala: ' . $e->getMessage()], 500);
        }
    }

    public static function agregarPuesto(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            $salaId = (int)($data['sala_id'] ?? 0);

            if ($salaId <= 0) {
                Database::sendJson(['success' => false, 'message' => 'El ID de la sala es obligatorio.'], 400);
                return;
            }

            $nuevoPuesto = Ubicacion::agregarPuesto($salaId);

            Database::sendJson([
                'success' => true,
                'message' => "Puesto {$nuevoPuesto['codigo_puesto']} creado exitosamente.",
                'data'    => $nuevoPuesto
            ], 201);
        } catch (RuntimeException $e) {
            $code = $e->getCode() === 404 ? 404 : 400;
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $code);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error al agregar puesto: ' . $e->getMessage()], 500);
        }
    }

    public static function eliminarPuesto(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            $puestoId = (int)($data['puesto_id'] ?? 0);

            if ($puestoId <= 0) {
                Database::sendJson(['success' => false, 'message' => 'El ID del puesto es obligatorio.'], 400);
                return;
            }

            Ubicacion::eliminarPuesto($puestoId);

            Database::sendJson([
                'success' => true,
                'message' => 'Puesto eliminado exitosamente.'
            ], 200);
        } catch (RuntimeException $e) {
            $code = $e->getCode() === 409 ? 409 : ($e->getCode() === 404 ? 404 : 400);
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $code);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error al eliminar puesto: ' . $e->getMessage()], 500);
        }
    }
}
