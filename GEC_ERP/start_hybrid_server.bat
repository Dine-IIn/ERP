@echo off
title GEC ERP Enterprise Server (Port 5000 + PostgreSQL 5432)
color 0A

echo ====================================================================
echo             🏭 GEC MOULDING MACHINE ERP ENTERPRISE SERVER
echo             Hybrid Architecture (LAN Offline + Cloud Remote)
echo ====================================================================
echo.

cd /d "%~dp0"

:: 1. Add bundled binary paths to current environment PATH
set "PATH=%~dp0pgsql\bin;%~dp0pgsql\lib;%~dp0bin;%PATH%"

:: 2. Resolve Node.js Runtime (Bundled / System)
set "NODE_EXEC="
if exist "%~dp0bin\node.exe" (
    set "NODE_EXEC=%~dp0bin\node.exe"
) else (
    where node >nul 2>nul
    if %errorlevel% equ 0 set "NODE_EXEC=node"
    if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXEC=C:\Program Files\nodejs\node.exe"
    if exist "C:\Program Files (x86)\nodejs\node.exe" set "NODE_EXEC=C:\Program Files (x86)\nodejs\node.exe"
    if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "NODE_EXEC=%LOCALAPPDATA%\Programs\node\node.exe"
)

if "%NODE_EXEC%"=="" (
    color 0C
    echo.
    echo ====================================================================
    echo [ERROR] Node.js Runtime not found!
    echo ====================================================================
    echo Neither bundled bin\node.exe nor system node was found.
    echo Please make sure the installer completed without errors.
    echo.
    pause
    exit /b 1
)

echo [1/4] Node.js Runtime Ready:
"%NODE_EXEC%" -v
echo.

:: 3. Resolve & Initialize PostgreSQL Runtime
echo [2/4] Initializing PostgreSQL Database Engine...
set "PG_BIN=%~dp0pgsql\bin"
set "PG_DATA=%~dp0pgsql\data"

if not exist "%PG_BIN%\postgres.exe" (
    where postgres >nul 2>nul
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('where postgres') do set "PG_BIN=%%~dpi"
    )
)

if exist "%PG_BIN%\initdb.exe" (
    if not exist "%PG_DATA%\PG_VERSION" (
        echo [PostgreSQL] Initializing fresh database cluster at "%PG_DATA%"...
        if not exist "%PG_DATA%" mkdir "%PG_DATA%"
        "%PG_BIN%\initdb.exe" -D "%PG_DATA%" -U postgres -A trust --encoding=UTF8 --auth-local=trust --auth-host=trust >nul 2>&1
        if %errorlevel% neq 0 (
            echo [WARN] initdb returned code %errorlevel%, retrying verbose...
            "%PG_BIN%\initdb.exe" -D "%PG_DATA%" -U postgres -A trust --encoding=UTF8
        )
        echo [PostgreSQL] Database cluster initialized successfully.
    )

    :: Check if PostgreSQL server is running
    "%PG_BIN%\pg_ctl.exe" status -D "%PG_DATA%" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [PostgreSQL] Starting PostgreSQL database daemon on port 5432...
        if not exist "storage" mkdir storage
        "%PG_BIN%\pg_ctl.exe" start -D "%PG_DATA%" -l "%~dp0storage\postgres.log" -o "-p 5432" -w -t 10
    ) else (
        echo [PostgreSQL] Database daemon is already running.
    )

    :: Ensure gec_erp database exists
    "%PG_BIN%\createdb.exe" -U postgres -p 5432 gec_erp >nul 2>&1
    echo [OK] PostgreSQL Engine Active on Port 5432.
) else (
    echo [INFO] PostgreSQL bundled binaries not detected; assuming external PostgreSQL service on port 5432.
)
echo.

:: 4. Verify Storage & Backup Directories
echo [3/4] Checking Data and Backup Directories...
if not exist "storage" mkdir storage
if not exist "backups" mkdir backups
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
    )
)
echo [OK] Storage and backup directories verified.
echo.

:: 5. Launch Server Supervisor
echo [4/4] Starting GEC ERP Backend Server on Port 5000...
echo.
echo ====================================================================
echo  🌐 LOCAL ACCESS:   http://localhost:5000
echo  ☁️  CLOUD ACCESS:   https://erp.manavkalola.xyz
echo ====================================================================
echo.

:SERVER_LOOP
cd /d "%~dp0backend"
if exist "dist\server.cjs" (
    "%NODE_EXEC%" dist/server.cjs
) else (
    "%NODE_EXEC%" src/server.js
)

echo.
echo ⚠️ Server process stopped. Auto-recovering in 3 seconds...
timeout /t 3 /nobreak >nul
goto SERVER_LOOP
