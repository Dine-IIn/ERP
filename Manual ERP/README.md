# Enterprise Multi-Tenant SaaS ERP (Dine-IIn / ERP)

Welcome to the **Enterprise Multi-Tenant SaaS ERP** system, structured around a modular monolith architecture with complete multi-environment configuration separation. This guide covers local sandbox testing, desktop/mobile packaging, and full-production deployment on cloud infrastructure.

---

## 📂 Project Directory Structure

```text
Manual ERP/
├── backend/                  # TypeScript & Express Monolith API Server
│   ├── src/
│   │   ├── config/           # Environment-specific configuration manager
│   │   ├── services/         # Licensing verification, background updater loops
│   │   └── index.ts          # Core Express application and WebSocket hooks
│   └── package.json
│
├── frontend/                 # React + Vite 8 Client Dashboard Application
│   ├── src/
│   │   ├── config/           # Dynamic client config singleton
│   │   ├── utils/            # apiService.ts routing fetches via tauri-plugin-http
│   │   └── App.tsx           # Entry React logic, updater modals, settings
│   ├── src-tauri/
│   │   ├── capabilities/     # default.json http fetch permission scopes
│   │   └── tauri.conf.json   # Build targets, icons, auto-updater endpoints
│   └── package.json
│
├── central_services/         # Licensing, Discovery, & Updates Microservice
│   ├── bin/                  # Directory containing update executable binaries
│   ├── src/
│   │   ├── config/           # Dynamic microservice config registry
│   │   └── index.ts          # Express microservice endpoints and static binary router
│   └── package.json
```

---

## ⚡ 1. Local Development Mode

To run a fully isolated local development sandbox without external production endpoints or cloud dependencies:

### Environment Configurations:
- **Central Services (`central_services/.env` or `.env.development`):**
  ```env
  PORT=6001
  NODE_ENV=development
  LATEST_VERSION=1.1.0
  DOWNLOAD_URL=http://localhost:6001/bin/ERPServer-v1.1.0.exe
  RELEASE_NOTES="Local sandbox testing hotfixes."
  LICENSE_SEEDS='[{"licenseKey":"ANB-LIC-2026-DEV","companyCode":"ABC001","status":"ACTIVE"}]'
  DISCOVERY_SEEDS='[{"companyCode":"ABC001","companyName":"ABC Dev Corp","serverUrl":"http://localhost:5000","status":"ACTIVE"}]'
  ```
- **Frontend Client (`frontend/.env` or `.env.development`):**
  ```env
  VITE_API_URL=http://localhost:5000
  VITE_CENTRAL_SERVICES_URL=http://localhost:6001
  VITE_INACTIVITY_TIMEOUT_MINUTES=30
  ```

### Startup Checklist (Run in separate terminal windows):
1. **Central Services:**
   ```bash
   cd central_services
   npm start
   ```
2. **Backend Server:**
   ```bash
   cd backend
   corepack pnpm run dev
   ```
3. **Tauri Desktop Client:**
   ```bash
   cd frontend
   corepack pnpm tauri dev
   ```

---

## 🌐 2. Central Services Setup & Microservices Architecture

Central Services is the core control portal owned by the vendor. Customer data is **never** stored here; it manages licenses, updates, and routing records.

### Endpoints List:
- `POST /api/discovery` - Resolves workspace keys to dedicated database URLs.
- `GET /api/updater/:target/:version` - Serves updater manifests to Tauri clients.
- `GET /bin/:filename` - Serves compiled client/installer zip files statically.
- `POST /license/activate` - Locks activation keys to motherboard fingerprints.
- `POST /license/validate` - Receives heartbeats validating license keys.

### Example Request/Response:
#### Workspace Discovery lookup:
- **Request (`POST /api/discovery`):**
  ```json
  { "companyCode": "ABC001" }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "companyName": "ABC Dev Corp",
    "serverUrl": "http://localhost:5000"
  }
  ```

---

## 🔑 3. Licensing Service & Motherboard Fingerprinting

