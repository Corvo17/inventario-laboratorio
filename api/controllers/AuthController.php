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

        // Persistir datos en $_SESSION (sincronizado en 'user' y 'usuario')
        $sessionData = [
            'id'     => (int)$user['id'],
            'nombre' => $user['nombre'],
            'email'  => $user['email'],
            'rol'    => $user['rol']
        ];
        $_SESSION['user'] = $sessionData;
        $_SESSION['usuario'] = $sessionData;

        Database::sendJson([
            'success' => true,
            'message' => 'Autenticación exitosa. Bienvenido al sistema.',
            'data'    => $sessionData
        ], 200);
    }

    /**
     * POST ?action=register
     * Auto-registro público de nuevos usuarios con rol por defecto OPERADOR y activo = 1
     */
    public static function register(): void {
        self::ensureSession();

        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (!is_array($data)) {
            $data = $_POST;
        }

        $nombre   = trim($data['nombre'] ?? '');
        $email    = strtolower(trim($data['email'] ?? ''));
        $password = (string)($data['password'] ?? '');

        if ($nombre === '' || $email === '' || trim($password) === '') {
            Database::sendJson([
                'success' => false,
                'message' => 'Todos los campos (nombre completo, correo electrónico y contraseña) son obligatorios.'
            ], 400);
            return;
        }

        if (mb_strlen($nombre) < 3 || mb_strlen($nombre) > 100 || !preg_match('/^[\p{L}\s.\'-]{3,100}$/u', $nombre) || preg_match('/[<>"\';\\\\`{}]/', $nombre)) {
            Database::sendJson([
                'success' => false,
                'message' => 'El nombre completo debe tener al menos 3 caracteres válidos y no contener caracteres especiales ni de inyección.'
            ], 400);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150) {
            Database::sendJson([
                'success' => false,
                'message' => 'El formato del correo electrónico institucional no es válido.'
            ], 400);
            return;
        }

        if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d).{8,}$/', $password)) {
            Database::sendJson([
                'success' => false,
                'message' => 'La contraseña debe contener al menos 8 caracteres, incluyendo letras y números.'
            ], 400);
            return;
        }

        try {
            $existing = Usuario::findByEmail($email);
            if ($existing) {
                Database::sendJson([
                    'success' => false,
                    'message' => 'El correo electrónico ingresado ya se encuentra registrado en el sistema.'
                ], 409);
                return;
            }

            $passwordHash = password_hash($password, PASSWORD_BCRYPT);
            $newId = Usuario::create($nombre, $email, $passwordHash, 'OPERADOR');
            $createdUser = Usuario::findById($newId);

            Database::sendJson([
                'success' => true,
                'message' => 'Cuenta registrada exitosamente como Operador. Ya puedes iniciar sesión.',
                'data'    => $createdUser ?? [
                    'id'     => $newId,
                    'nombre' => $nombre,
                    'email'  => $email,
                    'rol'    => 'OPERADOR',
                    'activo' => 1
                ]
            ], 201);
        } catch (PDOException $e) {
            if ((string)$e->getCode() === '23000') {
                Database::sendJson([
                    'success' => false,
                    'message' => 'El correo electrónico ingresado ya se encuentra registrado en el sistema.'
                ], 409);
                return;
            }
            Database::sendJson([
                'success' => false,
                'message' => 'Error al registrar el usuario en la base de datos.'
            ], 500);
        }
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
        $sessionUser = $_SESSION['usuario'] ?? $_SESSION['user'] ?? null;
        if (is_array($sessionUser) && !empty($sessionUser['id'])) {
            $_SESSION['user'] = $sessionUser;
            $_SESSION['usuario'] = $sessionUser;
            Database::sendJson([
                'success' => true,
                'data'    => $sessionUser
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
        $sessionUser = $_SESSION['usuario'] ?? $_SESSION['user'] ?? null;
        if (is_array($sessionUser) && !empty($sessionUser['id'])) {
            $_SESSION['user'] = $sessionUser;
            $_SESSION['usuario'] = $sessionUser;
            return $sessionUser;
        }
        return null;
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
