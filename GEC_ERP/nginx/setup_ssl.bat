@echo off
setlocal enabledelayedexpansion
title GEC ERP - SSL Certificate Setup Wizard for erpdev.manavkalola.xyz

echo ====================================================================
echo  GEC ERP - SSL Certificate Generator & Certbot Setup
echo  Domain: erpdev.manavkalola.xyz
echo ====================================================================
echo.

if not exist "D:\ERP\GEC_ERP\nginx\ssl" (
    mkdir "D:\ERP\GEC_ERP\nginx\ssl"
)

if not exist "D:\ERP\GEC_ERP\nginx\certbot_webroot" (
    mkdir "D:\ERP\GEC_ERP\nginx\certbot_webroot"
)

echo Select SSL Generation Mode:
echo [1] Automatic Free Production SSL via Certbot (Let's Encrypt)
echo [2] Generate Local / Development SSL Certificate (Self-Signed)
echo.
set /p mode="Enter choice [1 or 2]: "

if "%mode%"=="1" (
    echo.
    echo ----------------------------------------------------------------
    echo  Setting up Let's Encrypt SSL via Certbot...
    echo  Requirement: Router must forward Port 80 and 443 to this PC!
    echo ----------------------------------------------------------------
    
    where certbot >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] Certbot is not installed or not in system PATH.
        echo Please install Certbot from: https://certbot.eff.org/instructions?ws=other^&os=windows
        echo Or choose Option [2] to generate temporary SSL certs.
        pause
        exit /b 1
    )

    certbot certonly --webroot -w D:\ERP\GEC_ERP\nginx\certbot_webroot -d erpdev.manavkalola.xyz -d erp.manavkalola.xyz
    
    echo Copying certificates to nginx/ssl folder...
    copy /y "C:\Certbot\live\erpdev.manavkalola.xyz\fullchain.pem" "D:\ERP\GEC_ERP\nginx\ssl\fullchain.pem"
    copy /y "C:\Certbot\live\erpdev.manavkalola.xyz\privkey.pem" "D:\ERP\GEC_ERP\nginx\ssl\privkey.pem"
    
    echo.
    echo [SUCCESS] Let's Encrypt SSL certificates installed successfully!
) else (
    echo.
    echo ----------------------------------------------------------------
    echo  Generating OpenSSL Development Certificate...
    echo ----------------------------------------------------------------
    
    powershell -Command "New-SelfSignedCertificate -DnsName 'erpdev.manavkalola.xyz', 'erp.manavkalola.xyz', 'localhost' -CertStoreLocation 'cert:\LocalMachine\My' -NotAfter (Get-Date).AddYears(5) | Out-Null"
    
    openssl req -x509 -nodes -days 1825 -newkey rsa:2048 -keyout "D:\ERP\GEC_ERP\nginx\ssl\privkey.pem" -out "D:\ERP\GEC_ERP\nginx\ssl\fullchain.pem" -subj "/CN=erpdev.manavkalola.xyz/O=GEC ERP/C=IN"
    
    if %errorlevel% equ 0 (
        echo [SUCCESS] SSL Certificate and Private Key generated at nginx/ssl/
    ) else (
        echo [NOTE] OpenSSL CLI not in PATH. Generating via PowerShell script...
        powershell -Command "$cert = New-SelfSignedCertificate -DnsName 'erpdev.manavkalola.xyz','localhost' -CertStoreLocation 'Cert:\CurrentUser\My'; Export-Certificate -Cert $cert -FilePath 'D:\ERP\GEC_ERP\nginx\ssl\fullchain.pem'"
    )
)

echo.
echo ====================================================================
echo  SSL Setup Complete! You can now start Nginx with: start_nginx.bat
echo ====================================================================
pause
