# NexaERP Architecture

## Runtime Boundary

The first production slice is a TypeScript monorepo with three active packages:

- `services/api`: NestJS API for tenant resolution, authentication, inventory, and sales.
- `apps/web`: Next.js operations workspace.
- `apps/mobile`: Flutter mobile client foundation.
- `apps/desktop`: Node launcher for the web workspace, intentionally Rust-free.
- `packages/shared-types`: shared contracts for API and clients.

## Multi-Tenancy

The platform uses a master database for company, plan, subscription, and feature flag records. Each company receives a tenant database for operational data. The included Prisma schemas separate these concerns:

- `services/api/prisma/master.prisma`
- `services/api/prisma/tenant.prisma`

## Security Defaults

- Strict TypeScript across packages.
- DTO validation and request whitelisting at the API edge.
- Helmet security headers and controlled CORS.
- JWT access and refresh token shape prepared for persistent session storage.
- Secrets are supplied only through environment variables.

## ERP Module Path

The current runnable modules are tenant, auth, inventory, and sales. Purchase, warehouse, manufacturing, accounts, HR, CRM, and reports should be added as independent modules using the same shared contract pattern.
