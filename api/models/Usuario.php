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
        $stmt->execute([':email' => trim($email)]);
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
     * Busca un usuario por su ID primario
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
}
