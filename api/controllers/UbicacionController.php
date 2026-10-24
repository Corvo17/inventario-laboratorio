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
}
