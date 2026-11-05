<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/UbicacionController.php';
require_once __DIR__ . '/../controllers/AuthController.php';

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'salas') {
        UbicacionController::salas();
    } elseif ($action === 'puestos') {
        UbicacionController::puestos();
    } elseif ($action === 'mapa-completo' || $action === 'mapa' || $action === '') {
        UbicacionController::mapaCompleto();
    } elseif ($action === 'stats') {
        UbicacionController::stats();
    } else {
        Database::sendJson([
            'success' => false,
            'message' => 'Acción no válida. Especifique action=salas, action=puestos, action=mapa o action=mapa-completo.'
        ], 400);
    }
} elseif ($method === 'POST') {
    if ($action === 'reubicar-equipo') {
        AuthController::requireAuth();
        UbicacionController::reubicarEquipo();
    } elseif ($action === 'crear-sala') {
        AuthController::requireAdmin();
        UbicacionController::crearSala();
    } elseif ($action === 'actualizar-sala') {
        AuthController::requireAdmin();
        UbicacionController::actualizarSala();
    } elseif ($action === 'eliminar-sala') {
        AuthController::requireAdmin();
        UbicacionController::eliminarSala();
    } elseif ($action === 'agregar-puesto') {
        AuthController::requireAdmin();
        UbicacionController::agregarPuesto();
    } elseif ($action === 'eliminar-puesto') {
        AuthController::requireAdmin();
        UbicacionController::eliminarPuesto();
    } else {
        Database::sendJson([
            'success' => false,
            'message' => 'Acción POST no reconocida en ubicaciones.'
        ], 400);
    }
} elseif ($method === 'PUT') {
    if ($action === 'actualizar-sala' || $action === '') {
        AuthController::requireAdmin();
        UbicacionController::actualizarSala();
    } else {
        Database::sendJson([
            'success' => false,
            'message' => 'Acción PUT no reconocida en ubicaciones.'
        ], 400);
    }
} elseif ($method === 'DELETE') {
    if ($action === 'eliminar-sala' || $action === '') {
        AuthController::requireAdmin();
        UbicacionController::eliminarSala();
    } else {
        Database::sendJson([
            'success' => false,
            'message' => 'Acción DELETE no reconocida en ubicaciones.'
        ], 400);
    }
} else {
    Database::sendJson([
        'success' => false,
        'message' => "Método {$method} no permitido."
    ], 405);
}