Licensing validations run as background threads inside customer API monoliths.
1. **Fingerprint Generation:** The backend server queries the operating system components (Registry Cryptography `MachineGuid` and Motherboard UUID `wmic csproduct get uuid`), joins them, and hashes the string using SHA-256.
2. **Heartbeats:** Every 1 hour, the backend monolith transmits this fingerprint along with the license key configured in `config.env` to Central Services (`POST /license/validate`).
3. **Mismatches:** If the fingerprint does not match the initial lock configuration, Central Services returns a `HW_MISMATCH_ERROR` and the backend blocks unauthorized operations.

---

## 📥 4. Auto-Update Service & Tauri Signatures

The Tauri client relies on the official auto-updater plugin to download and execute installers.

### Static File Serving:
All update packages are stored in the `central_services/bin/` folder. Central Services serves this directory statically via:
```typescript
app.use('/bin', express.static(path.join(__dirname, '../bin')));
```
When a client requests `http://localhost:6001/bin/ERPServer-v1.1.0.exe`, it downloads the target installer binary directly.

### Tauri Manifest Schema:
When Tauri queries `/api/updater/:target/:version`, Central Services responds with:
```json
{
  "version": "1.1.0",
  "pub_date": "2026-06-04T12:00:00Z",
  "url": "http://localhost:6001/bin/ERPServer-v1.1.0.exe",
  "signature": "dW51c2VkX3NhbmRib3hfc2lnbmF0dXJlX3BsYWNlaG9sZGVy==",
  "notes": "Performance optimizations, socket stabilization."
}
```

### Rollback / Rollforward Workflow:
- **To Publish an Update:** Place the compiled binary inside `central_services/bin/`, set `LATEST_VERSION` in Central Services' `.env` to the new version (e.g., `1.2.0`), update the download URL, and configure the new signature in `TAURI_UPDATE_SIGNATURE`.
- **To Rollback an Update:** Change the `LATEST_VERSION` variable back to the previous stable identifier. The updater will automatically serve the rollback manifest pointing to the previous download binary URL.

---

## 📱 5. Android Wrapper Deployment (Capacitor)

The React client compiles into a native Android wrapper using Capacitor:
- **Asset sync:** Run `corepack pnpm run build` to output the dist folder, then synchronize assets to the native layer:
  ```bash
  corepack npx cap sync
  ```
- **Local Notification Navigation:** On background push notifications, native handlers capture payloads, automatically toggle the drawer menu, and route the screen to the matching DM/group room.

---

## 🛡️ 6. Cloud VPS Production Deployment (Google VM & Nginx)

For production, Central Services and the Main Backend must be hosted on separate Google Cloud VM instances. Below are detailed, step-by-step procedures.

### Google VM Architecture Configuration

```mermaid
graph TD
    User([End User Client]) -->|Tauri App / Android| DNS{DNS Cloudflare/GCP}
    DNS -->|license.example.com| VM_CS[VM Instance 2: Central Services]
    DNS -->|api.example.com| VM_BE[VM Instance 1: Main ERP Backend]
    
    VM_CS -->|Express Microservice| PM2_CS[PM2 Process: central-services]
    VM_BE -->|Express Monolith| PM2_BE[PM2 Process: erp-backend]
    VM_BE -->|Prisma Client| PG_DB[(PostgreSQL Database)]
    
    VM_BE -->|License heartbeats /validate| VM_CS
    VM_CS -->|Updates manifest /updater| User
```

#### VM Instance Allocation:
1. **VM Instance 1 (Main ERP Backend)**: e2-medium (2 vCPUs, 4GB RAM) running Ubuntu 22.04 LTS.
2. **VM Instance 2 (Central Services)**: e2-micro (2 vCPUs, 1GB RAM) running Ubuntu 22.04 LTS.

---

### Step-by-Step Google VM Deployment Guide

