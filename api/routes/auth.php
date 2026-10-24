<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/AuthController.php';

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'POST') {
    if ($action === 'login') {
        AuthController::login();
    } elseif ($action === 'logout') {
        AuthController::logout();
    } else {
        Database::sendJson([
            'success' => false,
            'message' => 'Acción POST no reconocida en auth.'
        ], 400);
    }
} elseif ($method === 'GET') {
    if ($action === 'check') {
        AuthController::check();
    } else {
        Database::sendJson([
            'success' => false,
            'message' => 'Acción GET no reconocida en auth.'
        ], 400);
    }
} else {
    Database::sendJson([
        'success' => false,
        'message' => "Método {$method} no permitido."
    ], 405);
}
