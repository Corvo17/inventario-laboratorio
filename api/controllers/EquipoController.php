<?php
require_once __DIR__ . '/../models/Equipo.php';
require_once __DIR__ . '/../config/database.php';

class EquipoController {
    /**
     * Lee datos de entrada soportando tanto JSON crudo (php://input) como $_POST (FormData / urlencoded)
     */
    private static function parseRequestData(): ?array {
        $rawInput = file_get_contents('php://input');
        if ($rawInput !== false && trim($rawInput) !== '') {
            $decoded = json_decode($rawInput, true);
            if (is_array($decoded) && !empty($decoded)) {
                return $decoded;
            }
            if (is_array($decoded) && empty($_POST)) {
                return $decoded;
            }
        }

        if (!empty($_POST) && is_array($_POST)) {
            return $_POST;
        }

        return null;
    }

    /**
     * Emite una respuesta de error en formato JSON estricto y finaliza la ejecución
     */
    private static function sendError(string $mensajeError, int $statusCode = 400): void {
        header('Content-Type: application/json; charset=utf-8');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
        http_response_code($statusCode);
        echo json_encode(['success' => false, 'message' => $mensajeError], JSON_UNESCAPED_UNICODE);
        exit;
    }

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
            self::sendError('Error al listar equipos: ' . $e->getMessage(), 500);
        }
    }

    public static function show(int $id): void {
        try {
            $equipo = Equipo::getById($id);
            if (!$equipo) {
                self::sendError("El equipo #{$id} no existe.", 404);
            }
            Database::sendJson(['success' => true, 'data' => $equipo], 200);
        } catch (Throwable $e) {
            self::sendError('Error al consultar equipo: ' . $e->getMessage(), 500);
        }
    }

    public static function store(): void {
        try {
            $data = self::parseRequestData();
            if (!is_array($data) || empty($data)) {
                header('Content-Type: application/json; charset=utf-8');
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Datos de entrada vacíos o JSON inválido.']);
                exit;
            }

            $newId = Equipo::create($data);
            Database::sendJson(['success' => true, 'message' => 'Equipo registrado.', 'data' => ['id' => $newId]], 201);
        } catch (InvalidArgumentException $e) {
            $mensajeError = $e->getMessage();
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $mensajeError], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (RuntimeException $e) {
            $statusCode = $e->getCode() === 409 ? 409 : ($e->getCode() === 400 ? 400 : 500);
            self::sendError($e->getMessage(), $statusCode);
        } catch (Throwable $e) {
            self::sendError('Error al registrar el equipo: ' . $e->getMessage(), 500);
        }
    }

    public static function update(int $id): void {
        try {
            $data = self::parseRequestData();
            if (!is_array($data) || empty($data)) {
                header('Content-Type: application/json; charset=utf-8');
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Datos de entrada vacíos o JSON inválido.']);
                exit;
            }

            if ($id <= 0 && !empty($data['id'])) {
                $id = (int)$data['id'];
            }
            if ($id <= 0) {
                header('Content-Type: application/json; charset=utf-8');
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID de equipo inválido para actualización.']);
                exit;
            }

            Equipo::update($id, $data);
            Database::sendJson(['success' => true, 'message' => 'Equipo actualizado exitosamente.'], 200);
        } catch (InvalidArgumentException $e) {
            $mensajeError = $e->getMessage();
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $mensajeError], JSON_UNESCAPED_UNICODE);
            exit;
        } catch (RuntimeException $e) {
            $statusCode = $e->getCode() === 409 ? 409 : ($e->getCode() === 400 ? 400 : 500);
            self::sendError($e->getMessage(), $statusCode);
        } catch (Throwable $e) {
            self::sendError('Error al actualizar el equipo: ' . $e->getMessage(), 500);
        }
    }

    public static function darDeBaja(int $id): void {
        try {
            $data = self::parseRequestData() ?? [];
            if ($id <= 0 && !empty($data['id'])) {
                $id = (int)$data['id'];
            }
            $motivo = trim((string)($data['motivo'] ?? ''));

            Equipo::darDeBaja($id, $motivo);
            Database::sendJson(['success' => true, 'message' => 'Equipo dado de baja y puesto físico liberado correctamente.'], 200);
        } catch (RuntimeException $e) {
            $statusCode = $e->getCode() === 404 ? 404 : 500;
            self::sendError($e->getMessage(), $statusCode);
        } catch (Throwable $e) {
            self::sendError('Error al dar de baja el equipo: ' . $e->getMessage(), 500);
        }
    }

    public static function dashboardMetrics(): void {
        try {
            $metrics = Equipo::getDashboardMetrics();
            Database::sendJson(['success' => true, 'data' => $metrics], 200);
        } catch (Throwable $e) {
            self::sendError('Error al obtener métricas: ' . $e->getMessage(), 500);
        }
    }

    public static function hojaVida(int $id): void {
        try {
            if ($id <= 0) {
                self::sendError('ID de equipo inválido.', 400);
            }

            $hojaVida = Equipo::getHojaVida($id);
            if (!$hojaVida) {
                self::sendError("El equipo #{$id} no existe.", 404);
            }

            Database::sendJson(['success' => true, 'data' => $hojaVida], 200);
        } catch (Throwable $e) {
            self::sendError('Error al obtener hoja de vida: ' . $e->getMessage(), 500);
        }
    }
}
