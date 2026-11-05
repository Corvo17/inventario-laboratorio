<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/AuthController.php';

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method !== 'GET') {
    Database::sendJson(['success' => false, 'message' => "Método {$method} no permitido."], 405);
}

if ($action !== 'descargar-sql') {
    Database::sendJson(['success' => false, 'message' => 'Acción no válida. Especifique action=descargar-sql.'], 400);
}

// Validar que la sesión sea de un usuario con rol ADMIN
$user = AuthController::requireAdmin('Acción restringida: solo un Administrador puede generar y descargar copias de respaldo de la base de datos.');

try {
    $db = Database::getConnection();

    // Tablas en orden adecuado de dependencia para FOREIGN KEYS
    $tablas = ['salas', 'puestos', 'equipos', 'usuarios', 'mantenimientos'];

    // Obtener tablas reales existentes en la base de datos
    $stmtTablas = $db->query("SHOW TABLES");
    $tablasExistentes = $stmtTablas->fetchAll(PDO::FETCH_COLUMN);

    $tablasAProcesar = array_values(array_intersect($tablas, $tablasExistentes));
    // Agregar cualquier otra tabla no contemplada
    foreach ($tablasExistentes as $t) {
        if (!in_array($t, $tablasAProcesar, true)) {
            $tablasAProcesar[] = $t;
        }
    }

    $fechaActual = date('Y-m-d H:i:s');
    $nombreArchivo = 'LabInventario_Backup_' . date('Y-m-d_His') . '.sql';

    $dump = [];
    $dump[] = "-- ==========================================================";
    $dump[] = "-- SISTEMA DE GESTIÓN DE INVENTARIO Y CONTROL PATRIMONIAL";
    $dump[] = "-- Respaldo Completo de Base de Datos (1 Clic)";
    $dump[] = "-- Fecha y Hora de Generación: " . $fechaActual;
    $dump[] = "-- Generado por: " . $user['nombre'] . " (" . $user['email'] . ") - Rol: " . $user['rol'];
    $dump[] = "-- Servidor: MySQL / MariaDB (XAMPP)";
    $dump[] = "-- Charset: utf8mb4 | Collate: utf8mb4_unicode_ci";
    $dump[] = "-- ==========================================================\n";
    $dump[] = "SET NAMES utf8mb4;";
    $dump[] = "SET FOREIGN_KEY_CHECKS = 0;\n";

    foreach ($tablasAProcesar as $tabla) {
        $dump[] = "-- ----------------------------------------------------------";
        $dump[] = "-- Estructura para la tabla `{$tabla}`";
        $dump[] = "-- ----------------------------------------------------------";
        $dump[] = "DROP TABLE IF EXISTS `{$tabla}`;";

        // Obtener DDL
        $stmtCreate = $db->query("SHOW CREATE TABLE `{$tabla}`");
        $rowCreate = $stmtCreate->fetch();
        $ddl = $rowCreate['Create Table'] ?? '';
        $dump[] = $ddl . ";\n";

        // Obtener Registros
        $dump[] = "-- Volcado de datos para la tabla `{$tabla}`";
        $stmtRows = $db->query("SELECT * FROM `{$tabla}`");
        $rows = $stmtRows->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($rows)) {
            $columnas = array_keys($rows[0]);
            $columnasSql = implode(', ', array_map(fn($col) => "`{$col}`", $columnas));

            $insertChunks = [];
            foreach ($rows as $row) {
                $valores = [];
                foreach ($row as $val) {
                    if ($val === null) {
                        $valores[] = "NULL";
                    } else {
                        $valores[] = $db->quote($val);
                    }
                }
                $insertChunks[] = "(" . implode(', ', $valores) . ")";
            }

            // Agrupar en batches de 50
            $chunks = array_chunk($insertChunks, 50);
            foreach ($chunks as $chunk) {
                $dump[] = "INSERT INTO `{$tabla}` ({$columnasSql}) VALUES\n" . implode(",\n", $chunk) . ";";
            }
        } else {
            $dump[] = "-- (Sin registros en `{$tabla}`)";
        }
        $dump[] = "";
    }

    $dump[] = "SET FOREIGN_KEY_CHECKS = 1;\n";
    $dump[] = "-- =================== FIN DEL RESPALDO =====================";

    $sqlFinal = implode("\n", $dump);

    // Enviar cabeceras de descarga automática
    header('Content-Type: application/sql; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $nombreArchivo . '"');
    header('Content-Length: ' . strlen($sqlFinal));
    header('Pragma: no-cache');
    header('Expires: 0');

    echo $sqlFinal;
    exit;

} catch (Throwable $e) {
    Database::sendJson([
        'success' => false,
        'message' => 'Error al generar el respaldo SQL: ' . $e->getMessage()
    ], 500);
}
