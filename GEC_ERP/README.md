# GEC Moulding Machine ERP System 🏭

A high-performance, enterprise-grade Enterprise Resource Planning (ERP) platform custom-engineered for **GEC (Plastic Injection & Moulding Machine Manufacturers)**. The platform supports **Windows Desktop (Tauri .exe / .msi)**, **Android Mobile (Capacitor .apk / .aab)**, and **Web Browser Clients**, with LAN-First Priority, Cloud Failover, Zero-Disruption Updates, and Strict A4 Print Standards.

---

## 🏛️ Monorepo Structure & Architecture

```
GEC_ERP/
├── pnpm-workspace.yaml            # Monorepo workspace configuration
├── package.json                   # Root orchestrator scripts
├── ecosystem.config.json          # PM2 Production Process Manager Config
├── nginx.conf                     # Production Nginx Reverse Proxy with SSL
├── build_desktop.py               # Automated Tauri Windows Desktop Builder (.exe / .msi)
├── build_android.py               # Automated Capacitor Android App Builder (.apk)
│
├── frontend/                      # 🖥️ Web / Desktop / Android Client
│   ├── src/                       # React 18 + TypeScript + Modern Enterprise UI
│   │   ├── components/
│   │   │   ├── modules/           # ERP Core Modules (Planning, Shortage, Issue, Assembly, etc.)
│   │   │   ├── printTemplates/    # Standardized A4 Print & PDF Templates
│   │   │   ├── common/            # Shared Modals (UpdateEnforcementModal, PrintManagerModal)
│   │   │   └── layout/            # Navigation, Header (SuperAdmin Server Settings)
│   │   ├── services/
│   │   │   ├── apiClient.ts       # LAN-First Smart Dual Probe Engine (<1.8s fallback)
│   │   │   └── updaterService.ts  # Client Heartbeat & Mandatory Update Poller
│   │   ├── types/erp.ts           # Centralized TypeScript Type Definitions
│   │   └── context/ERPContext.tsx # Centralized State, Audit Logging & Offline Sync
│   ├── src-tauri/                 # 🦀 Tauri Native Desktop Layer (Builds .exe / .msi)
│   ├── capacitor.config.json      # 📱 Capacitor Android Config (Builds .apk / .aab)
│   ├── .env                       # Frontend Environment Variables (API URLs, etc.)
│   └── vite.config.ts             # Vite Bundler
│
├── backend/                       # 🐘 Central Node.js + PostgreSQL Server
│   ├── src/
│   │   ├── server.js              # Central Express API server & routes
│   │   ├── sessionManager.js      # Active user session tracker & auto-drain guard
│   │   ├── updater.js             # Automated Zero-Disruption Private GitHub Updater
│   │   └── serverManager.js       # Interactive Server Setup & Safe Uninstaller
│   ├── .env                       # Database, GitHub Auth & Storage Configuration
│   └── package.json               # Server scripts & dependencies
│
├── storage/                       # 💾 Local document & master file storage
└── backups/                       # 📦 Automated PostgreSQL database backups
```

---

## 🌐 1. Domain & DNS Setup Guide (Own Domain without Third-Party Free Tiers)

You can host the central server inside your factory or on a dedicated machine with an internet connection, and connect your own domain (e.g. `erp.yourcompany.com` or `erp.xyz.com`).

### Step 1: Configure DNS Records at Your Domain Provider (GoDaddy / Namecheap / Hostinger / Cloudflare Registrar)
1. Log into your domain management console (e.g. GoDaddy, Namecheap, Hostinger, BigRock).
2. Go to **DNS Management / DNS Zone Editor**.
3. Add a new **A Record**:
   - **Type:** `A`
   - **Host / Name:** `erp` (or `@` if using root domain)
   - **Points to / Value:** `<Your_Public_IP_Address>` *(e.g. `103.21.54.89`)*
   - **TTL:** `1/2 Hour` or `Automatic`
4. *(Optional Dynamic IP)*: If your factory ISP gives dynamic public IP, configure DDNS (Dynamic DNS) client on your router or server.

---

### Step 2: Configure Factory Router Port Forwarding
1. Open your factory router admin panel (usually `192.168.1.1` or `192.168.0.1`).
2. Navigate to **Port Forwarding / Virtual Server / NAT Forwarding**.
3. Forward external ports to your Server PC's static LAN IP (e.g. `192.168.1.100`):
   - **Port 80 (HTTP)** $\rightarrow$ `192.168.1.100:80`
   - **Port 443 (HTTPS)** $\rightarrow$ `192.168.1.100:443`
   - *(Optional direct API port)*: **Port 5000** $\rightarrow$ `192.168.1.100:5000`
4. Save and apply router changes.

---

### Step 3: Production Nginx Reverse Proxy with Free SSL (Let's Encrypt / Certbot)
Use the included `nginx.conf` template:

