# AntiGravity Enterprise ERP Suite

Welcome to the **AntiGravity ERP Suite**, a highly responsive, secure, enterprise-grade, multi-tenant separated Resource Planning ecosystem. Engineered from a single, unified codebase using **Flutter** and **Dart**, this application compiles directly to native binaries for all primary operating systems: **Windows, Android, macOS, and iOS**, satisfying industrial performance standards.

The application comes pre-loaded with curated **Rich Glassmorphism Themes**, native **CustomPainter Charting Engines** (with zero external graphic packages to guarantee fail-safe compilation), granular role-based feature gating, and a dual-purpose messaging hub featuring a specialized **Expense Chat** with real-time analytics.

---

## 🛠 Architectural Blueprint & Core Capabilities

```
                  ┌──────────────────────────────┐
                  │      SUPER ADMIN SYSTEM      │
                  │   - Manage Tenant Companies  │
                  │   - subscription Feature Gate│
                  │   - Create Tenant Admins     │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │    MULTI-TENANT ISOLATION    │
                  │   - Individual Company Codes │
                  │   - Completely Separate Data │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
         ┌───────────────────────┴───────────────────────┐
         │                                               │
         ▼                                               ▼
┌──────────────────┐                            ┌──────────────────┐
│  COMPANY ADMINS  │                            │  STAFF / EMPLOYS │
│ - Customize Co.  │                            │ - Gated modules  │
│ - Create Roles   │                            │ - Direct access  │
│ - Provision Staff│                            │ - Group Chats    │
└──────────────────┘                            └──────────────────┘
```

1. **Super Admin Subsystem**: Run via override controls to create tenant companies, designate subscription tiers, toggle individual capabilities among the 20 main modules, and add default corporate admins.
2. **Unified OTP Verification Flow**: Registers Username, Password, Email, Mobile number, and Company Code (all 5 compulsory). Allows instant, interactive validation using mock SMS or Email channels with displayed OTP keys.
3. **Company Admin Console**: Create personalized roles (e.g. *Inventory Officer*, *Sales Representative*) and select exact module sets. Provision new employee profiles immediately.
4. **General & Expense Chat Systems**: A collaborative feed supporting text chat and **Expense Log Cards**. Log costs directly (with category, values, and even split-checks across colleagues). The app renders dynamic spending graphs reactively!
5. **High-Fidelity Core Modules**:
   - 📊 **CRM**: Move leads across a fully interactive Kanban Board column stages (Cold, Warm, Hot).
   - 💸 **Finance**: General Ledger transaction grids, Balance Sheets, and a GST/TDS tax split preview calculator.
   - 📦 **Inventory**: Real-time progress capacity bars, low-stock warnings, and warehouse Rack & Bin zoning maps.
   - ⚙️ **Manufacturing**: Assemble items with Bill of Materials (BOM) components and observe live IoT machine load monitors.
   - 👥 **HRM**: Shift attendance Timesheets with Clock-In/Clock-Out logging and salary slip generators.

---

## 🚀 Interactive Developer Sandbox Persona Shortcuts

To make reviews and sandboxed testing a breeze, the login gateway contains single-click **Shortcut Personas** to bypass manual signups and explore the application at different permission levels immediately:

* **Super Admin**:
  * *Username*: `superadmin` | *Password*: `supersecure123` | *Company Code*: `SUPER`
  * *Access*: Complete tenant registry, subscriptions editor, and active module toggles.
* **Company Admin**:
  * *Username*: `admin` | *Password*: `adminpassword` | *Company Code*: `DINE`
  * *Access*: Company configurations, branch details, role creation, and employee registration.
* **Employee (Sales Manager)**:
  * *Username*: `sales_user` | *Password*: `salespassword` | *Company Code*: `DINE`
  * *Access*: Gated to CRM (Kanban), Sales, Communication channels, and Analytics.

---

## 💻 Compilation & Deployment Directions

First, navigate to your workspace directory:
```powershell
cd "d:\ERP\AntiGravity"
```

Resolve any standard packages:
```powershell
flutter pub get
```

### 1. Windows Native App Build (Priority 1)
To run the Windows application locally in developer mode:
```powershell
flutter run -d windows
```

To compile a highly optimized, standalone native production `.exe` binary:
```powershell
flutter build windows
```
The compiled assets will be generated in:
`.\build\windows\x64\runner\Release\`

### 2. Android Mobile App Build (Priority 1)
To run on a connected Android phone or active emulator:
```powershell
flutter run -d android
```

To build a production-ready Release APK:
```powershell
flutter build apk --release
```
To compile a Google Play-compliant App Bundle (AAB):
```powershell
flutter build appbundle --release
```
The output files will be created in:
`.\build\app\outputs\flutter-apk\app-release.apk`

### 3. macOS Native Desktop Build (Priority 2)
To launch the macOS native developer app:
```powershell
flutter run -d macos
```

To package a standalone, highly optimized release app:
```powershell
flutter build macos
```
The packaged `.app` bundle is stored under:
`.\build\macos\Build\Products\Release\`

### 4. iOS Mobile App Build (Priority 2)
*Note: Compiling for iOS requires a macOS host machine with Xcode installed.*

To run on a simulated iPhone or connected device:
```powershell
flutter run -d ios
```

To build a production-ready iOS Archive:
```powershell
flutter build ipa --release
```
The packaged archive will be output to:
`.\build\ios\ipa\`

---

## 📈 System Security & Multi-Tenancy Separation

This ERP implements strict data isolation using a **Repository Tenant Gating Pattern**:
* **Authentication isolation**: Every user profile is tightly coupled with a unique `companyCode`. The credentials dictionary requires matching company codes, meaning usernames are completely isolated inside their tenant space (e.g. `user1` can exist in `TECH` and `FIN` simultaneously without any overlap).
* **Expense Chat visibility constraints**: Company admins can configure corporate visibility rules to either allow all staff to view logs, enforce absolute isolation (view only own logs), or allow group split transparency. The data stream filters entries at the repository layer before the UI draws them.
