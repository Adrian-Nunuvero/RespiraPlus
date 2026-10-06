# RespiraPlus MediRehab Pro - PowerShell Launcher
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "  🫁 RESPIRAPLUS MEDIREHAB PRO - SISTEMA CLÍNICO DE REHABILITACIÓN" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js no está instalado o no está en el PATH." -ForegroundColor Red
    Write-Host "Descargue e instale Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Presione Enter para salir"
    exit 1
}

# 2. Check dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Instalando dependencias necesarias..." -ForegroundColor Yellow
    npm install
}

Write-Host "[OK] Entorno listo." -ForegroundColor Green
Write-Host ""
Write-Host "-----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " 🔑 CREDENCIALES DE ACCESO RÁPIDO (Contraseña universal: admin123)" -ForegroundColor Yellow
Write-Host " • Administrador : admin@gmail.com" -ForegroundColor White
Write-Host " • Dr. Roberto   : doctor@hospital.med (Fisiatría & Rehabilitación)" -ForegroundColor White
Write-Host " • Dra. Elena    : elena.vargas@hospital.med (Neumología & Respiratorio)" -ForegroundColor White
Write-Host " • Lic. Carlos   : carlos.salazar@hospital.med (Biomecánica Postural)" -ForegroundColor White
Write-Host " • Paciente      : paciente@respiraplus.med (Carlos Vega)" -ForegroundColor White
Write-Host "-----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Iniciando servidor en http://localhost:4000..." -ForegroundColor Cyan

Start-Process "http://localhost:4000"
node server.js
