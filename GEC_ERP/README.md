# GEC Moulding Machine ERP System 🏭

A custom Enterprise Resource Planning (ERP) web, desktop, and mobile solution designed specifically for **GEC (Plastic Injection & Moulding Machine Manufacturers)**.

This system manages the entire manufacturing workflow:
**Customer / Vendor Masters** $\rightarrow$ **Item Master (UOM & C-Factor Ratios)** $\rightarrow$ **BOM Master** $\rightarrow$ **Sales Orders (SO)** $\rightarrow$ **Work Orders (WO with Custom Extra Tooling)** $\rightarrow$ **MRP Production Planning** $\rightarrow$ **In-House Store & External Jobwork Inventory** $\rightarrow$ **Purchase Orders (PO)** $\rightarrow$ **Goods Received Notices (GRN)** $\rightarrow$ **Quality Control (QC)** $\rightarrow$ **Machine Assembly**.

---

## 📌 System Architecture & Core Modules

1. **Item Master & Dual UOM Conversions**:
   - Supports Base UOM (Store/Production) & Purchase UOM (Vendor PO).
   - Dynamic Conversion Factor (C-Factor): e.g. $1 \text{ DRUM} = 210 \text{ LTR}$, $1 \text{ BAR} = 3 \text{ PCS}$.
   - Bulk Sheet Upload (CSV) with duplicate skipping & missing field error logs.

2. **BOM Master**:
   - Pure technical Bill of Materials for moulding machine models (`GEC-250T`, `GEC-180T`, `GEC-350T`).
   - Pure component quantity breakdown per sub-assembly (*Injection Unit, Clamping Unit, Hydraulics, Electrical Cabinet*).

3. **Sales Order (SO) to Work Order (WO) Flow**:
   - **Sales Order (SO)**: Captures client machine orders.
   - **Work Order (WO)**: Auto-generated from SO. Allows adding **custom extra tools / special options directly on the WO** without modifying the master BOM.

4. **MRP Production & Shortage Planning**:
   - Explodes active Work Orders against current store stock and pending vendor POs to detect critical material shortages and trigger 1-click PO generation.

5. **External Jobwork Inventory**:
   - Tracks raw forged components sent out to third-party vendors for machining, nitriding, or grinding ($Q_{\text{sent}} - (Q_{\text{recd}} + Q_{\text{scrap}}) = Q_{\text{pending}}$).

6. **Procurement (PO & GRN)**:
   - Goods Received Notices (GRN) automatically apply C-Factor multipliers ($Q_{\text{recd}} \times \text{CFactor}$) to credit in-house store stock.

---

## 🚀 1. Steps to Run in Development Environment

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm` (Corepack enabled)

### Running the App
1. Open terminal in project root (`GEC_ERP`):
   ```bash
   corepack pnpm install
   ```
   *(or `npm install`)*

2. Start local development server:
   ```bash
   corepack pnpm dev
   ```
   *(or `npm run dev`)*

3. Open browser at: **`http://localhost:3000`**

---

## 🖥️ 2. Central Host PC Server & Database Setup

The ERP includes a central PostgreSQL server script and Express API launcher so any PC on the local network (LAN or Wi-Fi) can host the server.

### Database Setup (PostgreSQL)
1. Install PostgreSQL on the Host PC.
2. Create database `gec_erp_db`:
   ```sql
   CREATE DATABASE gec_erp_db;
   ```
3. Run the DDL schema script:
   ```bash
   psql -U postgres -d gec_erp_db -f server/db/schema.sql
   ```

### Running Central Express API Server
Double-click `server/start-server.bat` or run:
```bash
cd server
npm install
node src/server.js
```
The server will start on port `5000` (e.g. `http://192.168.1.100:5000/api`).

---

## 💻 3. Building for Windows Desktop App

### Option A: Standard Production Web Build
To build static production files for web hosting or local offline browser usage:
```bash
corepack pnpm build
```
The compiled assets will be created in the `dist/` folder.

### Option B: Packaging as Native Windows Desktop Executable (.exe)
Using **Electron**:
1. Install Electron builder tools:
   ```bash
   npm install --save-dev electron electron-builder
   ```
2. Create `electron/main.js` pointing to `dist/index.html`.
3. Package Windows `.exe` installer:
   ```bash
   npx electron-builder --win nsis
   ```
The installer setup will be generated in `dist_electron/`.

---

## 📱 4. Building for Android Mobile App

Using **Capacitor**:

1. Install Capacitor packages:
   ```bash
   npm install @capacitor/core
   npm install -D @capacitor/cli @capacitor/android
   ```

2. Initialize Capacitor configuration:
   ```bash
   npx cap init "GEC ERP" "com.gec.erp" --web-dir "dist"
   ```

3. Build production web bundle:
   ```bash
   npm run build
   ```

4. Add Android platform project:
   ```bash
   npx cap add android
   npx cap copy android
   ```

5. Open in Android Studio to build APK:
   ```bash
   npx cap open android
   ```
   In Android Studio:
   - Select **Build** $\rightarrow$ **Build Bundle(s) / APK(s)** $\rightarrow$ **Build APK(s)**.
   - The signed `.apk` file will be generated for mobile phones & tablets.

---

## 🍎 5. Building for iOS Mobile App

*(Requires macOS with Xcode installed)*

1. Install iOS Capacitor package:
   ```bash
   npm install -D @capacitor/ios
   ```

2. Build production web bundle:
   ```bash
   npm run build
   ```

3. Add iOS platform project:
   ```bash
   npx cap add ios
   npx cap copy ios
   ```

4. Open in Xcode:
   ```bash
   npx cap open ios
   ```

5. In Xcode:
   - Select signing team under **Signing & Capabilities**.
   - Select **Product** $\rightarrow$ **Archive** to build `.ipa` or distribute via Apple TestFlight / App Store.

---

## 📂 Project Structure

```
GEC_ERP/
├── dist/                      # Production compiled web assets
├── server/
│   ├── db/
│   │   └── schema.sql         # PostgreSQL DDL Database Schema
│   ├── src/
│   │   └── server.js          # Express API server for Host PC
│   └── start-server.bat       # 1-Click Host PC Server Launcher
├── src/
│   ├── components/
│   │   ├── auth/              # Username/Password Login & Signup
│   │   ├── common/            # Modals, AutocompleteSelect & Bulk Sheet Uploaders
│   │   ├── layout/            # Fixed Left Sidebar & Omnipresent Header
│   │   └── modules/           # 14 Manufacturing & Inventory Modules
│   ├── context/               # ERP State Management & Live Sync
│   ├── data/                  # Initial Seed Data (Items, BOMs, Vendors, Customers)
│   ├── types/                 # TypeScript ERP Data Schemas
│   └── utils/                 # CSV / Sheet Parsers with Error Reporting
├── package.json
└── README.md
```

---

### 📞 Technical Support
For GEC Moulding Machine ERP customization or hosting queries, contact GEC System Administration.
