@echo off
title GEC ERP - Inno Setup Server Installer Builder Pipeline
color 0A
echo ====================================================================
echo    🏢 GEC MOULDING MACHINE ERP - SERVER INSTALLER BUILDER
echo ====================================================================
echo.

cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel% equ 0 (
    python build_server_installer.py
) else (
    py build_server_installer.py
)

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ====================================================================
    echo [ERROR] Build pipeline encountered an issue.
    echo ====================================================================
)

echo.
pause
