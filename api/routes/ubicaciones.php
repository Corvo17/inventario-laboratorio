<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/UbicacionController.php';

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    } elseif ($action === 'mapa-completo') {
        UbicacionController::mapaCompleto();
    } elseif ($action === 'stats') {
        UbicacionController::stats();
    } else {
        Database::sendJson([
            'success' => false,
            'message' => 'Acción no válida. Especifique action=salas, action=puestos o action=mapa-completo.'
        ], 400);
    }
} elseif ($method === 'POST') {
    if ($action === 'reubicar-equipo') {
        UbicacionController::reubicarEquipo();
    } else {
        Database::sendJson([
            'success' => false,
            'message' => 'Acción POST no reconocida en ubicaciones.'
        ], 400);
    }
} else {
    Database::sendJson([
        'success' => false,
        'message' => "Método {$method} no permitido."
    ], 405);
}
