<?php
require_once __DIR__ . '/../config/database.php';

class Usuario {
    /**
     * Busca un usuario por su correo electrónico institucional
     */
    public static function findByEmail(string $email): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT id, nombre, email, password, rol, activo, ultimo_acceso, created_at
            FROM usuarios
            WHERE email = :email
            LIMIT 1
        ");
        $stmt->execute([':email' => strtolower(trim($email))]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Actualiza la fecha y hora del último acceso del usuario autenticado
     */
    public static function updateUltimoAcceso(int $id): bool {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE usuarios
            SET ultimo_acceso = NOW()
            WHERE id = :id
        ");
        return $stmt->execute([':id' => $id]);
    }

    /**
     * Busca un usuario por su ID primario (sin exponer password)
     */
    public static function findById(int $id): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT id, nombre, email, rol, activo, ultimo_acceso, created_at
            FROM usuarios
            WHERE id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Registra un nuevo usuario con rol OPERADOR por defecto y activo = 1
     */
    public static function create(string $nombre, string $email, string $passwordHash, string $rol = 'OPERADOR'): int {
        $db = Database::getConnection();
        $rolValido = in_array($rol, ['ADMIN', 'OPERADOR'], true) ? $rol : 'OPERADOR';
        $stmt = $db->prepare("
            INSERT INTO usuarios (nombre, email, password, rol, activo, created_at)
            VALUES (:nombre, :email, :password, :rol, 1, NOW())
        ");
        $stmt->execute([
            ':nombre'   => trim($nombre),
            ':email'    => strtolower(trim($email)),
            ':password' => $passwordHash,
            ':rol'      => $rolValido
        ]);
        return (int)$db->lastInsertId();
    }

    /**
     * Lista todos los usuarios activos sin exponer la columna password
     */
    public static function listarTodos(): array {
        $db = Database::getConnection();
        $stmt = $db->query("
            SELECT id, nombre, email, rol, activo, ultimo_acceso, created_at
            FROM usuarios
            WHERE activo = 1
            ORDER BY FIELD(rol, 'ADMIN', 'OPERADOR'), created_at DESC, id ASC
        ");
        return $stmt->fetchAll();
    }

    /**
     * Cuenta la cantidad de administradores activos en el sistema
     */
    public static function contarAdminsActivos(): int {
        $db = Database::getConnection();
        $stmt = $db->query("
            SELECT COUNT(*) FROM usuarios WHERE rol = 'ADMIN' AND activo = 1
        ");
        return (int)$stmt->fetchColumn();
    }

    /**
     * Actualiza el rol jerárquico de un usuario ('ADMIN' o 'OPERADOR')
     */
    public static function cambiarRol(int $idUsuario, string $nuevoRol): bool {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE usuarios
            SET rol = :rol
            WHERE id = :id
        ");
        return $stmt->execute([
            ':rol' => $nuevoRol,
            ':id'  => $idUsuario
        ]);
    }

    /**
     * Elimina un usuario de la base de datos por ID
     */
    public static function eliminar(int $idUsuario): bool {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            DELETE FROM usuarios
            WHERE id = :id
        ");
        return $stmt->execute([':id' => $idUsuario]);
    }
}