#### Step 1: Subdomain and DNS Configuration
Configure your domain provider (e.g. Cloudflare, Google Domains) with the following DNS records:
- **A Record**: `api.example.com` pointing to the **External IP** of **VM Instance 1** (Main Backend).
- **A Record**: `license.example.com` pointing to the **External IP** of **VM Instance 2** (Central Services).

#### Step 2: Establish Secure Git Deployment
Run these commands on **both** VM instances:
1. SSH into the instance:
   ```bash
   gcloud compute ssh [INSTANCE_NAME] --zone=[ZONE]
   ```
2. Install Git and Node.js (LTS v18+):
   ```bash
   sudo apt update
   sudo apt install -y git curl
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -y -g pnpm pm2
   ```
3. Generate an SSH deployment key:
   ```bash
   ssh-keygen -t ed25519 -C "deploy@example.com" -N "" -f ~/.ssh/id_ed25519
   cat ~/.ssh/id_ed25519.pub
   ```
4. Copy the output key, go to your GitHub Repository -> Settings -> Deploy Keys -> Add Deploy Key (allow read-only access).
5. Clone the repository into `/var/www/erp`:
   ```bash
   sudo mkdir -p /var/www && sudo chown -R $USER:$USER /var/www
   git clone git@github.com:yourusername/erp-monorepo.git /var/www/erp
   ```

#### Step 3: Production Environment Configurations (`.env`)

##### **VM Instance 2 (Central Services - `/var/www/erp/central_services/.env`):**
Create the file:
```env
PORT=6001
NODE_ENV=production
CENTRAL_ADMIN_SECRET="secure-central-admin-secret-2026"
LATEST_VERSION="1.1.0"
DOWNLOAD_URL="https://license.example.com/bin/ERPServer-v1.1.0.exe"
RELEASE_NOTES="Production Release 1.1.0 with dynamic updates."
TAURI_UPDATE_SIGNATURE="dW51c2VkX3NhbmRib3hfc2lnbmF0dXJlX3BsYWNlaG9sZGVy=="
LICENSE_SEEDS='[{"licenseKey":"ANB-LIC-PROD-001","companyCode":"ABC001","status":"ACTIVE"}]'
DISCOVERY_SEEDS='[{"companyCode":"ABC001","companyName":"ABC Corporation","serverUrl":"https://api.example.com","status":"ACTIVE"}]'
```

