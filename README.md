# LabInventario - Sistema de Control Patrimonial & Auditoría Física de Laboratorios

Sistema web institucional de control de activos informáticos, trazabilidad de hardware por salas/puestos y gestión de usuarios bajo control de acceso basado en roles (RBAC). Desarrollado para optimizar la administración patrimonial en entornos universitarios.

---

## Características Principales

* **Control Patrimonial Estricto:** Estados estandarizados exclusivamente a `OPERATIVO` y `DE_BAJA`, eliminando estados ambiguos y garantizando auditorías precisas.
* **Mapeo Físico y Trazabilidad:** Organización jerárquica de laboratorios, puestos de trabajo físicos y depósito central/almacén de reserva técnica.
* **Control de Integridad Referencial:** Bloqueo preventivo de eliminación de salas con equipos asignados (`HTTP 409 Conflict`), exigiendo su reubicación previa al depósito.
* **Seguridad y RBAC:**
  * Auto-registro de usuarios con asignación por defecto a rol `OPERADOR`.
  * Validación simétrica de contraseñas (mínimo 8 caracteres alfanuméricos) y encriptación con Bcrypt.
  * Módulo administrativo (`ADMIN`) para promoción, degradación y auditoría de personal.
  * Protección contra auto-revocación o eliminación del último administrador del sistema.
* **Dashboard Analítico:** Métricas sincronizadas en tiempo real de ocupación de puestos, stock en depósito central y tasa de operatividad sin discrepancias.
* **Automatización Local:** Scripts de inicio (`run.bat`) y detención limpia (`stop.bat`) para despliegue sin depender del panel gráfico de XAMPP.
* **Interfaz de Usuario:** Basada en tokens de diseño Shadcn Zinc (modo claro/oscuro), iconografía unificada con FontAwesome v6.5.1 y estados de carga resilientes.

---

## Stack Tecnológico

* **Backend:** PHP 8.x (Arquitectura MVC liviana, enrutador RESTful nativo y PDO seguro).
* **Base de Datos:** MySQL / MariaDB (Motor InnoDB con restricciones de clave foránea).
* **Frontend:** Vanilla JavaScript (ES6+ modular), CSS3 nativo con variables personalizadas y FontAwesome v6.5.1.
* **Entorno de Ejecución:** Servidor embebido de PHP (`php -S`) y MySQL bajo entorno XAMPP en Windows.

---

## Requisitos Previos

Para ejecutar la aplicación en una estación de trabajo se requiere:

1. **Sistema Operativo:** Windows 10 o Windows 11 (64-bit).
2. **XAMPP:** Instalado en la ruta estándar por defecto (`C:\xampp`) con los módulos de **PHP** y **MySQL**.
3. **Navegador Web:** Google Chrome, Microsoft Edge o Mozilla Firefox actualizado.

---

## Guía de Instalación y Despliegue en Laboratorio

Sigue estos pasos en orden para poner en marcha el sistema desde cero en cualquier equipo:

### Paso 1: Ubicación del Proyecto
Descarga o clona la carpeta del proyecto en el equipo. Puedes ubicarla en cualquier directorio (por ejemplo: `C:\LabInventario` o en `Documentos`). No es obligatorio colocarla dentro de `htdocs`.

### Paso 2: Importar la Base de Datos
1. Abre el panel de control de XAMPP e inicia el servicio **MySQL** (o ejecuta el comando de MySQL en consola).
2. Abre tu navegador web e ingresa a phpMyAdmin:
   ```text
   http://localhost/phpmyadmin