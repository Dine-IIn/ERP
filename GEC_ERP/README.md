# GEC Moulding Machine ERP System 🏭

A high-performance, enterprise-grade Enterprise Resource Planning (ERP) platform custom-engineered for **GEC (Plastic Injection & Moulding Machine Manufacturers)**. The platform supports **Windows Desktop (Tauri .exe / .msi)**, **Android Mobile (Capacitor .apk / .aab)**, and **Web Browser Clients**, all connected to a central PostgreSQL database.

---

## 🏛️ System Architecture

```
GEC_ERP/
├── pnpm-workspace.yaml            # Monorepo workspace configuration
├── package.json                   # Root orchestrator scripts
├── ecosystem.config.json          # PM2 Production Process Manager Config
│
├── frontend/                      # 🖥️ Web / Desktop / Android Client
│   ├── src/                       # React 18 + TypeScript + Modern Enterprise UI
│   ├── src-tauri/                 # 🦀 Tauri Native Desktop Layer (Builds .exe / .msi)
│   ├── capacitor.config.json      # 📱 Capacitor Android Config (Builds .apk / .aab)
│   ├── .env                       # Frontend Environment Variables (API URL, etc.)
│   ├── .env.example               # Frontend Configuration Template
│   ├── vite.config.ts             # Vite Bundler
│   ├── tsconfig.json              # TypeScript Rules
│   └── package.json               # Client dependencies & native build scripts
│
├── backend/                       # 🐘 Central PostgreSQL & Express Server
│   ├── src/                       # Express server, DB connections & server manager
│   │   ├── server.js              # Central API server
│   │   └── serverManager.js       # Interactive Server Setup & Safe Uninstaller
│   ├── .env                       # Database, Storage & Backup Configuration
│   ├── .env.example               # Backend Configuration Template
│   └── package.json               # Server scripts & dependencies
│
├── storage/                       # 💾 Local document & master file storage
└── backups/                       # 📦 Automated PostgreSQL database backups
```

---

## 🔐 1. Admin & Super Admin Credentials

The system implements a hardened dual-tier administrative security model:

| Role | Username | Password | Master Key / Access Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `password` | `SUPERADMIN_MASTER_KEY`: `GEC_SuperAdmin#2026!Secured$` | Full root authority: module control, database reset, system configuration, audit logs. |
| **Standard Admin** | Configurable | Configurable | Role-based permissions | Operational manager with access to daily ERP workflows. |

### 🛡️ Super Admin Protection Rules
* **Hidden from Standard Views:** The built-in `SUPERADMIN` / root administrator account is protected and completely hidden from the standard User Master list.
* **Tamper-Proof:** Standard administrators or regular users cannot view, edit, reassign, or delete the Super Admin profile.
* **Operational Reset:** Super Admin can execute "Reset Operational Data" without wiping Item Master, BOMs, Vendors, Customers, or Admin accounts.

---

## 🦀 2. Building Windows Desktop Application (`.exe` / `.msi` via Tauri)

The desktop application uses **Tauri v2** for near-instant startup and minimal memory footprint (~40 MB RAM).

