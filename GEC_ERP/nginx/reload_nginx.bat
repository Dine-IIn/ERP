@echo off
title GEC ERP - Reload Nginx Configuration

echo Testing Nginx Configuration...
nginx -t -c D:\ERP\GEC_ERP\nginx\nginx.conf
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Nginx configuration test failed!
    pause
    exit /b 1
)

echo Reloading Nginx...
nginx -s reload -c D:\ERP\GEC_ERP\nginx\nginx.conf
if %errorlevel% equ 0 (
    echo [SUCCESS] Nginx reloaded successfully without dropping active connections!
) else (
    echo [ERROR] Failed to reload Nginx.
)
pause
