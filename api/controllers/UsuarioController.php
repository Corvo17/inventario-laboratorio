<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/AuthController.php';
require_once __DIR__ . '/../models/Usuario.php';

class UsuarioController {
    /**
     * Valida sesión activa y privilegios exclusivos de ADMIN
     */
    private static function enforceAdminRBAC(): array {
        AuthController::ensureSession();
        $sessionUser = $_SESSION['usuario'] ?? $_SESSION['user'] ?? null;

        if (!is_array($sessionUser) || empty($sessionUser['id'])) {
            Database::sendJson([
                'success' => false,
                'message' => 'Acceso denegado: debe iniciar sesión para realizar esta operación.'
            ], 401);
            exit;
        }

        // Sincronizar ambas claves de sesión
        $_SESSION['usuario'] = $sessionUser;
        $_SESSION['user'] = $sessionUser;

        if (($sessionUser['rol'] ?? '') !== 'ADMIN') {
            Database::sendJson([
                'success' => false,
                'message' => 'Acceso denegado (403 Forbidden): se requieren privilegios de Administrador.'
            ], 403);
            exit;
        }

        return $sessionUser;
    }

    /**
     * GET ?action=listar
     * Retorna la lista de usuarios activos sin exponer la columna password
     */
    public static function listar(): void {
        self::enforceAdminRBAC();

        try {
            $usuarios = Usuario::listarTodos();
            Database::sendJson([
                'success' => true,
                'data'    => $usuarios
            ], 200);
        } catch (Throwable $e) {
            Database::sendJson([
                'success' => false,
                'message' => 'Error al consultar la lista de usuarios: ' . $e->getMessage(),
                'data'    => []
            ], 500);
        }
    }

    /**
     * POST / PUT ?action=cambiar-rol
     * Recibe: id_usuario, nuevo_rol ('ADMIN' | 'OPERADOR')
     */
    public static function cambiarRol(): void {
        $adminActual = self::enforceAdminRBAC();

        $rawInput = file_get_contents('php://input');
        $body = json_decode($rawInput, true);
        if (!is_array($body)) {
            $body = $_POST;
        }

        $idUsuario = isset($body['id_usuario']) ? (int)$body['id_usuario'] : (isset($body['id']) ? (int)$body['id'] : (int)($_GET['id_usuario'] ?? $_GET['id'] ?? 0));
        $nuevoRol  = strtoupper(trim((string)($body['nuevo_rol'] ?? $body['rol'] ?? '')));

        if ($idUsuario <= 0 || !in_array($nuevoRol, ['ADMIN', 'OPERADOR'], true)) {
            Database::sendJson([
                'success' => false,
                'message' => 'Parámetros inválidos: se requiere id_usuario válido y nuevo_rol (ADMIN u OPERADOR).'
            ], 400);
            return;
        }

        // Regla de Protección de Integridad: Un administrador no puede revocar su propio rol de ADMIN
        if ($idUsuario === (int)$adminActual['id']) {
            Database::sendJson([
                'success' => false,
                'message' => 'No puedes revocar tus propios privilegios de Administrador'
            ], 400);
            return;
        }

        try {
            $targetUser = Usuario::findById($idUsuario);
            if (!$targetUser) {
                Database::sendJson([
                    'success' => false,
                    'message' => 'El usuario especificado no existe.'
                ], 404);
                return;
            }

            if ($targetUser['rol'] === 'ADMIN' && $nuevoRol === 'OPERADOR') {
                $totalAdmins = Usuario::contarAdminsActivos();
                if ($totalAdmins <= 1) {
                    Database::sendJson([
                        'success' => false,
                        'message' => 'No se puede degradar al último Administrador activo del sistema.'
                    ], 400);
                    return;
                }
            }

            Usuario::cambiarRol($idUsuario, $nuevoRol);
            $updatedUser = Usuario::findById($idUsuario);

            Database::sendJson([
                'success' => true,
                'message' => $nuevoRol === 'ADMIN'
                    ? "El usuario {$targetUser['nombre']} ha sido promovido a Administrador."
                    : "El rol de {$targetUser['nombre']} ha sido actualizado a Operador.",
                'data'    => $updatedUser
            ], 200);
        } catch (Throwable $e) {
            Database::sendJson([
                'success' => false,
                'message' => 'Error al actualizar el rol del usuario: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST / DELETE ?action=eliminar
     * Recibe: id_usuario
     */
    public static function eliminar(): void {
        $adminActual = self::enforceAdminRBAC();

        $rawInput = file_get_contents('php://input');
        $body = json_decode($rawInput, true);
        if (!is_array($body)) {
            $body = $_POST;
        }

        $idUsuario = isset($body['id_usuario']) ? (int)$body['id_usuario'] : (isset($body['id']) ? (int)$body['id'] : (int)($_GET['id_usuario'] ?? $_GET['id'] ?? 0));

        if ($idUsuario <= 0) {
            Database::sendJson([
                'success' => false,
                'message' => 'Se requiere un identificador de usuario válido (id_usuario).'
            ], 400);
            return;
        }

        // Regla de Protección 1: No permitir que el administrador se elimine a sí mismo
        if ($idUsuario === (int)$adminActual['id']) {
            Database::sendJson([
                'success' => false,
                'message' => 'No puedes eliminar ni desactivar tu propia cuenta de Administrador.'
            ], 400);
            return;
        }

        try {
            $targetUser = Usuario::findById($idUsuario);
            if (!$targetUser) {
                Database::sendJson([
                    'success' => false,
                    'message' => 'El usuario especificado no existe o ya fue eliminado.'
                ], 404);
                return;
            }

            // Regla de Protección 2: No permitir eliminar al último administrador del sistema
            if ($targetUser['rol'] === 'ADMIN') {
                $totalAdmins = Usuario::contarAdminsActivos();
                if ($totalAdmins <= 1) {
                    Database::sendJson([
                        'success' => false,
                        'message' => 'No se puede eliminar al último Administrador activo del sistema.'
                    ], 400);
                    return;
                }
            }

            Usuario::eliminar($idUsuario);

            Database::sendJson([
                'success' => true,
                'message' => "El usuario {$targetUser['nombre']} ({$targetUser['email']}) ha sido eliminado del sistema."
            ], 200);
        } catch (Throwable $e) {
            Database::sendJson([
                'success' => false,
                'message' => 'Error al eliminar el usuario: ' . $e->getMessage()
            ], 500);
        }
    }
}

