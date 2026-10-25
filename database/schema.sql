-- ==========================================================
-- SISTEMA DE GESTIÓN E INVENTARIO DE LABORATORIOS DE CÓMPUTO
-- Esquema DDL Maestro de Base de Datos: lab_inventario
-- Tablas Activas (5): salas, puestos, equipos, prestamos, usuarios
-- Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Motor: InnoDB (Transaccional, Integridad Referencial)
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Creación de la Base de Datos
CREATE DATABASE IF NOT EXISTS `lab_inventario` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `lab_inventario`;

-- 2. Eliminación de tablas en orden inverso de dependencias
DROP TABLE IF EXISTS `prestamos`;
DROP TABLE IF EXISTS `equipos`;
DROP TABLE IF EXISTS `puestos`;
DROP TABLE IF EXISTS `salas`;
DROP TABLE IF EXISTS `usuarios`;

-- ----------------------------------------------------------
-- 3. Tabla: salas (Ubicaciones físicas y laboratorios)
-- ----------------------------------------------------------
CREATE TABLE `salas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `capacidad_puestos` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. Tabla: puestos (Puestos de trabajo físicos por sala)
-- ----------------------------------------------------------
CREATE TABLE `puestos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sala_id` int(11) NOT NULL,
  `codigo_puesto` varchar(50) NOT NULL,
  `fila` int(11) DEFAULT NULL,
  `columna` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_puesto` (`codigo_puesto`),
  KEY `sala_id` (`sala_id`),
  CONSTRAINT `puestos_ibfk_1` FOREIGN KEY (`sala_id`) REFERENCES `salas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. Tabla: equipos (Activos patrimoniales y tecnológicos)
-- ----------------------------------------------------------
CREATE TABLE `equipos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_patrimonial` varchar(50) NOT NULL,
  `numero_serie` varchar(100) NOT NULL,
  `categoria` enum('PC_ESCRITORIO','ALL_IN_ONE','MONITOR','NETWORKING','PROYECTOR','PERIFERICO','COMPONENTE_INTERNO') NOT NULL,
  `marca` varchar(50) NOT NULL,
  `modelo` varchar(100) NOT NULL,
  `estado` enum('OPERATIVO','EN_PRESTAMO','DE_BAJA') DEFAULT 'OPERATIVO',
  `sala_id` int(11) NOT NULL,
  `puesto_id` int(11) DEFAULT NULL,
  `cpu` varchar(100) DEFAULT NULL,
  `ram_gb` int(11) DEFAULT NULL,
  `almacenamiento` varchar(100) DEFAULT NULL,
  `ip_asignada` varchar(45) DEFAULT NULL,
  `mac_address` varchar(17) DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `notas` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_patrimonial` (`codigo_patrimonial`),
  UNIQUE KEY `numero_serie` (`numero_serie`),
  UNIQUE KEY `puesto_id` (`puesto_id`),
  KEY `sala_id` (`sala_id`),
  CONSTRAINT `equipos_ibfk_1` FOREIGN KEY (`sala_id`) REFERENCES `salas` (`id`),
  CONSTRAINT `equipos_ibfk_2` FOREIGN KEY (`puesto_id`) REFERENCES `puestos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. Tabla: prestamos (Control y trazabilidad de préstamos externos)
-- ----------------------------------------------------------
CREATE TABLE `prestamos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `equipo_id` int(11) NOT NULL,
  `solicitante_nombre` varchar(120) NOT NULL,
  `solicitante_identificacion` varchar(50) NOT NULL,
  `destino_uso` varchar(150) NOT NULL,
  `fecha_prestamo` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_devolucion_estimada` date DEFAULT NULL,
  `fecha_devolucion_real` datetime DEFAULT NULL,
  `estado_prestamo` enum('ACTIVO','DEVUELTO') NOT NULL DEFAULT 'ACTIVO',
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `equipo_id` (`equipo_id`),
  KEY `estado_prestamo` (`estado_prestamo`),
  CONSTRAINT `prestamos_ibfk_1` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. Tabla: usuarios (Cuentas y roles jerárquicos ADMIN / OPERADOR)
-- ----------------------------------------------------------
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('ADMIN','OPERADOR') NOT NULL DEFAULT 'OPERADOR',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_acceso` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. Datos Semilla Iniciales (Usuarios Administrativos y Salas Base)
-- ----------------------------------------------------------
-- Contraseña Admin: Admin123*
-- Contraseña Operador: Operador123*
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `rol`, `activo`, `ultimo_acceso`, `created_at`) VALUES
(1, 'Coordinador de Laboratorios', 'admin@lab.local', '$2y$10$BIZ5Vfjrl31E7tb2Y25mEeHumUPDdPXcCEtkxtnN1Fx6APApQlFl2', 'ADMIN', 1, NULL, CURRENT_TIMESTAMP),
(2, 'Custodio Técnico', 'operador@lab.local', '$2y$10$Kk6dYp/f3V79g2pEsmzKku0N.v95hS5.k8tV11.bEw7bVbT/vM0Wy', 'OPERADOR', 1, NULL, CURRENT_TIMESTAMP);

-- Salas Base
INSERT INTO `salas` (`id`, `nombre`, `descripcion`, `capacidad_puestos`, `created_at`) VALUES
(1, 'Laboratorio 1 - Programación', 'Sala para desarrollo de software y computación gráfica', 20, CURRENT_TIMESTAMP),
(2, 'Laboratorio 2 - Redes y Hardware', 'Mesas de trabajo, bancos de pruebas y racks de conectividad', 16, CURRENT_TIMESTAMP),
(3, 'Depósito Central y Reserva', 'Almacén para equipos flotantes, repuestos y reserva técnica', 0, CURRENT_TIMESTAMP);

-- Puestos Base Laboratorio 1
INSERT INTO `puestos` (`id`, `sala_id`, `codigo_puesto`, `fila`, `columna`, `created_at`) VALUES
(1, 1, 'LAB1-P01', 1, 1, CURRENT_TIMESTAMP),
(2, 1, 'LAB1-P02', 1, 2, CURRENT_TIMESTAMP),
(3, 1, 'LAB1-P03', 1, 3, CURRENT_TIMESTAMP),
(4, 1, 'LAB1-P04', 1, 4, CURRENT_TIMESTAMP),
(5, 2, 'LAB2-P01', 1, 1, CURRENT_TIMESTAMP),
(6, 2, 'LAB2-P02', 1, 2, CURRENT_TIMESTAMP);

SET FOREIGN_KEY_CHECKS = 1;
