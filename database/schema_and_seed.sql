-- ==========================================================
-- Reconstrucción de Base de Datos: lab_inventario
-- Sistema de Inventario de Laboratorio de Cómputo
-- Servidor: MySQL / MariaDB (XAMPP)
-- Charset: utf8mb4 | Collate: utf8mb4_unicode_ci
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Creación de la Base de Datos
CREATE DATABASE IF NOT EXISTS `lab_inventario` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `lab_inventario`;

-- 2. Eliminación de tablas previas si existen
DROP TABLE IF EXISTS `prestamos`;
DROP TABLE IF EXISTS `mantenimientos`;
DROP TABLE IF EXISTS `equipos`;
DROP TABLE IF EXISTS `puestos`;
DROP TABLE IF EXISTS `salas`;
DROP TABLE IF EXISTS `usuarios`;

-- 3. Tabla: salas
CREATE TABLE `salas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `capacidad_puestos` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla: puestos
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

-- 5. Tabla: equipos
CREATE TABLE `equipos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_patrimonial` varchar(50) NOT NULL,
  `numero_serie` varchar(100) NOT NULL,
  `categoria` enum('PC_ESCRITORIO','ALL_IN_ONE','MONITOR','NETWORKING','PROYECTOR','PERIFERICO','COMPONENTE_INTERNO') NOT NULL,
  `marca` varchar(50) NOT NULL,
  `modelo` varchar(100) NOT NULL,
  `estado` enum('OPERATIVO','EN_MANTENIMIENTO','CON_FALLA','EN_PRESTAMO','DE_BAJA') DEFAULT 'OPERATIVO',
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


-- 5.1 Tabla: prestamos
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

-- 5.2 Tabla: usuarios (Autenticación y Roles Jerárquicos)
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

-- 6. Tabla: mantenimientos
CREATE TABLE `mantenimientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `equipo_id` int(11) NOT NULL,
  `fecha_reporte` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_resolucion` timestamp NULL DEFAULT NULL,
  `tipo` enum('PREVENTIVO','CORRECTIVO','CAMBIO_PIEZA','LIMPIEZA') NOT NULL,
  `prioridad` enum('BAJA','MEDIA','ALTA','CRITICA') DEFAULT 'MEDIA',
  `titulo` varchar(150) NOT NULL,
  `descripcion_falla` text NOT NULL,
  `diagnostico_tecnico` text DEFAULT NULL,
  `acciones_realizadas` text DEFAULT NULL,
  `tecnico_responsable` varchar(100) NOT NULL,
  `estado_resultado` enum('PENDIENTE','EN_CURSO','RESUELTO','DERIVADO_A_BAJA') DEFAULT 'PENDIENTE',
  PRIMARY KEY (`id`),
  KEY `equipo_id` (`equipo_id`),
  CONSTRAINT `mantenimientos_ibfk_1` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 7. Datos Iniciales (Seeders)
-- ==========================================================

-- Inserción de Salas (4)
INSERT INTO `salas` (`id`, `nombre`, `descripcion`, `capacidad_puestos`, `created_at`) VALUES
(1, 'Laboratorio 1 - Programación', 'Sala para desarrollo de software', 20, '2026-09-24 16:54:30'),
(2, 'Laboratorio 2 - Redes', 'Mesas de trabajo y racks de conectividad', 16, '2026-09-24 16:54:30'),
(3, 'Taller de Soporte y Hardware', 'Área de diagnóstico y reparación técnica', 6, '2026-09-24 16:54:30'),
(4, 'Depósito Central', 'Reserva de piezas y componentes para sustitución técnica', 0, '2026-09-24 16:54:30');

-- Inserción de Puestos Físicos (7)
INSERT INTO `puestos` (`id`, `sala_id`, `codigo_puesto`, `fila`, `columna`, `created_at`) VALUES
(1, 1, 'LAB1-P01', 1, 1, '2026-09-24 16:54:30'),
(2, 1, 'LAB1-P02', 1, 2, '2026-09-24 16:54:30'),
(3, 1, 'LAB1-P03', 1, 3, '2026-09-24 16:54:30'),
(4, 1, 'LAB1-P04', 1, 4, '2026-09-24 16:54:30'),
(5, 2, 'LAB2-P01', 1, 1, '2026-09-24 16:54:30'),
(6, 2, 'LAB2-P02', 1, 2, '2026-09-24 16:54:30'),
(7, 3, 'TALLER-MESA1', 1, 1, '2026-09-24 16:54:30');

-- Inserción de Equipos y Activos (7)
INSERT INTO `equipos` (`id`, `codigo_patrimonial`, `numero_serie`, `categoria`, `marca`, `modelo`, `estado`, `sala_id`, `puesto_id`, `cpu`, `ram_gb`, `almacenamiento`, `ip_asignada`, `mac_address`, `fecha_ingreso`, `notas`, `created_at`) VALUES
(1, 'PAT-PC-001', '5CD2348X1Q', 'PC_ESCRITORIO', 'HP', 'ProDesk 400 G6', 'OPERATIVO', 1, 1, 'Intel Core i5-10500', 16, '512 GB SSD NVMe', '192.168.10.21', 'A0:B3:CC:11:22:33', '2024-01-15', 'Equipo principal del puesto 1', '2026-09-24 16:54:30'),
(2, 'PAT-PC-002', '5CD2348X2W', 'PC_ESCRITORIO', 'HP', 'ProDesk 400 G6', 'OPERATIVO', 1, 2, 'Intel Core i5-10500', 32, '512 GB SSD NVMe', '192.168.10.22', 'A0:B3:CC:11:22:34', '2024-01-15', 'Equipo asignado con 32GB RAM', '2026-09-24 16:54:30'),
(3, 'PAT-PC-003', 'MXL1029384', 'PC_ESCRITORIO', 'Dell', 'OptiPlex 7080', 'CON_FALLA', 1, 3, 'Intel Core i7-10700', 16, '1 TB SSD SATA', '192.168.10.23', 'B8:27:EB:44:55:66', '2024-02-01', 'Presenta reinicios intermitentes en carga de trabajo', '2026-09-24 16:54:30'),
(4, 'PAT-AIO-001', 'W8823190LK', 'ALL_IN_ONE', 'Lenovo', 'IdeaCentre AIO 3', 'EN_MANTENIMIENTO', 3, 7, 'AMD Ryzen 5 5500U', 8, '256 GB SSD NVMe', '192.168.10.80', 'FC:FB:FB:01:02:03', '2024-03-10', 'En taller para mantenimiento preventivo y limpieza', '2026-09-24 16:54:30'),
(5, 'PAT-SW-001', 'FOC18290Z9', 'NETWORKING', 'Cisco', 'Catalyst 2960-X', 'OPERATIVO', 2, NULL, NULL, NULL, NULL, '192.168.10.2', '00:1E:13:C2:A1:00', '2023-11-20', 'Switch principal Lab 2', '2026-09-24 16:54:30'),
(6, 'PAT-PRY-001', 'V79F910023', 'PROYECTOR', 'Epson', 'PowerLite E20', 'EN_PRESTAMO', 1, NULL, NULL, NULL, NULL, NULL, NULL, '2024-01-10', 'En préstamo al departamento docente', '2026-09-24 16:54:30'),
(7, 'PAT-REP-001', 'KVR32S22S8', 'COMPONENTE_INTERNO', 'Kingston', 'DDR4 3200MHz 8GB', 'OPERATIVO', 4, NULL, NULL, 8, NULL, NULL, NULL, '2024-05-12', 'Módulo de RAM de repuesto', '2026-09-24 16:54:30');

-- Inserción de Mantenimientos / Incidencias (2)
INSERT INTO `mantenimientos` (`id`, `equipo_id`, `fecha_reporte`, `fecha_resolucion`, `tipo`, `prioridad`, `titulo`, `descripcion_falla`, `diagnostico_tecnico`, `acciones_realizadas`, `tecnico_responsable`, `estado_resultado`) VALUES
(1, 3, '2026-09-22 13:30:00', NULL, 'CORRECTIVO', 'ALTA', 'Reinicios constantes en carga de trabajo', 'El equipo se apaga bruscamente al ejecutar software pesado.', 'Posible degradación de fuente de poder o pasta térmica seca.', NULL, 'Técnico de Turno', 'PENDIENTE'),
(2, 4, '2026-09-23 18:15:00', NULL, 'PREVENTIVO', 'MEDIA', 'Limpieza semestral y cambio térmico', 'Exceso de polvo en rejillas y temperaturas elevadas.', 'Ventilador saturado de polvo.', 'Desensamble realizado, a la espera de pasta térmica.', 'Técnico de Turno', 'EN_CURSO');


-- Inserción de Préstamos de Activos (2)
INSERT INTO `prestamos` (`id`, `equipo_id`, `solicitante_nombre`, `solicitante_identificacion`, `destino_uso`, `fecha_prestamo`, `fecha_devolucion_estimada`, `fecha_devolucion_real`, `estado_prestamo`, `observaciones`) VALUES
(1, 6, 'Prof. Carlos Mendoza', '14.582.910', 'Aula Magna / Defensa de Grado', '2026-09-24 09:00:00', '2026-09-25', '2026-10-16 15:31:05', 'DEVUELTO', 'Préstamo para proyecciones académicas y defensas.'),
(2, 6, 'Prof. Carlos Mendoza', '14.582.910', 'Aula Magna / Defensa de Grado', '2026-10-16 15:31:05', '2026-10-25', NULL, 'ACTIVO', 'Préstamo renovado para proyecciones académicas y defensas de grado.');

-- Inserción de Cuentas de Usuario Semilla (ADMIN vs OPERADOR)
-- Clave Admin: Admin123* | Clave Operador: Operador123*
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `rol`, `activo`, `ultimo_acceso`, `created_at`) VALUES
(1, 'Coordinador de Laboratorios', 'admin@lab.local', '$2y$10$BIZ5Vfjrl31E7tb2Y25mEeHumUPDdPXcCEtkxtnN1Fx6APApQlFl2', 'ADMIN', 1, NULL, '2026-10-23 22:45:00'),
(2, 'Custodio Técnico', 'operador@lab.local', '$2y$10$GPWkguEhrXC5h5Lj9/uPc.bucNW5iU9YdrJTxVD.fiZPgw0zP1Qwq', 'OPERADOR', 1, NULL, '2026-10-23 22:45:00');

SET FOREIGN_KEY_CHECKS = 1;
