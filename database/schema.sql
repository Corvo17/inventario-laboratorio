-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: lab_inventario
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `lab_inventario`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `lab_inventario` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `lab_inventario`;

--
-- Table structure for table `equipos`
--

DROP TABLE IF EXISTS `equipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipos`
--

LOCK TABLES `equipos` WRITE;
/*!40000 ALTER TABLE `equipos` DISABLE KEYS */;
INSERT INTO `equipos` VALUES (1,'PAT-PC-001','5CD2348X1Q','PC_ESCRITORIO','HP','ProDesk 400 G6','OPERATIVO',1,1,'Intel Core i5-10500',16,'512 GB SSD NVMe','192.168.10.21','A0:B3:CC:11:22:33','2024-01-15','Equipo principal del puesto 1','2026-09-24 16:54:30'),(2,'PAT-PC-002','5CD2348X2W','PC_ESCRITORIO','HP','ProDesk 400 G6','OPERATIVO',1,2,'Intel Core i5-10500',16,'512 GB SSD NVMe','192.168.10.22','A0:B3:CC:11:22:34','2024-01-15','Equipo asignado','2026-09-24 16:54:30'),(3,'PAT-PC-003','MXL1029384','PC_ESCRITORIO','Dell','OptiPlex 7080','CON_FALLA',1,3,'Intel Core i7-10700',16,'1 TB SSD SATA','192.168.10.23','B8:27:EB:44:55:66','2024-02-01','Presenta reinicios intermitentes','2026-09-24 16:54:30'),(4,'PAT-AIO-001','W8823190LK','ALL_IN_ONE','Lenovo','IdeaCentre AIO 3','EN_MANTENIMIENTO',3,7,'AMD Ryzen 5 5500U',8,'256 GB SSD NVMe','192.168.10.80','FC:FB:FB:01:02:03','2024-03-10','En taller para mantenimiento preventivo','2026-09-24 16:54:30'),(5,'PAT-SW-001','FOC18290Z9','NETWORKING','Cisco','Catalyst 2960-X','OPERATIVO',2,NULL,NULL,NULL,NULL,'192.168.10.2','00:1E:13:C2:A1:00','2023-11-20','Switch principal Lab 2','2026-09-24 16:54:30'),(6,'PAT-PRY-001','V79F910023','PROYECTOR','Epson','PowerLite E20','EN_PRESTAMO',1,NULL,NULL,NULL,NULL,NULL,NULL,'2024-01-10','En pr├®stamo al departamento docente','2026-09-24 16:54:30'),(7,'PAT-REP-001','KVR32S22S8','COMPONENTE_INTERNO','Kingston','DDR4 3200MHz 8GB','OPERATIVO',4,NULL,NULL,8,NULL,NULL,NULL,'2024-05-12','M├│dulo de RAM de repuesto','2026-09-24 16:54:30');
/*!40000 ALTER TABLE `equipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mantenimientos`
--

DROP TABLE IF EXISTS `mantenimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mantenimientos`
--

LOCK TABLES `mantenimientos` WRITE;
/*!40000 ALTER TABLE `mantenimientos` DISABLE KEYS */;
INSERT INTO `mantenimientos` VALUES (1,3,'2026-09-22 13:30:00',NULL,'CORRECTIVO','ALTA','Reinicios constantes en carga de trabajo','El equipo se apaga bruscamente al ejecutar software pesado.','Posible degradaci├│n de fuente de poder o pasta t├®rmica seca.',NULL,'T├®cnico de Turno','PENDIENTE'),(2,4,'2026-09-23 18:15:00',NULL,'PREVENTIVO','MEDIA','Limpieza semestral y cambio t├®rmico','Exceso de polvo en rejillas y temperaturas elevadas.','Ventilador saturado de polvo.','Desensamble realizado, a la espera de pasta t├®rmica.','T├®cnico de Turno','EN_CURSO');
/*!40000 ALTER TABLE `mantenimientos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `puestos`
--

DROP TABLE IF EXISTS `puestos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `puestos`
--

LOCK TABLES `puestos` WRITE;
/*!40000 ALTER TABLE `puestos` DISABLE KEYS */;
INSERT INTO `puestos` VALUES (1,1,'LAB1-P01',1,1,'2026-09-24 16:54:30'),(2,1,'LAB1-P02',1,2,'2026-09-24 16:54:30'),(3,1,'LAB1-P03',1,3,'2026-09-24 16:54:30'),(4,1,'LAB1-P04',1,4,'2026-09-24 16:54:30'),(5,2,'LAB2-P01',1,1,'2026-09-24 16:54:30'),(6,2,'LAB2-P02',1,2,'2026-09-24 16:54:30'),(7,3,'TALLER-MESA1',1,1,'2026-09-24 16:54:30');
/*!40000 ALTER TABLE `puestos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salas`
--

DROP TABLE IF EXISTS `salas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `salas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `capacidad_puestos` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salas`
--

LOCK TABLES `salas` WRITE;
/*!40000 ALTER TABLE `salas` DISABLE KEYS */;
INSERT INTO `salas` VALUES (1,'Laboratorio 1 - Programaci├│n','Sala para desarrollo de software',20,'2026-09-24 16:54:30'),(2,'Laboratorio 2 - Redes','Mesas de trabajo y racks de conectividad',15,'2026-09-24 16:54:30'),(3,'Taller de Soporte y Hardware','├ürea de diagn├│stico y reparaci├│n',6,'2026-09-24 16:54:30'),(4,'Dep├│sito Central','Reserva de componentes y repuestos',0,'2026-09-24 16:54:30');
/*!40000 ALTER TABLE `salas` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-24 13:19:09
