@echo off
setlocal enabledelayedexpansion
title LabInventario - Servidor de Aplicacion
cd /d "%~dp0"

:: -----------------------------------------------------------------------------
:: 1. Verificacion y Arranque de MySQL (mysqld.exe)
:: -----------------------------------------------------------------------------
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe" >NUL
if "!ERRORLEVEL!"=="0" (
    set "MYSQL_STATUS=En ejecucion (Activo)"
) else (
    echo [*] MySQL no esta activo. Iniciando en segundo plano...
    if exist "C:\xampp\mysql\bin\mysqld.exe" (
        start "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
        timeout /t 2 /nobreak >nul
        set "MYSQL_STATUS=Iniciado en segundo plano"
    ) else (
        set "MYSQL_STATUS=No encontrado en C:\xampp\mysql\bin\"
    )
)

:: -----------------------------------------------------------------------------
:: 2. Deteccion del Binario de PHP (PATH o C:\xampp\php\php.exe)
:: -----------------------------------------------------------------------------
set "PHP_CMD="
where php >nul 2>&1
if "!ERRORLEVEL!"=="0" (
    set "PHP_CMD=php"
) else if exist "C:\xampp\php\php.exe" (
    set "PHP_CMD=C:\xampp\php\php.exe"
) else (
    echo.
    echo =====================================================================
    echo  [ERROR] No se encontro el ejecutable de PHP.
    echo  Por favor instala PHP o agrega C:\xampp\php\ a las variables de entorno.
    echo =====================================================================
    echo.
    pause
    exit /b 1
)

:: -----------------------------------------------------------------------------
:: 3. Verificacion de Puerto 8000 en Uso
:: -----------------------------------------------------------------------------
netstat -aon | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if "!ERRORLEVEL!"=="0" (
    echo.
    echo =====================================================================
    echo  [AVISO] Ya existe un servidor web activo en el puerto 8000.
    echo  Abriendo automaticamente en tu navegador...
    echo =====================================================================
    echo.
    start http://localhost:8000/public/login.html
    echo  Si deseas reiniciar el servicio, ejecuta primero stop.bat y luego run.bat.
    echo.
    pause
    exit /b 0
)

:: -----------------------------------------------------------------------------
:: 4. Apertura Asincrona del Navegador (Espera 2 segundos para inicializar socket)
:: -----------------------------------------------------------------------------
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000/public/login.html"

:: -----------------------------------------------------------------------------
:: 5. Banner de Inicio y Feedback en Consola
:: -----------------------------------------------------------------------------
cls
echo =====================================================================
echo               LABINVENTARIO - SISTEMA DE CONTROL PATRIMONIAL
echo =====================================================================
echo.
echo   [*] URL de Acceso    : http://localhost:8000/public/login.html
echo   [*] Servidor Web     : PHP Built-in Server (localhost:8000)
echo   [*] Base de Datos    : !MYSQL_STATUS!
echo   [*] Directorio Raiz  : %CD%
echo.
echo =====================================================================
echo   Iniciando servidor web y abriendo navegador predeterminado...
echo   Presiona [Ctrl + C] en esta ventana para detener el servidor.
echo =====================================================================
echo.

:: -----------------------------------------------------------------------------
:: 6. Ejecucion del Servidor Web PHP (Bloqueante en primer plano para logs)
:: -----------------------------------------------------------------------------
"%PHP_CMD%" -S localhost:8000
