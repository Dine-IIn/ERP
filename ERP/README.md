# Enterprise ERP Platform

Enterprise ERP Platform is a multi-tenant ERP, collaboration, workflow automation, and operations control system. The current Flutter client is designed around a Super Admin first workflow: create a company, enable licensed features, seed access, and then open the ERP workspace for company users.

## Apps

- `apps/flutter_app` - Flutter client for Windows, Android, iOS, macOS, and web.
- `apps/backend` - NestJS API services and workers.
- `infra` - Docker, PostgreSQL, Redis, and Nginx deployment assets.
- `docs` - architecture and module planning notes.

## Run the Windows App

```bash
cd apps/flutter_app
flutter pub get
flutter run -d windows
```

Build a release executable:

```bash
cd apps/flutter_app
flutter build windows
```

Output:

```text
apps/flutter_app/build/windows/x64/runner/Release/enterprise_erp_app.exe
```

## Demo Login

The client currently has local demo authentication so the UI can be used before backend auth is fully connected.

| Role | Username | Password | Opens |
| --- | --- | --- | --- |
| Super Admin | `superadmin` | `admin123` | Super Admin Control Plane |
| Company Owner | `owner@alloyworks.in` | `owner123` | ERP Workspace |
| ERP User | `operator@alloyworks.in` | `user123` | ERP Workspace |

## Super Admin Workflow

1. Sign in as `Super Admin`.
2. Open `Create Company / Entity`.
3. Enter the company name and owner email.
4. Select the plan and licensed feature access.
5. Create the company.
6. Review the company in the Companies panel.
7. Open `Access workspace` to enter the ERP workspace as that tenant.

The Super Admin panel covers:

- Company and entity creation.
- Owner assignment.
- Plan selection.
- Feature licensing and feature flags.
- Tenant list and status.
- Access to company workspace.
- Provisioning workflow: company, features, roles, database/storage, users.
- Governance basics for audit, backups, and RBAC.

## ERP Workspace Workflow

The ERP workspace is organized by standard enterprise process areas instead of a single-industry dashboard:

- Finance & Accounting
- Sales & Distribution
- Procurement & Sourcing
- Inventory & Warehouse
- Manufacturing
- Quality Management
- Maintenance & Assets
- Projects & Services
- CRM & Customer Success
- HR, Payroll & Attendance
- Collaboration & Tasks
- Workflow Automation
- Reports & Analytics
- Platform Admin
- Integrations & API

Each module is structured into:

- `Overview` - capability coverage and open worklist.
- `Master Data` - governed records such as customers, vendors, SKUs, BOMs, roles, employees, assets, and tax codes.
- `Transactions` - create, validate, approve, post, reverse, return, export.
- `Workflows` - approvals, escalations, notifications, scheduled actions, and audit.
- `Analytics` - KPIs, reports, PDF/Excel/CSV exports, scheduled MIS.
- `Setup` - numbering, permissions, integrations, calendars, policies, tolerances, and retention.

## Feature Coverage Direction

The product is being shaped around public ERP feature patterns seen in manufacturing and enterprise suites: SAP-style FI/CO/SD/MM/PP/QM/PM/HR/WM coverage, STERP-like engineering/manufacturing/trading workflows, and additional platform features requested for SaaS administration, chat, documents, backups, automation, and offline-first mobile/desktop use.

This implementation does not copy proprietary screens. It uses comparable enterprise feature coverage with a cleaner, configurable UX.

## Backend Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Backend health check:

```bash
curl http://localhost:3000/api/v1/health
```

## Architecture

The platform is designed for:

- Multi-tenant SaaS and enterprise self-hosted deployment.
- Separate PostgreSQL database per company.
- Feature-based licensing and permission guards.
- Offline-first client workflows with Drift SQLite.
- Workflow automation, manufacturing, CRM, HR, payroll, attendance, chat, documents, and reports.
- Storage provider abstraction for local, MinIO, and S3-compatible providers.

See `docs/ARCHITECTURE.md` for implementation details.
