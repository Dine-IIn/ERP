# Architecture

## Product Shape

This platform is an ERP + Collaboration + Workflow Automation system, not a billing-only app. The initial codebase is structured around five backend capabilities:

- ERP core modules
- Auth, permissions, feature flags, and licensing
- Realtime chat, notifications, and presence
- Storage abstraction
- Worker queues for backups, reports, cleanup, and automations

## Tenancy

The master database stores companies, branding, feature flags, licensing, subscriptions, deployment configuration, and platform users.

Each company receives a separate PostgreSQL database for operational data. Company database provisioning should be implemented as an idempotent workflow:

1. Create company record in the master database.
2. Provision `company_<slug>` PostgreSQL database.
3. Run company schema migrations.
4. Seed owner role, admin role, permissions, and default workflows.
5. Mark company as active.

## API Standards

All REST APIs are versioned under `/api/v1`.

Responses are normalized to:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {}
}
```

DTO validation is enforced globally through NestJS validation pipes.

## Backend Module Standard

Backend features follow:

```text
/module
  /controllers
  /services
  /repositories
  /dto
  /entities
  /interfaces
  /validators
  /guards
```

## Offline Client Strategy

Flutter uses Riverpod for state, Drift for local SQLite storage, and a sync queue for limited offline operations:

- Drafts
- Notes
- Attendance
- Chat cache
- Inventory lookup
- Sales drafts

Restricted operations such as heavy analytics, live dashboards, and full synchronization remain online-only.

## Storage

Storage paths use:

```text
/{company_id}/{module}/{entity}/{file_name}
```

The storage service exposes provider-neutral paths so local, MinIO, and S3-compatible backends can share the same application contract.

## Security Baseline

Required controls:

- Argon2 password hashing
- JWT access and refresh tokens
- Session and device tracking
- Permission guards using `module.action`
- Rate limiting
- Audit logs for security-sensitive actions
- Owner approval and superadmin approval for destructive company workflows
