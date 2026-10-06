@echo off
chcp 65001 >nul
title RespiraPlus MediRehab Pro - Servidor Local

:: Asegurar ejecución desde la carpeta del proyecto
cd /d "%~dp0"

echo =======================================================================
echo   🫁 RESPIRAPLUS MEDIREHAB PRO - SISTEMA CLÍNICO DE REHABILITACIÓN
echo =======================================================================
echo.
echo [1/3] Verificando entorno Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Node.js no está instalado o no se encuentra en el PATH del sistema.
    echo -------------------------------------------------------------------
    echo  Descargue e instale Node.js (LTS recomendado) desde:
    echo  👉 https://nodejs.org/
    echo -------------------------------------------------------------------
    echo.
    pause
    exit /b 1
)
echo [✔] Node.js detectado correctamente.
echo.

echo [2/3] Verificando configuración y dependencias...
if not exist ".env" (
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul
        echo [✔] Archivo .env configurado desde .env.example.
    )
)

if not exist "node_modules" (
    echo [INFO] Instalando dependencias necesarias (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ [ERROR] Falló la instalación de paquetes con npm.
        pause
        exit /b 1
    )
    echo [✔] Dependencias instaladas exitosamente.
) else (
    echo [✔] Dependencias verificadas.
)
echo.

echo [3/3] Iniciando servidor clínico en http://localhost:4000...
echo.
echo =======================================================================
echo  🌐 APLICACIÓN EN LÍNEA: http://localhost:4000
echo =======================================================================
echo  🔑 CREDENCIALES DE ACCESO RÁPIDO (Contraseña universal: admin123)
echo -----------------------------------------------------------------------
echo  • Administrador Maestro : admin@gmail.com
echo  • Dr. Roberto Martínez  : doctor@hospital.med (Fisiatría & Rehabilitación)
echo  • Dra. Elena Vargas     : elena.vargas@hospital.med (Neumología & Respiratorio)
echo  • Lic. Carlos Salazar   : carlos.salazar@hospital.med (Biomecánica Postural)
echo  • Carlos Vega (Paciente): paciente@respiraplus.med
echo -----------------------------------------------------------------------
echo  💡 Presiona [Ctrl + C] en cualquier momento para detener el servidor.
echo =======================================================================
echo.

:: Abrir navegador automáticamente tras 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:4000"

:: Ejecutar servidor Node.js
node server.js

pause
