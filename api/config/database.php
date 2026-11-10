<?php
// Reporte de errores para desarrollo local
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

// Inicializar sesión segura si no está activa
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    session_start();
}

// Parámetros de conexión a MySQL
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'lab_inventario');  // O 'lab_inventario', según el nombre con el que creaste la BD
define('DB_USER', 'admin');       // El usuario que creaste con privilegios (o root)
define('DB_PASS', '123'); // La contraseña que le asignaste en MariaDB
define('DB_CHARSET', 'utf8mb4');
class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                // Fallback de auto-recuperación local: si el servicio MySQL de XAMPP está detenido, iniciarlo y reintentar
                $mysqldPath = 'C:\\xampp\\mysql\\bin\\mysqld.exe';
                $myIniPath  = 'C:\\xampp\\mysql\\bin\\my.ini';
                if (PHP_OS_FAMILY === 'Windows' && file_exists($mysqldPath)) {
                    @pclose(@popen('start /B "" "' . $mysqldPath . '" --defaults-file="' . $myIniPath . '" --standalone >NUL 2>&1', 'r'));
                    usleep(2200000); // Esperar 2.2s a que el socket 3306 esté disponible
                    try {
                        self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
                        return self::$instance;
                    } catch (PDOException $retryEx) {
                        $e = $retryEx;
                    }
                }

                self::sendJson([
                    'success' => false,
                    'message' => 'Error de conexión a la base de datos: ' . $e->getMessage()
                ], 500);
                exit;
            }
        }
        return self::$instance;
    }

    /**
     * Utilidad para emitir respuestas JSON limpias y manejar cabeceras CORS
     */
    public static function sendJson(array $data, int $statusCode = 200): void
    {
        header('Content-Type: application/json; charset=utf-8');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

        http_response_code($statusCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}
