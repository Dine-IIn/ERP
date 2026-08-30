# GEC Moulding Machine ERP System 🏭

A high-performance Enterprise Resource Planning (ERP) platform built for **GEC (Plastic Injection & Moulding Machine Manufacturers)**, supporting **Windows Desktop (Tauri .exe)**, **Android Mobile (Capacitor .apk/.aab)**, and **Web Browser**.

---

## 🏛️ System Architecture

This project is structured as a clean dual-workspace monorepo (matching the Manual ERP architecture):

```
GEC_ERP/
├── pnpm-workspace.yaml            # Monorepo configuration
├── package.json                   # Root orchestrator scripts
├── ecosystem.config.json          # PM2 Production Process Manager Config
│
├── frontend/                      # 🖥️ Web / Desktop / Android Client
│   ├── src/                       # React 18 + TypeScript + Modern CSS
│   ├── src-tauri/                 # 🦀 Tauri Native Desktop Layer (Builds .exe)
│   ├── capacitor.config.json      # 📱 Capacitor Android Config (Builds .apk/.aab)
│   ├── .env                       # Frontend Environment Variables
│   ├── .env.example               # Frontend Config Template
│   ├── vite.config.ts             # Vite Bundler
│   ├── tsconfig.json              # TypeScript Rules
│   └── package.json               # Client dependencies & native build scripts
│
├── backend/                       # 🐘 Central PostgreSQL & Express Server
│   ├── src/                       # Express server, DB connections & audit logs
│   ├── .env                       # Database, Storage & Backup Configuration
│   ├── .env.example               # Backend Config Template
│   └── package.json               # Server scripts & dependencies
│
├── storage/                       # 💾 Local document & master file storage
└── backups/                       # 📦 Automated PostgreSQL database backups
```

---

## 🔐 Default Credentials (Clean Production Slate)

* **Super Admin User:** `admin`
* **Password:** `password`
* *All demo items, BOMs, SOs, WOs, POs, and GRNs have been cleared for clean enterprise data entry.*

---

## 🦀 1. Building Windows Desktop Application (.exe via Tauri)

The desktop application is built with **Tauri v2** for lightweight, memory-efficient native execution on Windows.

### Prerequisites (One-Time Setup)
1. **Rust & Cargo:** Install from [rustup.rs](https://rustup.rs/)
2. **Visual Studio C++ Build Tools:** Install "Desktop development with C++" workload from Visual Studio Installer.
3. **Node.js:** v18+ with `pnpm` (`corepack enable`)

### Running in Desktop Development Mode
```powershell
corepack pnpm tauri:dev
```
*This launches the Vite dev server and opens a native Tauri desktop window with hot-reloading.*

### Building Standalone Production Desktop Executable (.exe / .msi)
```powershell
corepack pnpm tauri:build
```

#### 📦 Output Artifacts:
Once the build finishes, the standalone installer and executable will be available at:
* **Installer (.msi):** `frontend/src-tauri/target/release/bundle/msi/`
* **Standalone Executable (.exe):** `frontend/src-tauri/target/release/gec-erp.exe`
* **NSIS Setup (.exe):** `frontend/src-tauri/target/release/bundle/nsis/`

---

## 📱 2. Building Android Application (.apk / .aab via Capacitor)

The mobile application is packaged using **Capacitor**.

### Prerequisites
* **Android Studio** with Android SDK (API 33+) and Command-line Tools installed.

### Steps to Build APK / AAB:
1. **Initialize Android Project (First Time Only):**
   ```powershell
   corepack pnpm cap:android
   ```

2. **Build Web App & Sync to Android:**
   ```powershell
   corepack pnpm cap:sync
   ```

3. **Open Project in Android Studio:**
   ```powershell
   corepack pnpm cap:open
   ```

4. **Generate APK / AAB in Android Studio:**
   * Go to **Build** $\rightarrow$ **Build Bundle(s) / APK(s)** $\rightarrow$ **Build APK(s)**.
   * The debug/release `.apk` will be in `frontend/android/app/build/outputs/apk/`.

---

## 🌐 3. Running Web View (Local Server & Client)

### 1. Start the Central Backend Server (Terminal 1)
```powershell
corepack pnpm server
# Runs: node backend/src/server.js on http://localhost:5000
```

### 2. Start the Frontend Dev Server (Terminal 2)
```powershell
corepack pnpm dev
# Runs: vite on http://localhost:5173
```

Open **`http://localhost:5173`** in your browser and sign in with `admin` / `password`.

---

## ⚙️ 4. Environment Variables Configuration (.env)

### Frontend (`frontend/.env`)
```env
# Central Backend API Endpoint
VITE_API_BASE_URL=http://localhost:5000

# Application Identity
VITE_APP_NAME="GEC Moulding Machine ERP"
VITE_APP_ENV=development
VITE_APP_VERSION=1.0.0

# Session & Security Settings
VITE_SESSION_TIMEOUT_MINUTES=15
VITE_MOBILE_SESSION_TIMEOUT_DAYS=30
VITE_ENABLE_OFFLINE_SYNC=true
```

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development

# PostgreSQL Enterprise Database
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=gec_erp

# Local Storage & Auto-Backup
STORAGE_DIR=D:/ERP/GEC_ERP/storage
BACKUP_DIR=D:/ERP/GEC_ERP/backups
AUTO_BACKUP_CYCLE_HOURS=48
BACKUP_RETENTION_DAYS=0

# Security & CORS
CORS_ORIGIN=*
SUPERADMIN_MASTER_KEY=GEC_SuperAdmin#2026!Secured$
JWT_SECRET=gec_moulding_machine_enterprise_secret_key_2026
```

---

## 📋 Available Root Scripts Summary

| Command | Action |
| :--- | :--- |
| `corepack pnpm dev` | Starts Vite frontend dev server (`http://localhost:5173`) |
| `corepack pnpm server` | Starts Express backend server (`http://localhost:5000`) |
| `corepack pnpm build` | Builds production-optimized web assets into `frontend/dist/` |
| `corepack pnpm tauri:dev` | Runs native Desktop application in live development mode |
| `corepack pnpm tauri:build` | Compiles native Windows Desktop installer & `.exe` |
| `corepack pnpm cap:sync` | Builds web assets and synchronizes with Android project |
| `corepack pnpm cap:open` | Opens Android Studio for APK / AAB compilation |