### Prerequisites (One-Time Setup)
1. **Node.js:** v18+ with `pnpm` (`corepack enable`).
2. **Rust & Cargo:** Install from [rustup.rs](https://rustup.rs/).
3. **C++ Build Tools:** Install "Desktop development with C++" workload via the [Visual Studio Installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/).

### Desktop Development Mode
```powershell
corepack pnpm tauri:dev
```
*Launches the Vite dev server and opens a native Tauri desktop window with hot-reloading.*

### Building Standalone Production Desktop Executable (`.exe` / `.msi`)
```powershell
corepack pnpm tauri:build
```

#### 📦 Output Artifacts:
* **Standalone Executable (.exe):** `frontend/src-tauri/target/release/gec-erp.exe`
* **Windows Installer (.msi):** `frontend/src-tauri/target/release/bundle/msi/`
* **NSIS Setup (.exe):** `frontend/src-tauri/target/release/bundle/nsis/`

---

## 📱 3. Building Android Application (`.apk` / `.aab` via Capacitor)

The mobile application is packaged using **Capacitor**, providing seamless barcode scanning, camera capture, and responsive touch UI.

### Prerequisites
* **Android Studio** (Hedgehog / Iguana or newer) with Android SDK (API 33+) and Command-line Tools installed.
* **Java Development Kit (JDK):** JDK 17 or newer.

### Steps to Build APK / AAB:
1. **Sync Web Assets to Android Project:**
   ```powershell
   corepack pnpm cap:sync
   ```

2. **Open Project in Android Studio:**
   ```powershell
   corepack pnpm cap:open
   ```

3. **Generate APK / AAB:**
   * In Android Studio, select **Build** $\rightarrow$ **Build Bundle(s) / APK(s)** $\rightarrow$ **Build APK(s)** (or **Generate Signed Bundle / APK** for release).
   * **Debug APK Location:** `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
   * **Release AAB Location:** `frontend/android/app/build/outputs/bundle/release/app-release.aab`

---

## ⚙️ 4. Server Setup, Management & Safe Uninstallation

The backend features an interactive server manager (`serverManager.js` / `server.exe`) that isolates configuration, services, and dedicated data storage.

### Running the Server Manager
```powershell
corepack pnpm server:manage
```

### First-Time Interactive Setup:
When run for the first time, the wizard prompts for:
1. **Server Port** (Default: `5000`)
2. **Dedicated Database & Backup Directory** (e.g. `D:\GEC_ERP_DATA` or `C:\GEC_ERP_DATA`)
3. **PostgreSQL Credentials** (Host, Port, User, Password, Database Name)
4. Automatically generates backend `.env` and `server-config.json`.

### Subsequent Run Menu:
```
============================================================
           GEC ERP - CENTRAL SERVER MANAGER
============================================================
 [1] Start Central Server
 [2] Reconfigure Server Settings
 [3] Uninstall Server (Safe Uninstall - Keeps Database Intact)
 [4] Exit
============================================================
```

### 🛡️ Safe Uninstallation Architecture:
* **Option `[3] Uninstall Server`** stops any running server instance and cleans up server binaries and configuration files.
* **Zero Data Loss Guarantee:** It **strictly preserves the dedicated data directory** (`D:\GEC_ERP_DATA\storage` and `...\backups`) and PostgreSQL database tables. Reinstalling or pointing a new server instance to that directory restores all files and data instantly!

### Packaging into Standalone `server.exe` (Optional):
You can package the Node.js server into a single portable Windows `.exe` using `@yao-pkg/pkg`:
```powershell
# Install packager
npm install -g @yao-pkg/pkg

# Package backend server manager into server.exe
cd backend
pkg src/serverManager.js --targets node18-win-x64 --output ../server.exe
```

---

## 🌍 5. Real-World Production & Worldwide Remote Access Guide

You can access GEC ERP from **anywhere in the world** across any internet provider (Jio, Airtel, Vodafone, Starlink, Fiber, etc.) on Android smartphones, Windows laptops, and web browsers.

```
       📱 Android App (Anywhere via 4G/5G)
       💻 Windows Desktop (.exe at Home/Branch)
       🌐 Web Browser (Remote Office)
                       │
                       ▼  HTTPS / Secure Request
       ┌────────────────────────────────────────┐
       │   Public Domain / Cloudflare Tunnel    │
       │     (e.g., https://erp.gec.com)        │
       └───────────────────┬────────────────────┘
                           │
                           ▼
       ┌────────────────────────────────────────┐
       │   Central Backend Server & PostgreSQL  │
       │   (Cloud VPS or Factory Server PC)     │
       └────────────────────────────────────────┘
```

### 🚀 Production Deployment Options:

### Option A: Cloud VPS Deployment (24/7 Uptime - Recommended for Zero Downtime)
Deploy the central backend and PostgreSQL on a cloud server (DigitalOcean, AWS EC2, Hetzner, or Azure):
1. **Provision a Linux/Windows VPS** (e.g., Ubuntu 22.04 LTS / Windows Server).
2. **Install PostgreSQL and Node.js.**
3. **Point your domain** (e.g. `erp.gecmachines.com`) to the VPS Public IP.
4. **Setup Nginx Reverse Proxy with Free SSL (Let's Encrypt / Certbot):**
   ```nginx
   server {
       server_name erp.gecmachines.com;
       location /api/ {
           proxy_pass http://localhost:5000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
5. Set `VITE_API_BASE_URL=https://erp.gecmachines.com/api` in `frontend/.env`.

---

### Option B: Cloudflare Zero-Trust Tunnel (Best for On-Premise Factory Server)
Expose your factory server to the worldwide internet **without opening router ports or buying a static IP**:
1. Install Cloudflare `cloudflared` on the factory server PC.
2. Run:
   ```powershell
   cloudflared tunnel create gec-erp-tunnel
   cloudflared tunnel route dns gec-erp-tunnel erp.gecmachines.com
   cloudflared tunnel run --url http://localhost:5000 gec-erp-tunnel
   ```
3. Cloudflare provides free automated SSL and DDoS protection.

---

### Option C: On-Premise Factory Server with Static IP & Router Port Forwarding
1. Request a Static Public IP from your factory ISP.
2. In your factory router settings, forward external **Port 5000 (or 443)** to the local IP of the Server PC (e.g., `192.168.1.100:5000`).
3. Use a Dynamic DNS provider (DDNS like No-IP or DuckDNS) if you do not have a static IP.
4. Set `VITE_API_BASE_URL=http://your-factory-public-ip:5000` in `frontend/.env`.

---

### Option D: Secure Enterprise Mesh VPN (Tailscale / WireGuard)
For high-security private enterprise access without exposing the server to the public internet:
1. Install **Tailscale** on the Server PC, factory desktops, and mobile phones.
2. All devices get a secure internal 100.x.y.z IP.
3. Set `VITE_API_BASE_URL=http://100.x.y.z:5000`.

---

## ⚙️ 6. Environment Variables Reference

### Frontend Configuration (`frontend/.env`)
```env
# Central Backend API Endpoint (Change to your public URL for global access)
VITE_API_BASE_URL=http://localhost:5000

# Application Identity
VITE_APP_NAME="GEC Moulding Machine ERP"
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0

# Security & Session Controls
VITE_SESSION_TIMEOUT_MINUTES=15
VITE_MOBILE_SESSION_TIMEOUT_DAYS=30
VITE_ENABLE_OFFLINE_SYNC=true
```

### Backend Configuration (`backend/.env`)
```env
PORT=5000
NODE_ENV=production

# PostgreSQL Database
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=gec_erp

# Storage & Isolated Backups
STORAGE_DIR=D:/GEC_ERP_DATA/storage
BACKUP_DIR=D:/GEC_ERP_DATA/backups
AUTO_BACKUP_CYCLE_HOURS=48
BACKUP_RETENTION_DAYS=0

# Security & Secrets
CORS_ORIGIN=*?
SUPERADMIN_MASTER_KEY=GEC_SuperAdmin#2026!Secured$
JWT_SECRET=gec_moulding_machine_enterprise_secret_key_2026
```

---

## 📋 7. Available Root Scripts

| Command | Action |
| :--- | :--- |
| `corepack pnpm dev` | Starts Vite frontend dev server (`http://localhost:5173`) |
| `corepack pnpm server` | Starts Express backend server directly (`http://localhost:5000`) |
| `corepack pnpm server:manage` | Opens interactive Server Manager (Start / Configure / Safe Uninstall) |
| `corepack pnpm build` | Compiles production-optimized web assets into `frontend/dist/` |
| `corepack pnpm tauri:dev` | Runs native Windows Desktop app in development mode |
| `corepack pnpm tauri:build` | Compiles native Windows Desktop installer & `.exe` |
| `corepack pnpm cap:sync` | Synchronizes web build with Android native project |
| `corepack pnpm cap:open` | Opens project in Android Studio for `.apk` / `.aab` generation |

---

## 📄 License & Intellectual Property

Proprietary Enterprise Software built for **GEC (Plastic Injection & Moulding Machines)**. All rights reserved.
