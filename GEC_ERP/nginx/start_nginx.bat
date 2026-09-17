@echo off
title GEC ERP - Start Nginx Server

echo ====================================================================
echo  Starting GEC ERP Nginx SSL Reverse Proxy
echo  Domain: erpdev.manavkalola.xyz -> http://127.0.0.1:5000
echo ====================================================================
echo.

where nginx >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Nginx is not found in system PATH.
    echo Please download Nginx for Windows from: https://nginx.org/en/download.html
    echo Extract nginx to a folder (e.g. C:\nginx) and add it to your PATH,
    echo or copy nginx.exe to this folder.
    pause
    exit /b 1
)

echo Testing Nginx Configuration...
nginx -t -c D:\ERP\GEC_ERP\nginx\nginx.conf
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Nginx configuration test failed!
    pause
    exit /b 1
)

echo.
echo Starting Nginx...
start nginx -c D:\ERP\GEC_ERP\nginx\nginx.conf

echo [SUCCESS] Nginx is running in background!
echo - HTTPS URL: https://erpdev.manavkalola.xyz
echo - HTTP URL:  http://erpdev.manavkalola.xyz (Auto redirects to HTTPS)
echo.
pause
