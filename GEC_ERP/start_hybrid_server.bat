@echo off
title GEC ERP Enterprise Hybrid Server
color 0A
echo ====================================================================
echo             🏭 GEC MOULDING MACHINE ERP ENTERPRISE SERVER
echo             Hybrid Architecture (LAN Offline + Remote Domain)
echo ====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js Environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (v18 or higher) from https://nodejs.org
    pause
    exit /b
)
echo [OK] Node.js found.

echo.
echo [2/3] Checking Frontend Production Build...
if not exist "frontend\dist\index.html" (
    echo Building frontend production bundle for high-speed serving...
    cd frontend
    call npm run build
    cd ..
) else (
    echo [OK] Production bundle ready in frontend\dist.
)

echo.
echo [3/3] Starting GEC ERP Hybrid Backend Server on Port 5000...
echo.
cd backend
node src/server.js
pause
