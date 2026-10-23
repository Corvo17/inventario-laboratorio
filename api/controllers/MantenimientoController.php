<?php
require_once __DIR__ . '/../models/Mantenimiento.php';
require_once __DIR__ . '/../config/database.php';

class MantenimientoController {
    /**
     * Listado de mantenimientos con filtros
     */
    public static function index(): void {
        try {
            $filters = [];
            if (!empty($_GET['estado_resultado'])) $filters['estado_resultado'] = trim($_GET['estado_resultado']);
            if (!empty($_GET['prioridad'])) $filters['prioridad'] = trim($_GET['prioridad']);
            if (!empty($_GET['equipo_id'])) $filters['equipo_id'] = trim($_GET['equipo_id']);
            if (!empty($_GET['search'])) $filters['search'] = trim($_GET['search']);

            $list = Mantenimiento::getAll($filters);
            Database::sendJson([
                'success' => true,
                'count'   => count($list),
                'data'    => $list
            ], 200);

        } catch (Throwable $e) {
            Database::sendJson([
                'success' => false,
                'message' => 'Error al obtener bitácora de mantenimientos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Registro de nueva incidencia técnica
     */
    public static function store(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            if (!is_array($data)) {
                Database::sendJson([
                    'success' => false,
                    'message' => 'Cuerpo JSON inválido.'
                ], 400);
                return;
            }

            $newId = Mantenimiento::registrar($data);

            Database::sendJson([
                'success' => true,
                'message' => 'Orden de mantenimiento registrada correctamente.',
                'data'    => ['id' => $newId]
            ], 201);

        } catch (InvalidArgumentException $e) {
            Database::sendJson([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        } catch (RuntimeException $e) {
            Database::sendJson([
                'success' => false,
                'message' => $e->getMessage()
            ], $e->getCode() === 404 ? 404 : 500);
        } catch (Throwable $e) {
            Database::sendJson([
                'success' => false,
                'message' => 'Error interno al registrar mantenimiento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cierre y resolución técnica de la orden
     */
    public static function resolver(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true) ?? [];

            $id = $_GET['id'] ?? $data['id'] ?? null;
            if (!$id || (int)$id <= 0) {
                Database::sendJson([
                    'success' => false,
                    'message' => 'Se requiere el ID del mantenimiento a resolver.'
                ], 400);
                return;
            }

            Mantenimiento::resolver((int)$id, $data);

            Database::sendJson([
                'success' => true,
                'message' => 'Orden de mantenimiento resuelta y estado de equipo actualizado.'
            ], 200);

        } catch (InvalidArgumentException $e) {
            Database::sendJson([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        } catch (RuntimeException $e) {
            Database::sendJson([
                'success' => false,
                'message' => $e->getMessage()
            ], $e->getCode() === 404 ? 404 : 500);
        } catch (Throwable $e) {
            Database::sendJson([
                'success' => false,
                'message' => 'Error interno al resolver mantenimiento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estadísticas rápidas para métricas superiores
     */
    public static function stats(): void {
        try {
            $stats = Mantenimiento::getEstadisticas();
            Database::sendJson([
                'success' => true,
                'data'    => $stats
            ], 200);
        } catch (Throwable $e) {
            Database::sendJson([
                'success' => false,
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
            ], 500);
        }
    }
}