##### **VM Instance 1 (Main ERP Backend - `/var/www/erp/backend/.env`):**
Create the file:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="postgresql://db_user:db_password@localhost:5432/manual_erp?schema=public"
JWT_SECRET="extremely-secure-jwt-key"
CENTRAL_SERVICES_URL="https://license.example.com"
CENTRAL_ADMIN_SECRET="secure-central-admin-secret-2026"
```

*Note: Ensure PostgreSQL is installed and running on VM Instance 1:*
```bash
sudo apt install -y postgresql postgresql-contrib
sudo -i -u postgres psql -c "CREATE DATABASE manual_erp;"
sudo -i -u postgres psql -c "CREATE USER db_user WITH PASSWORD 'db_password';"
sudo -i -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE manual_erp TO db_user;"
```

#### Step 4: Build and PM2 Process Execution

##### **On VM Instance 2 (Central Services):**
```bash
cd /var/www/erp/central_services
pnpm install
pnpm run build
pm2 start dist/index.js --name "central-services"
pm2 save
pm2 startup
```

##### **On VM Instance 1 (Main ERP Backend):**
```bash
cd /var/www/erp/backend
pnpm install
npx prisma db push
pnpm run build
pm2 start dist/index.js --name "erp-backend"
pm2 save
pm2 startup
```

#### Step 5: Nginx SSL Proxy Setup (Certbot)
Execute on **both** VM instances:
1. Install Nginx and Certbot:
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```
2. Create config `/etc/nginx/sites-available/erp`:
   *For VM 1 (Main Backend):*
   ```nginx
   server {
       listen 80;
       server_name api.example.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   *For VM 2 (Central Services):*
   ```nginx
   server {
       listen 80;
       server_name license.example.com;

       location / {
           proxy_pass http://localhost:6001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
3. Enable configuration and trigger SSL certificate issuance:
   ```bash
   sudo ln -s /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   # Request Let's Encrypt certificates
   sudo certbot --nginx -d [SUBDOMAIN.DOMAIN.COM] --non-interactive --agree-tos --email deploy@example.com
   ```

---

## 📦 7. Packaging Clean Binaries Guide

### 1. Backend Server Packaging (`serversetup.exe`)
To package the backend server as a single-executable installer for self-hosted customer environments:
1. Compile TypeScript:
   ```bash
   cd backend
   pnpm run build
   ```
2. Package the compiled app using `pkg`:
   ```bash
   npx pkg dist/index.js --targets node18-win-x64 --output dist/erp-server.exe
   ```
3. Copy the compiled query engines (e.g. `query-engine-windows.exe`) from `node_modules/.prisma/client/` into `dist/`.
4. Bundle with an installer tool (e.g. **Inno Setup**) to create a setup wizard:
   - Configure Inno Setup to include `dist/erp-server.exe`, Prisma schema files, and a silent PostgreSQL installer.
   - Run Inno Setup script compiler to generate `serversetup.exe`.

### 2. Tauri Desktop Client (`app setup.exe`)
To compile the lightweight Tauri desktop app installer:
1. Build the production React assets:
   ```bash
   cd frontend
   pnpm run build
   ```
2. Compile the Tauri executable:
   ```bash
   pnpm tauri build
   ```
3. The output installer wizard will be generated at `frontend/src-tauri/target/release/bundle/msi/` or `/nsis/` (e.g. `app setup.exe`).

### 3. Android Wrapper Build for Google Play Store
To package and sign a production Android App Bundle:
1. Build frontend client assets:
   ```bash
   cd frontend
   pnpm run build
   ```
2. Sync build assets into Capacitor Android wrapper:
   ```bash
   npx cap sync android
   ```
3. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```
4. Inside Android Studio:
   - Go to **Build** -> **Generate Signed Bundle / APK**.
   - Select **Android App Bundle** (`.aab` is required for Play Store uploads).
   - Create or select your release Keystore file, type credentials, and set destination.
   - Select **release** build variant and click **Finish**.
   - Upload the generated `.aab` file located in `android/app/release/` to the Google Play Console under the Production track.

---

## 🔄 8. Create and Push Version Updates Checklist

> [!IMPORTANT]
> **Where to Place Update Executables & Packages:**
> - **Local Development Path:** `central_services/bin/` (inside your local codebase workspace directory)
> - **Production Google Cloud VM Path:** `/var/www/erp/central_services/bin/` (on VM Instance 2 - Central Services)
> 
> **How Static URL Resolution Works:**
> The Central Services microservice mounts the `bin/` directory statically on `/bin`. Any file placed in the directory is served over HTTPS:
> - Development URL: `http://localhost:6001/bin/<filename>`
> - Production URL: `https://license.example.com/bin/<filename>`
> 
> *Always copy both the server installer setup `.exe` and the Tauri client updates `.zip` package to this folder before updating the registry.*

---

### 1. Creating and Deploying Server (Backend) Updates Checklist

#### 📋 Developer Steps to Push a Server Update:
- [ ] Make backend code modifications and increment the version parameter inside `backend/package.json`.
- [ ] Build and compile the backend TypeScript source:
  ```bash
  cd backend && pnpm run dev
  ```
- [ ] Package the project into a Windows executable using `pkg`:
  ```bash
  npx pkg dist/index.js --targets node18-win-x64 --output dist/ERPServer-v1.2.0.exe
  ```
  *(Replace `1.2.0` with your new version identifier)*
- [ ] Copy or upload the executable into Central Services VM statically served directory:
  ```bash
  scp dist/ERPServer-v1.2.0.exe username@license.example.com:/var/www/erp/central_services/bin/
  ```
- [ ] Go to the **Central Services Admin Portal** -> Navigate to **Auto-Updater Registry** tab.
- [ ] Submit the new update details:
  - **Latest Version**: `1.2.0`
  - **Download URL**: `https://license.example.com/bin/ERPServer-v1.2.0.exe`
  - **Release Notes**: Fill in notes about changes and bug fixes.
  - Click **Publish Update Release**.

#### 🤖 How it executes on the Customer's Server (Spare PC):
1. **Periodic Check**: The customer's background updater service (`updater.ts`) queries Central Services `GET /api/updater/check` every 6 hours (or on reboot).
2. **Download**: The server detects the new version, downloads `ERPServer-v1.2.0.exe` from `https://license.example.com/bin/ERPServer-v1.2.0.exe` into its local staging `Updates/` folder.
3. **Database Snapshot (Data Safety)**: The server automatically runs a full PostgreSQL database snapshot via `pg_dump` and saves it into `Data/Backups/` before starting installation. If backup fails, the process aborts to protect data.
4. **Extraction & Swap Orchestration**: The server extracts the package, writes a custom, hidden `apply-update.ps1` PowerShell script, and detaches the script in the background while gracefully shutting down the main server.
5. **Service Binary Swap**: The PowerShell script waits for `ERPServer.exe` to stop, backs up the old binary as `ERPServer.exe.rollback`, copies the new binary, and starts it.
6. **Self-Healing Check**: The new server executes database migrations (`npx prisma db push`). If it fails to boot or pass a local health check at `/api/health` within 30 seconds, the orchestrator script automatically rolls back by deleting the new binary, restoring `ERPServer.exe.rollback` to active status, and restoring the PostgreSQL backup file.

---

### 2. Creating and Deploying Tauri Client Updates Checklist

#### 📋 Developer Steps to Push a Client (Tauri) Update:
- [ ] Open `frontend/src-tauri/tauri.conf.json` and increment the version property:
  ```json
  "version": "1.2.0"
  ```
- [ ] Compile the production React client and compile the signed Tauri installer:
  ```bash
  cd frontend && pnpm run build
  pnpm tauri build
  ```
- [ ] Locate the generated update packages inside the `frontend/src-tauri/target/release/bundle/updater/` folder:
  - `app-v1.2.0.msi.zip` (The update archive containing the new binary)
  - `app-v1.2.0.msi.zip.sig` (The cryptographic signature file)
- [ ] Upload the `.zip` archive to the Central Services VM statically served directory:
  ```bash
  scp app-v1.2.0.msi.zip username@license.example.com:/var/www/erp/central_services/bin/
  ```
- [ ] Open the `.sig` file, copy its cryptographic signature string.
- [ ] Access the **Central Services Admin Portal** -> Go to **Auto-Updater Registry** tab.
- [ ] Submit the update configurations:
  - **Latest Version**: `1.2.0`
  - **Download Binary URL**: `https://license.example.com/bin/app-v1.2.0.msi.zip`
  - **Tauri Update Signature**: *Paste the copied signature string*
  - **Release Notes**: Summarize features.
  - Click **Publish Update Release**.

#### 🤖 How it executes on the User's Device:
1. **Heartbeat Query**: When the user opens the desktop application, the Tauri updater plugin automatically sends a query to:
   `https://license.example.com/api/updater/windows-x86_64/1.0.0`
2. **Signature Verification**: The client app checks if the returned version is higher, downloads the update zip, and verifies it against the developer's public key (baked into `tauri.conf.json`) using the signature from the manifest.
3. **Execution**: If verified, the app displays a prompt: *"New version of the app is available (v1.2.0). Would you like to install it now?"*. If the user clicks **Yes**, Tauri terminates the active session, installs the update silently, and restarts the application automatically.

---

### 3. Pushing Android App Updates Checklist
- [ ] Open `frontend/android/app/build.gradle` and increment `versionCode` (integer) and `versionName` (string).
- [ ] Sync Capacitor code:
  ```bash
  npx cap sync android
  ```
- [ ] In Android Studio, generate a signed App Bundle (`.aab`) using your release keystore.
- [ ] Log in to the Google Play Console, select your app, navigate to **Production**, create a new release, and upload the signed `.aab`.
- [ ] Submit the release for review. Once approved, the Google Play Store will automatically notify and push the update to all active devices.

---

## 🛠️ 9. On-premise Self-Hosted vs Developer-Hosted Setup Guide

### Self-Hosted Architecture (Customer Hardware)
Ideal for companies requiring complete data sovereignty, running on local office spare PCs or private on-premise servers.

```text
               +-------------------------------------------------+
               |             CUSTOMER LOCAL NETWORK              |
               |                                                 |
               |  +--------------------+   +------------------+  |
               |  |  PostgreSQL DB     |   |   ERP Backend    |  |
               |  |  (Local Database)  |   |   (Local Node)   |  |
               |  +---------^----------+   +--------^---------+  |
               |            |                       |            |
               +------------|-----------------------|------------+
                            |                       |
   +------------------------|-----------------------|-----------------------+
   | TAURI CLIENT / WEB     |                       |                       |
   |                        |                       |                       |
   | 1. Onboarding: Queries DNS Discovery for code  |                       |
   | 2. Resolves route: Queries Local Node directly +                       |
   | 3. Authenticates & works completely in local subnet                    |
   +------------------------------------------------------------------------+
```

#### Setup Process:
1. **License Key**: The customer purchases a license key from the vendor (created via Central Services).
2. **Local DB & Server Setup**: Run `serversetup.exe` on the local machine. This installs PostgreSQL and configures the ERP service to run locally (e.g. on local network IP `http://192.168.1.100:5000`).
3. **Activation**: On first boot, the local backend queries Central Services `POST /license/activate` mapping its motherboard fingerprint and the local server URL.
4. **Client Connect**: Employees launch the Tauri Client, enter the company code, which resolves through `license.example.com/discovery/[CODE]` to the local server URL, and log in.

---

### Developer-Hosted Architecture (Shared SaaS Cloud)
Ideal for companies that prefer to bypass database setup, relying on the developer's default managed infrastructure.

```text
               +-------------------------------------------------+
               |            DEVELOPER SAAS CLOUD                 |
               |                                                 |
               |  +--------------------+   +------------------+  |
               |  |  Prisma multi-db   |   | Shared Backend   |  |
               |  |  (GCP Postgres)    |   | (api.example.com)|  |
               |  +---------^----------+   +--------^---------+  |
               |            |                       |            |
               +------------|-----------------------|------------+
                            |                       |
   +------------------------|-----------------------|-----------------------+
   | TAURI CLIENT / WEB     |                       |                       |
   |                        |                       |                       |
   | 1. Onboarding: Queries DNS Discovery for code  |                       |
   | 2. Resolves route: Routes directly to Shared Developer Cloud           |
   | 3. Authenticates & works inside shared cloud tenant partition          |
   +------------------------------------------------------------------------+
```

#### Setup Process:
1. **Developer Config Registration**: In Central Services Infrastructure tab, the Super Admin clicks **Add Dev Backend** and checks the **"Use Current Developer Infrastructure"** toggle. This automatically records the developer's cloud backend database settings and API base URL.
2. **Licensing**: Create a license for the company, selecting the newly created **Developer-Managed** infrastructure as the target.
3. **Tenant Spawning**: Go to the **Spawn Corporate Tenant** page. The system detects the active license. Select the license from the dropdown, choose subscription features, create the first company admin, and hit spawn.
4. **Client Connect**: Employees open the client application, enter the company code, and are instantly routed to the developer's cloud API (`api.example.com`), completely bypassing local installations.

---

## 🔒 10. Tauri v2 HTTP Permissions (ACL configuration)

Tauri v2 enforces strict Access Control Lists (ACLs) for IPC plugins. Merely enabling the HTTP plugin (`tauri-plugin-http`) does not allow the webview to query remote endpoints.

### ACL Mapping Rule
A frontend `fetch()` lifecycle calls multiple native commands sequentially:
1. `fetch_send` to transmit headers and request body.
2. `fetch_read_body` to parse and stream the response.

To authorize these operations, individual permissions must have their allowed origins explicitly defined:

Modify `frontend/src-tauri/capabilities/default.json` to assign scopes:
```json
    "permissions": [
      "core:default",
      "updater:default",
      "http:default",
      {
        "identifier": "http:allow-fetch",
        "scope": { "allow": ["http://localhost:5000/*", "http://localhost:6001/*", "https://license.example.com/*", "https://api.example.com/*", "https://*.example.com/*"] }
      },
      {
        "identifier": "http:allow-fetch-send",
        "scope": { "allow": ["http://localhost:5000/*", "http://localhost:6001/*", "https://license.example.com/*", "https://api.example.com/*", "https://*.example.com/*"] }
      },
      {
        "identifier": "http:allow-fetch-read-body",
        "scope": { "allow": ["http://localhost:5000/*", "http://localhost:6001/*", "https://license.example.com/*", "https://api.example.com/*", "https://*.example.com/*"] }
      }
    ]
```

---

## 🔍 11. Troubleshooting & VM Command Reference

### Onboarding & Discovery Flow Checklist:
1. **Local Ports Check (Windows)**:
   Verify that local services are listening on their configured ports using PowerShell:
   ```powershell
   Get-NetTCPConnection -LocalPort 6001
   Get-NetTCPConnection -LocalPort 5000
   ```
2. **CORS Headers**: Ensure Central Services returns headers permitting requests from `http://localhost:5173`.
3. **Tauri Bypass Mode**: For local debugging, toggle `useBypass = true` in `apiService.ts` to verify the connection without native rust HTTP restrictions.

---

### Production VM Operations Commands

#### Service Status & Logs:
- **View all processes running in PM2**:
  ```bash
  pm2 status
  ```
- **Inspect live logs**:
  ```bash
  pm2 logs erp-backend
  pm2 logs central-services
  ```
- **Restart processes**:
  ```bash
  pm2 restart erp-backend
  pm2 restart central-services
  pm2 restart all
  pm2 save
  ```

#### Infrastructure Port & Service Validation:
- **Verify running service ports**:
  ```bash
  sudo ss -tulpn | grep 5000
  sudo ss -tulpn | grep 6001
  ```
- **Test Nginx settings & reload configuration**:
  ```bash
  sudo nginx -t
  sudo systemctl restart nginx
  ```

#### Daily Git Update & Build Flow:
Whenever you push changes to GitHub and need to update the VM instances:
1. Pull the latest commits:
   ```bash
   cd /var/www/erp
   git pull origin main
   ```
2. Re-install packages, run database push (for VM 1 Backend), rebuild, and restart:
   - **For VM Instance 1 (Main Backend):**
     ```bash
     cd /var/www/erp/backend
     pnpm install
     npx prisma db push
     pnpm run build
     pm2 restart erp-backend
     ```
   - **For VM Instance 2 (Central Services):**
     ```bash
     cd /var/www/erp/central_services
     pnpm install
     pnpm run build
     pm2 restart central-services
     ```

#### Emergency Rollback Workflows:

- **Roll back to a previous Git commit on the VM**:
  ```bash
  cd /var/www/erp
  git log --oneline -n 10
  git checkout <old_commit_hash>
  # Rebuild and restart
  pnpm install
  pnpm run build
  pm2 restart all
  ```

- **Roll back a Server/Tauri update registry entry**:
  1. Access the Central Services VM's `.env` configuration file or Admin Portal.
  2. Set `LATEST_VERSION` to the previous version and point `DOWNLOAD_URL` back to the previous stable binary filename inside `bin/`.
  3. Restart the PM2 process to apply the change:
     ```bash
     pm2 restart central-services
     ```
  4. Active instances will automatically detect the old stable version and execute the rollback procedure.
