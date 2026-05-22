# NexaERP

NexaERP is a multi-tenant SaaS ERP foundation for manufacturing, trading, warehouse, and service companies.

## What is included

- NestJS API service with tenant, auth, inventory, and sales modules.
- Next.js web app shell with dashboard, module navigation, health checks, and operational views.
- Flutter mobile starter and Node-based desktop launcher for the Next.js workspace.
- Shared TypeScript contracts used by API and web.
- Prisma master and tenant schema foundations.
- Docker Compose for PostgreSQL, Redis, MinIO, API, and web.
- Nginx reverse proxy config and GitHub Actions CI.

## Local start

```powershell
copy .env.example .env
npm.cmd install
npm.cmd run dev
```

Desktop-style local launch without Rust:

```powershell
corepack npm run dev --workspace @nexaerp/desktop
```

This starts the web workspace on `http://localhost:3010` and a launcher redirect on `http://localhost:3099`.

Demo login for the API auth endpoint:

- Tenant: `demo`
- Email: `admin@nexaerp.local`
- Password: `NexaERP@123`

For infrastructure:

```powershell
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

## Production checklist

1. Replace all secrets in `.env`.
2. Run Prisma migrations against the master database and each tenant database.
3. Configure SMTP, S3/MinIO, Sentry, and domain TLS.
4. Run `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build`.
5. Deploy with the provided Docker Compose production profile or translate the services to your orchestrator.
