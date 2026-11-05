<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/UsuarioController.php';

// Preflight CORS
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    if ($action === '' || $action === 'listar') {
        UsuarioController::listar();
    } else {
        Database::sendJson([
            'success' => false,
            'message' => 'Acción GET no reconocida en usuarios.'
        ], 400);
    }
} elseif ($method === 'POST' || $method === 'PUT' || $method === 'DELETE') {
    if ($action === 'cambiar-rol') {
        UsuarioController::cambiarRol();
    } elseif ($action === 'eliminar' || $method === 'DELETE') {
        UsuarioController::eliminar();
    } else {
        Database::sendJson([
            'success' => false,
            'message' => 'Acción no reconocida en usuarios.'
        ], 400);
    }
} else {
    Database::sendJson([
        'success' => false,
        'message' => "Método {$method} no permitido."
    ], 405);
}

