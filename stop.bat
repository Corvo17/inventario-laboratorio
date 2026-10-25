@echo off
setlocal enabledelayedexpansion
title Detener Servidor - LabInventario
cd /d "%~dp0"

echo =====================================================================
echo           LABINVENTARIO - DETENCION DE SERVICIOS LOCALES
echo =====================================================================
echo.

set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    set "PID=%%a"
    if not "!PID!"=="0" (
        echo  [*] Cerrando proceso web en puerto 8000 [PID: !PID!]...
        taskkill /F /PID !PID! >nul 2>&1
        set "FOUND=1"
    )
)

if "!FOUND!"=="1" (
    echo.
    echo  [OK] El servidor web PHP en el puerto 8000 fue detenido correctamente.
) else (
    echo  [*] No se detectaron procesos activos en el puerto 8000.
)

echo.
echo =====================================================================
echo  Entorno liberado. Puedes cerrar esta ventana.
echo =====================================================================
timeout /t 2 /nobreak >nul
exit /b 0
