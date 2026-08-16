@echo off
title GEC ERP - Factory Server Launcher
cls
echo =========================================================================
echo                    GEC ERP CENTRAL FACTORY SERVER
echo =========================================================================
echo.
echo Starting GEC Moulding Machines Backend Server on Host PC...
echo.
cd /d "%~dp0"
node src/server.js
pause
