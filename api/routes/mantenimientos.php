<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/MantenimientoController.php';

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'stats') {
        MantenimientoController::stats();
    } else {
        MantenimientoController::index();
    }
} elseif ($method === 'POST') {
    if ($action === 'resolver') {
        MantenimientoController::resolver();
    } else {
        MantenimientoController::store();
    }
} elseif ($method === 'PUT') {
    MantenimientoController::resolver();
} else {
    Database::sendJson([
        'success' => false,
        'message' => "Método HTTP {$method} no permitido."
    ], 405);
}
