@echo off
title GEC ERP - Stop Nginx Server

echo Stopping Nginx...
nginx -s stop -c D:\ERP\GEC_ERP\nginx\nginx.conf
taskkill /F /IM nginx.exe >nul 2>nul

echo [SUCCESS] Nginx stopped.
pause
