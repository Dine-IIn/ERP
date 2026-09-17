# 🔒 GEC ERP - Nginx SSL Reverse Proxy Guide

This folder contains the complete production Nginx reverse proxy configuration for GEC ERP to serve `https://erpdev.manavkalola.xyz` with SSL termination, modern TLS 1.3 ciphers, 50MB payload limits, and automatic HTTP-to-HTTPS redirect.

---

## 📋 3-Step Setup Instructions

### Step 1: Install Nginx for Windows
1. Download **Nginx for Windows** from [nginx.org/en/download.html](https://nginx.org/en/download.html) (Mainline or Stable zip).
2. Extract the zip to `C:\nginx` (or anywhere on your machine).
3. Add `C:\nginx` to your Windows System Environment Variable `PATH` (or copy `nginx.exe` and `conf/mime.types` into this `nginx/` folder).

---

### Step 2: Router Port Forwarding
1. Log in to your Wi-Fi router admin page (`http://192.168.1.1`).
2. Go to **Port Forwarding / Virtual Server / NAT**.
3. Create two port forwarding rules pointing to your computer's local IP (`192.168.1.88`):
   - **Port 80 (HTTP)**: External Port `80` $\rightarrow$ `192.168.1.88:80` (Protocol: TCP)
   - **Port 443 (HTTPS)**: External Port `443` $\rightarrow$ `192.168.1.88:443` (Protocol: TCP)
4. Allow Ports 80 & 443 in Windows Defender Firewall (run in Admin PowerShell):
   ```powershell
   New-NetFirewallRule -DisplayName "GEC ERP HTTP (Port 80)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
   New-NetFirewallRule -DisplayName "GEC ERP HTTPS (Port 443)" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
   ```

---

### Step 3: Generate SSL Certificates
Run the automated batch script:
```cmd
nginx\setup_ssl.bat
```
- **Option 1**: Uses Certbot (Let's Encrypt) to issue trusted, verified SSL certificates for `erpdev.manavkalola.xyz`.
- **Option 2**: Generates a 5-year self-signed development certificate for testing.

---

### Step 4: Start Nginx
Double-click:
```cmd
nginx\start_nginx.bat
```
- Test config & hot-reload: `nginx\reload_nginx.bat`
- Stop Nginx: `nginx\stop_nginx.bat`

---

## 📱 Mobile App Connection
Once Nginx is running:
- Open the mobile app.
- The app connects to `https://erpdev.manavkalola.xyz`.
- Server status will show **🟢 Server: ONLINE (SSL Secured)**.
