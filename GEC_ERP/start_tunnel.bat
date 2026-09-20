@echo off
title GEC ERP Remote Cloudflare Tunnel (https://erp.manavkalola.xyz)
color 0B
echo ====================================================================
echo             🌐 GEC ERP REMOTE ACCESS CLOUDFLARE TUNNEL
echo             Routing: https://erp.manavkalola.xyz -^> Port 5000
echo ====================================================================
echo.

cd /d "%~dp0"

if not exist "cloudflared.exe" (
    echo [ERROR] cloudflared.exe not found in this folder!
    pause
    exit /b
)

set "TOKEN=eyJhIjogIjM3NzczM2VjZTE3Yjc1OWM0ZDE4MmQyZDk3N2MwM2NmIiwgInQiOiAiNzE4OWMwMzItYTQyNi00N2Q1LTllMmQtZmQ2NjAwYzgxNWQ4IiwgInMiOiAialorZXovRWRoYW5pcE1ZL1M4TGpGRnlKR3E3cnhCbTBIb01uZThMc2QwQT0ifQ=="

echo Starting Cloudflare Tunnel with Token...
cloudflared.exe tunnel run --token %TOKEN%
pause