```nginx
server {
    listen 80;
    server_name erp.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/erp.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourcompany.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Static Distribution
    location / {
        root /var/www/gec_erp/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Central Backend API & WebSocket
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

To generate free Let's Encrypt certificates on Linux or Windows:
```bash
# On Linux (Ubuntu / Debian):
sudo certbot --nginx -d erp.yourcompany.com

# On Windows (Certify The Web or win-acme):
wacs.exe --target manual --host erp.yourcompany.com
```

---

## ⚡ 2. LAN-First Priority & Hybrid Dual-Endpoint Connectivity

The system features an intelligent dual-probe client engine:
* **Inside Factory (LAN):** All client PCs and Android tablets connect to the server via local Wi-Fi / Ethernet at ultra-low latency (<5ms), **even if the internet is completely down**.
* **Outside Factory (Remote/Cloud):** Field engineers, directors, and remote users connect via `https://erp.yourcompany.com`.
* **Automatic Probe (<1.8s):** When the app launches, it probes the LAN endpoint (`http://192.168.1.100:5000/api/health`). If reachable within 1800ms, it locks to LAN mode. If not, it falls back to the public cloud URL.

### Configuring Environment Variables

#### `frontend/.env`:
```env
# LAN Direct Endpoint (Prioritized inside factory)
VITE_API_LAN_URL=http://192.168.1.100:5000

# Public Cloud / Domain Endpoint (Fallback outside factory)
VITE_API_CLOUD_URL=https://erp.yourcompany.com

# Fallback default
VITE_API_BASE_URL=http://192.168.1.100:5000
```

#### 🛡️ In-App UI Override (SuperAdmin Only):
Standard users cannot modify server endpoints. The **Server Settings Modal** in the top navigation bar is strictly restricted to `SuperAdmin`. SuperAdmin can dynamically switch between Auto, Force LAN, or Force Cloud directly from the UI without recompiling.

---

## 🔄 3. Automated Zero-Disruption Update Engine (Private GitHub Repo)

Deploy updates to production servers and all client apps without manual server installations or breaking ongoing work sessions.

```
       Developer commits to Private GitHub Repo
                         │
                         ▼
       Server Update Engine (`backend/src/updater.js`)
       • Polls GitHub Releases every 5 minutes
       • Detects new version & stages update files
                         │
                         ▼
       Session Drain Watcher (`backend/src/sessionManager.js`)
       • Heartbeats monitor active user sessions (30s)
       • Active sessions > 0  ──>  HOLD UPDATE (No interruption)
       • Active sessions = 0  ──>  EXECUTE SAFE UPDATE
                         │
                         ▼
       PM2 Non-Disruptive Zero-Downtime Reload (`pm2 reload gec-erp-backend`)
                         │
                         ▼
       Frontend Client Mandatory Update Enforcement Modal
       • On next user login: Displays release popup with [ OK ]
       • Clicking [ OK ] purges cache and loads latest build
```

### Setting up Private GitHub Repo Authentication
To allow the server to securely pull updates from a private repository without exposing passwords:

#### Method A: GitHub Personal Access Token (PAT) - Recommended
1. On GitHub, go to **Settings** $\rightarrow$ **Developer Settings** $\rightarrow$ **Personal Access Tokens** $\rightarrow$ **Fine-grained tokens**.
2. Create token with `Contents: Read-only` permission on your `ERP` repository.
3. In `backend/.env`, set:
   ```env
   GITHUB_REPO_OWNER=YourOrganization
   GITHUB_REPO_NAME=GEC_ERP
   GITHUB_TOKEN=github_pat_11ABCD123456789...
   AUTO_UPDATE_ENABLED=true
   AUTO_UPDATE_CHECK_INTERVAL_MINUTES=5
   ```

#### Method B: GitHub SSH Deploy Key
1. Generate SSH key on server:
   ```bash
   ssh-keygen -t ed25519 -C "gec-erp-server"
   ```
2. Add public key (`id_ed25519.pub`) into GitHub Repository $\rightarrow$ **Settings** $\rightarrow$ **Deploy Keys** (Read-only).
3. Clone using SSH (`git clone git@github.com:YourOrg/GEC_ERP.git`).

---

## 🖨️ 4. Standardized A4 Print & PDF Orientation Guidelines

All print layouts across the system are custom-engineered for **A4 Paper standard** with precise CSS page-break rules, avoidance of broken table rows (`page-break-inside: avoid`), and company letterhead signatories.

