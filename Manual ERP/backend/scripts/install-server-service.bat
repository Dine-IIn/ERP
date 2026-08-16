@echo off
TITLE ERP Local Server Auto-Start Installer
echo ========================================================
echo Installing ERP Server Auto-Start Windows Scheduled Task...
echo ========================================================

:: Register Windows Scheduled Task to run server-runner.vbs on System Boot
schtasks /Create /TN "ERPServerAutoStart" /TR "wscript.exe \"d:\ERP\Manual ERP\backend\scripts\server-runner.vbs\"" /SC ONSTART /RU "SYSTEM" /F

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] ERP Local Server is now configured to start automatically on Windows Boot!
    echo It will start automatically after power cuts or PC restarts.
) else (
    echo.
    echo [NOTE] Admin privileges may be required. Trying user logon trigger...
    schtasks /Create /TN "ERPServerAutoStart" /TR "wscript.exe \"d:\ERP\Manual ERP\backend\scripts\server-runner.vbs\"" /SC ONLOGON /F
)

pause
