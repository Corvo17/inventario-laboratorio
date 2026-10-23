<?php
require_once __DIR__ . '/../models/Equipo.php';
require_once __DIR__ . '/../config/database.php';

class EquipoController {
    public static function index(): void {
        try {
            $filters = [];
            if (isset($_GET['search']) && trim($_GET['search']) !== '') $filters['search'] = trim($_GET['search']);
            if (isset($_GET['estado']) && trim($_GET['estado']) !== '') $filters['estado'] = trim($_GET['estado']);
            if (isset($_GET['sala_id']) && trim($_GET['sala_id']) !== '' && trim($_GET['sala_id']) !== 'undefined') {
                $filters['sala_id'] = trim($_GET['sala_id']);
            }

            $equipos = Equipo::getAll($filters);
            Database::sendJson(['success' => true, 'count' => count($equipos), 'data' => $equipos], 200);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public static function show(int $id): void {
        try {
            $equipo = Equipo::getById($id);
            if (!$equipo) {
                Database::sendJson(['success' => false, 'message' => "El equipo #{$id} no existe."], 404);
                return;
            }
            Database::sendJson(['success' => true, 'data' => $equipo], 200);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public static function store(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            if (!is_array($data)) {
                Database::sendJson(['success' => false, 'message' => 'JSON inválido.'], 400);
                return;
            }

            $newId = Equipo::create($data);
            Database::sendJson(['success' => true, 'message' => 'Equipo registrado.', 'data' => ['id' => $newId]], 201);
        } catch (InvalidArgumentException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], 400);
        } catch (RuntimeException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $e->getCode() === 409 ? 409 : 500);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public static function update(int $id): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            if (!is_array($data)) {
                Database::sendJson(['success' => false, 'message' => 'JSON inválido.'], 400);
                return;
            }

            Equipo::update($id, $data);
            Database::sendJson(['success' => true, 'message' => 'Equipo actualizado exitosamente.'], 200);
        } catch (InvalidArgumentException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], 400);
        } catch (RuntimeException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $e->getCode() === 409 ? 409 : 500);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public static function darDeBaja(int $id): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true) ?? [];
            $motivo = $data['motivo'] ?? '';

            Equipo::darDeBaja($id, $motivo);
            Database::sendJson(['success' => true, 'message' => 'Equipo dado de baja y puesto físico liberado correctamente.'], 200);
        } catch (RuntimeException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $e->getCode() === 404 ? 404 : 500);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public static function dashboardMetrics(): void {
        try {
            $metrics = Equipo::getDashboardMetrics();
            Database::sendJson(['success' => true, 'data' => $metrics], 200);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public static function hojaVida(int $id): void {
        try {
            if ($id <= 0) {
                Database::sendJson(['success' => false, 'message' => 'ID de equipo inválido.'], 400);
                return;
            }

            $hojaVida = Equipo::getHojaVida($id);
            if (!$hojaVida) {
                Database::sendJson(['success' => false, 'message' => "El equipo #{$id} no existe."], 404);
                return;
            }

            Database::sendJson(['success' => true, 'data' => $hojaVida], 200);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public static function registrarPrestamo(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            if (!is_array($data)) {
                Database::sendJson(['success' => false, 'message' => 'JSON inválido o cuerpo de solicitud vacío.'], 400);
                return;
            }

            $prestamoId = Equipo::registrarPrestamo($data);
            Database::sendJson([
                'success' => true,
                'message' => 'Préstamo registrado exitosamente y equipo asignado a EN PRÉSTAMO.',
                'data'    => ['prestamo_id' => $prestamoId]
            ], 201);
        } catch (InvalidArgumentException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], 400);
        } catch (RuntimeException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $e->getCode() === 409 ? 409 : 500);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public static function devolverPrestamo(): void {
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true) ?? [];
            $equipoId = (int)($data['equipo_id'] ?? ($_GET['id'] ?? 0));
            $prestamoId = (int)($data['prestamo_id'] ?? 0);

            if ($equipoId <= 0 && $prestamoId <= 0) {
                Database::sendJson(['success' => false, 'message' => 'Se requiere equipo_id o prestamo_id para registrar la devolución.'], 400);
                return;
            }

            Equipo::devolverPrestamo($equipoId, $prestamoId);
            Database::sendJson([
                'success' => true,
                'message' => 'Devolución registrada exitosamente. El equipo ha sido reincorporado a estado OPERATIVO.'
            ], 200);
        } catch (InvalidArgumentException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], 400);
        } catch (RuntimeException $e) {
            Database::sendJson(['success' => false, 'message' => $e->getMessage()], $e->getCode() === 404 ? 404 : 500);
        } catch (Throwable $e) {
            Database::sendJson(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

}
