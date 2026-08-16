@echo off
TITLE ERP Local Server Uninstaller
echo ========================================================
echo Uninstalling ERP Server Setup from this PC...
echo ========================================================

:: 1. Remove Windows Auto-Start Task
schtasks /Delete /TN "ERPServerAutoStart" /F >nul 2>&1
echo [1/3] Removed Windows Auto-Start Scheduled Task.

:: 2. Terminate any running Node backend processes
taskkill /FI "WINDOWTITLE eq ERP Server*" /F >nul 2>&1
echo [2/3] Stopped running ERP server background processes.

:: 3. Database Retention Prompt
echo.
echo [3/3] Server setup uninstalled successfully!
echo Note: Your database file at backend\prisma\dev.db was PRESERVED safely.
echo If you wish to permanently delete all data, you can delete the dev.db file manually.
echo ========================================================

pause
