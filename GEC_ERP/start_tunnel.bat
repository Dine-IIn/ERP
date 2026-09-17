@echo off
title GEC ERP Cloudflare Tunnel
color 0B
echo ====================================================================
echo             ?? GEC ERP REMOTE ACCESS CLOUDFLARE TUNNEL
echo             Routing: https://erpdev.manavkalola.xyz -> Port 5000
echo ====================================================================
echo.

cd /d "%~dp0"

if not exist "cloudflared.exe" (
    echo [ERROR] cloudflared.exe not found in this folder!
    pause
    exit /b
)

echo Starting Cloudflare Tunnel (gec-erp)...
cloudflared.exe tunnel --config "%USERPROFILE%\.cloudflared\config.yml" run gec-erp
pause