| Document / Report | A4 Orientation | Module Location | Purpose |
| :--- | :--- | :--- | :--- |
| **Purchase Order (PO)** | **Portrait (Vertical)** | `PurchaseOrdersModule.tsx` | Vendor procurement contract with GST, terms & signatories. |
| **Work Order (WO)** | **Portrait (Vertical)** | `WorkOrdersModule.tsx` | Production authorization & machine specification sheet. |
| **Job Cards (In-House)** | **Portrait (Vertical)** | `JobCardsModule.tsx` | Floor routing card with operation sequence & signoffs. |
| **Sales Order (SO)** | **Portrait (Vertical)** | `SalesOrdersModule.tsx` | Customer confirmation & commercial invoice memo. |
| **Goods Receipt Note (GRN)** | **Portrait (Vertical)** | `GoodsReceivedModule.tsx` | Store incoming inspection & inward inventory voucher. |
| **Quality Inspection (QC)** | **Portrait (Vertical)** | `QualityControlModule.tsx` | QC approval & dimension verification record. |
| **Material Issue Slip** | **Portrait (Vertical)** | `MaterialIssueModule.tsx` | Authorized store component issue voucher for WO/JC. |
| **Material Re-Issue Slip** | **Portrait (Vertical)** | `MaterialIssueModule.tsx` | Scrap / rework replacement material issue memo. |
| **Delivery Challan & Gate Pass** | **Portrait (Vertical)** | `DispatchModule.tsx` | Finished goods transport authorization & gate pass. |
| **Master Directories** | **Portrait (Vertical)** | Items / Vendors / Customers | Single-page item and contact directories. |
| **Shopfloor Planning Matrix** | **Landscape (Horizontal)**| `PlanningModule.tsx` | Multi-machine schedule & component demand matrix. |
| **Item-Wise Shortage Matrix** | **Landscape (Horizontal)**| `ShortageModule.tsx` | Consolidated shortage vs store stock vs open POs. |
| **Work Order Shortage Tree** | **Landscape (Horizontal)**| `ShortageModule.tsx` | Multi-level BOM shortage tree with buildable capacity. |
| **Assembly Line Floor Log** | **Landscape (Horizontal)**| `AssemblyModule.tsx` | Multi-stage assembly milestone tracker (Mechanical/Electrical). |
| **Security Audit Trail Log** | **Landscape (Horizontal)**| `UserManagementModule.tsx`| Forensic user activity log with IP & timestamp trail. |

---

## 🏆 5. Industrial Standards Benchmark Report (Vibe Coder vs Industrial Tier)

This comparison highlights the architectural transformations made to bring GEC ERP to the rigorous standards of Tier-1 software engineering teams (Oracle, TCS, Google, SAP):

```
┌─────────────────────────┬───────────────────────────────────┬──────────────────────────────────────┐
│ DIMENSION               │ TYPICAL VIBE-CODER PATTERN        │ GEC ERP INDUSTRIAL STANDARD TIER     │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────┤
│ 1. Concurrency & State  │ Blind `setState` overwriting      │ Optimistic Concurrency Control (OCC) │
│    Integrity            │ records without version checks.   │ with row `version` stamps & rollback │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────┤
│ 2. Inventory Math &     │ Front-end arithmetic; races when  │ Atomic single-transaction deductions │
│    Stock Deductions     │ multiple operators issue parts.   │ with store reconciliation & journals │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────┤
│ 3. Connectivity &       │ Hardcoded localhost or breaks     │ Smart Dual-Probe Engine (LAN-first   │
│    Failover             │ when internet fails.              │ <1.8s + Cloud domain failover)       │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────┤
│ 4. Deployment & Updates │ Manual setup.exe reinstalls;      │ Zero-Disruption Session Drain Engine │
│                         │ crashes active users on update.   │ with PM2 reload & client auto-update │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────┤
│ 5. Security & RBAC      │ Basic client-side hide/show;      │ Multi-Tier RBAC + Master Key guard + │
│                         │ vulnerable to console tampering.  │ tamper-proof forensic audit logging  │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────┤
│ 6. Print & Reporting    │ Generic `window.print()` with     │ Precision A4 Portrait / Landscape    │
│                         │ cut-off tables and messy headers. │ Print Templates with PDF pagination  │
├─────────────────────────┼───────────────────────────────────┼──────────────────────────────────────┤
│ 7. Cross-Platform Native│ Web-only or heavy Electron        │ Ultra-lightweight Tauri v2 (.exe)    │
│    Footprint            │ (250MB+ RAM).                     │ (<40MB RAM) + Capacitor Native APK   │
└─────────────────────────┴───────────────────────────────────┴──────────────────────────────────────┘
```

---

## 🛠️ 6. Quick Build & Run Commands

```powershell
# 1. Install all dependencies across monorepo
corepack pnpm install

# 2. Run Frontend in Development Mode (Vite)
corepack pnpm dev

# 3. Run Central Server in Development Mode
corepack pnpm server

# 4. Compile Production Web Bundle
corepack pnpm build

# 5. Build Native Windows Desktop Installer (.exe / .msi)
python build_desktop.py

# 6. Build Native Android Mobile Package (.apk)
python build_android.py

# 7. Start Interactive Server Setup & Safe Uninstaller
corepack pnpm server:manage
```

---

## 📄 License & Intellectual Property
Proprietary Enterprise Software built for **GEC (Plastic Injection & Moulding Machines)**. All rights reserved.



superadmin = GEC_SuperAdmin#2026!Secured$