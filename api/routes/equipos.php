<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/EquipoController.php';
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
$id = !empty($_GET['id']) ? (int)$_GET['id'] : 0;

if ($method === 'GET') {
    if ($action === 'dashboard-metrics') {
        EquipoController::dashboardMetrics();
    } elseif ($action === 'detalle') {
        EquipoController::show($id);
    } elseif ($action === 'hoja-vida') {
        EquipoController::hojaVida($id);
    } else {
        EquipoController::index();
    }
} elseif ($method === 'POST') {
    if ($action === 'actualizar') {
        EquipoController::update($id);
    } elseif ($action === 'dar-de-baja') {
        AuthController::requireAdmin('Acción restringida: solo un Administrador puede autorizar la baja patrimonial de un activo.');
        EquipoController::darDeBaja($id);
    } elseif ($action === 'registrar-prestamo') {
        EquipoController::registrarPrestamo();
    } elseif ($action === 'devolver-prestamo') {
        EquipoController::devolverPrestamo();
    } else {
        EquipoController::store();
    }
} elseif ($method === 'PUT') {
    EquipoController::update($id);
} else {
    Database::sendJson(['success' => false, 'message' => "Método {$method} no permitido."], 405);
}
