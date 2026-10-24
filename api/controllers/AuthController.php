<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Usuario.php';

class AuthController {
    /**
     * Asegura la inicialización de sesión
     */
    public static function ensureSession(): void {
        if (session_status() === PHP_SESSION_NONE) {
            ini_set('session.cookie_httponly', '1');
            ini_set('session.use_only_cookies', '1');
            session_start();
        }
    }

    /**
     * POST ?action=login
     */
    public static function login(): void {
        self::ensureSession();

        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (!is_array($data)) {
            Database::sendJson([
                'success' => false,
                'message' => 'Cuerpo de solicitud inválido o vacío.'
            ], 400);
            return;
        }

        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');

        if (empty($email) || empty($password)) {
            Database::sendJson([
                'success' => false,
                'message' => 'Por favor ingrese tanto el correo electrónico como la contraseña.'
            ], 400);
            return;
        }

        $user = Usuario::findByEmail($email);

        if (!$user) {
            Database::sendJson([
                'success' => false,
                'message' => 'Credenciales inválidas. Verifique su correo o contraseña.'
            ], 401);
            return;
        }

        if ((int)$user['activo'] !== 1) {
            Database::sendJson([
                'success' => false,
                'message' => 'Su cuenta se encuentra inactiva. Contacte al Administrador.'
            ], 403);
            return;
        }

        if (!password_verify($password, $user['password'])) {
            Database::sendJson([
                'success' => false,
                'message' => 'Credenciales inválidas. Verifique su correo o contraseña.'
            ], 401);
            return;
        }

        // Actualizar último acceso en la base de datos
        Usuario::updateUltimoAcceso((int)$user['id']);

        // Persistir datos en $_SESSION
        $sessionData = [
            'id'     => (int)$user['id'],
            'nombre' => $user['nombre'],
            'email'  => $user['email'],
            'rol'    => $user['rol']
        ];
        $_SESSION['user'] = $sessionData;

        Database::sendJson([
            'success' => true,
            'message' => 'Autenticación exitosa. Bienvenido al sistema.',
            'data'    => $sessionData
        ], 200);
    }

    /**
     * POST ?action=logout
     */
    public static function logout(): void {
        self::ensureSession();
        $_SESSION = [];

        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }

        session_destroy();

        Database::sendJson([
            'success' => true,
            'message' => 'Sesión finalizada exitosamente.'
        ], 200);
    }

    /**
     * GET ?action=check
     */
    public static function check(): void {
        self::ensureSession();
        if (isset($_SESSION['user']) && !empty($_SESSION['user']['id'])) {
            Database::sendJson([
                'success' => true,
                'data'    => $_SESSION['user']
            ], 200);
        } else {
            Database::sendJson([
                'success' => false,
                'message' => 'No hay una sesión activa.'
            ], 401);
        }
    }

    /**
     * Helper para obtener el usuario autenticado
     */
    public static function getAuthenticatedUser(): ?array {
        self::ensureSession();
        return $_SESSION['user'] ?? null;
    }

    /**
     * Middleware de autenticación requerida
     */
    public static function requireAuth(): array {
        $user = self::getAuthenticatedUser();
        if (!$user) {
            Database::sendJson([
                'success' => false,
                'message' => 'Acceso denegado: debe iniciar sesión para realizar esta operación.'
            ], 401);
            exit;
        }
        return $user;
    }

    /**
     * Middleware de validación estricta de Administrador
     */
    public static function requireAdmin(string $customMessage = ''): array {
        $user = self::requireAuth();
        if ($user['rol'] !== 'ADMIN') {
            $msg = $customMessage ?: 'Acción restringida: solo un Administrador puede realizar esta operación.';
            Database::sendJson([
                'success' => false,
                'message' => $msg
            ], 403);
            exit;
        }
        return $user;
    }
}
