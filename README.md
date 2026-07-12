<div align="center">

# AssetFlow

**Enterprise Asset & Resource Management System**

Track physical assets, book shared resources, route maintenance approvals, and run audit cycles — with role-based workflows and no double-allocation ever.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)

Built by **Team Artemis** for the Odoo Hackathon.

</div>

---

## Table of Contents

1. [What is AssetFlow?](#what-is-assetflow)
2. [Live Feature Demos](#live-feature-demos)
3. [Tech Stack](#tech-stack)
4. [Architecture at a Glance](#architecture-at-a-glance)
5. [Prerequisites](#prerequisites)
6. [Quick Start](#quick-start)
7. [Repository Layout](#repository-layout)
8. [Feature Matrix](#feature-matrix)
9. [Roles & Permissions (RBAC)](#roles--permissions-rbac)
10. [Data Model](#data-model)
11. [API Surface](#api-surface)
12. [Environment Variables](#environment-variables)
13. [Common Commands](#common-commands)
14. [Testing](#testing)
15. [Security Model](#security-model)
16. [Deployment](#deployment)
17. [Documentation Index](#documentation-index)
18. [Team](#team)

---

## What is AssetFlow?

AssetFlow is a **general-purpose ERP module** for any organization that owns physical assets — schools, hospitals, offices, factories, agencies. It replaces the spreadsheet-and-paper tracking most orgs still rely on with:

- **Structured asset lifecycles** (`Available → Allocated → Under Maintenance → Retired` etc.)
- **Centralized resource booking** with strict overlap prevention
- **Approval-gated maintenance** — assets flip to `Under Maintenance` only after an Asset Manager signs off
- **Scheduled audit cycles** with auto-generated discrepancy reports
- **Role-based workflows** — signup only ever creates a plain Employee; admins promote from the Employee Directory

The scope is deliberately narrow. AssetFlow does **not** touch purchasing, invoicing, or accounting — those belong elsewhere in an ERP suite. What we ship is a focused, clean, well-modelled asset & resource module.

### Design principles

| Principle | How it shows up in code |
|---|---|
| **No self-elevating admin** | Signup route hard-codes `role: EMPLOYEE`. Role changes flow only through `PATCH /employees/:id/promote`, admin-only. |
| **Conflict rules are business logic, not UI** | Overlap validation, double-allocation blocking, and status-transition guards live in the service layer; the UI just surfaces the 409. |
| **Approval workflows are stateful** | Asset status never changes silently. `UNDER_MAINTENANCE` only via approved request; `LOST` only via closed audit cycle. |
| **Notifications and activity logs are cross-cutting** | Every business action fires a `notify()` + `logActivity()` call. Both are wrapped in `try/catch` so an audit-trail hiccup never breaks the primary write. |
| **RBAC at both edges** | Enforced in Express middleware **and** hidden in the frontend (`RoleGate`) so unauthorized routes render 403 UX. |

---

## Live Feature Demos

Four dramatic moments the app is built to show off:

### 1. Double-allocation block → Request Transfer flow
Priya has Laptop `AF-0001`. Raj tries to allocate it. The API responds `409 ALLOCATION_CONFLICT` with `currentHolder`. The frontend shows a modal saying **"Currently held by Priya — Request Transfer?"** with a pre-filled transfer form. Approving the transfer moves custody atomically inside a Prisma transaction and notifies both parties.

### 2. Booking overlap rejection
Room B2 is booked 09:00–10:00. A request for 09:30–10:30 is rejected with `409 BOOKING_OVERLAP`, showing which existing booking conflicts. A request for **10:00–11:00 is accepted** because overlap uses a half-open interval `[start, end)` — abutting slots are legal.

### 3. Maintenance approval flips asset status
An employee raises maintenance — the asset stays `AVAILABLE`. When an Asset Manager approves, the same transaction flips `MaintenanceRequest.status → APPROVED` and `Asset.status → UNDER_MAINTENANCE`, and the asset disappears from allocation and booking dropdowns. Resolving reverses both.

### 4. Close-audit-cycle auto-consequences
An auditor marks assets `VERIFIED / MISSING / DAMAGED`. Closing the cycle atomically:
- Flips every `MISSING` asset → `LOST`
- Creates a `HIGH`-priority `MaintenanceRequest` for every `DAMAGED` asset
- Notifies every other assigned auditor
- Locks the cycle so it can't be reopened

---

## Tech Stack

### Backend
| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 20 | LTS, native ESM interop via `tsx` |
| Language | TypeScript 5.9 (strict) | Compile-time guarantees on our API contracts |
| HTTP | Express 4 | Minimal, familiar, well-supported |
| ORM | Prisma 6.19 | Type-safe queries, migration-first workflow |
| Database | PostgreSQL 15 | Local, no BaaS; the Odoo brief calls this out |
| Auth | JWT via `jsonwebtoken` + `bcryptjs` | No third-party auth service |
| Validation | Zod | Same schema for parsing request bodies and inferring TS types |
| Security | Helmet, CORS | Standard hardening middleware |
| Testing | Vitest + Supertest | Fast, TypeScript-native |

### Frontend
| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite 6 | Modern DX, sub-second HMR |
| Language | TypeScript 5.7 | Same as backend |
| Routing | React Router 7 | Nested routes + typed loaders |
| Data fetching | TanStack Query 5 | Cache, refetch, background sync out of the box |
| State (auth only) | Zustand | Minimal, persistable, no boilerplate |
| Forms | React Hook Form + Zod | Client-side mirror of backend validation |
| Styling | Tailwind CSS 4 | Utility-first with OKLCH-based design tokens |
| Toasts | Sonner | Accessible, dismissible, high-density |
| Icons | Lucide React | Consistent line-icon set |
| Testing | Vitest + Testing Library | UI intent tests |

### Infrastructure
| Component | Choice |
|---|---|
| Local DB | Docker Compose (`postgres:15-alpine`) on host port `5433` |
| Package manager | npm 10 workspaces |
| Task runner | `concurrently` for `npm run dev` |
| Environment | dotenv per workspace |

**Explicitly avoided:** Firebase, Supabase, MongoDB Atlas, any BaaS. The Odoo hackathon brief requires a local, self-hosted database — we chose Postgres because that's what Odoo itself runs on.

---

## Architecture at a Glance

```
┌────────────────────────────────────────────────────────────────────┐
│                          Browser (React SPA)                       │
│  ┌─────────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │ Auth store      │  │ TanStack Query │  │ React Router 7      │  │
│  │ (Zustand +      │  │ (server state, │  │ (protected routes,  │  │
│  │  localStorage)  │  │  cache, poll)  │  │  role gates)        │  │
│  └────────┬────────┘  └────────┬───────┘  └─────────┬───────────┘  │
│           └───────────axios interceptor─────────────┘              │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ HTTPS  · Bearer JWT
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Express API  (`/api/v1/*`)                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  helmet · cors · morgan · json · error-handler                │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │  authenticateToken  →  requireRole(...)                  │ │ │
│  │  │  ┌───────────────────────────────────────────────────┐   │ │ │
│  │  │  │ Modules: auth · departments · categories ·        │   │ │ │
│  │  │  │ employees · assets · allocations · transfers ·    │   │ │ │
│  │  │  │ bookings · maintenance · audits · reports ·       │   │ │ │
│  │  │  │ notifications · activity-logs                     │   │ │ │
│  │  │  │                                                   │   │ │ │
│  │  │  │ Each module = routes / controller / service /     │   │ │ │
│  │  │  │ schema (Zod). Business logic in service; HTTP in  │   │ │ │
│  │  │  │ controller.                                       │   │ │ │
│  │  │  └───────────────────────────────────────────────────┘   │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────┬───────────────────────────────┘ │
└──────────────────────────────────┼─────────────────────────────────┘
                                   │ Prisma Client (type-safe)
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL 15                                │
│  17 tables · foreign-key-safe · indexed hot paths · migrations     │
└────────────────────────────────────────────────────────────────────┘
```

For a deep dive see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Prerequisites

- **Node.js 20+** and **npm 10+**
- **Docker Desktop** with Docker Compose (recommended) — OR a local PostgreSQL 15+ instance
- **Git**

Tested on Windows 11 and macOS Sonoma. WSL should work identically.

---

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/<your-org>/assetflow.git
cd assetflow
npm install

# 2. Environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Bring up Postgres (Docker Compose, host port 5433)
npm run db:up

# 4. Apply migrations and seed demo data
npm run db:deploy
npm run db:seed

# 5. Boot API + web app concurrently
npm run dev
```

Then open **http://localhost:5173** and sign in with any of the seeded accounts (all use password `demo1234`):

| Account | Role |
|---|---|
| `admin@artemis.com` | Admin |
| `sarah-manager@artemis.com` | Asset Manager |
| `raj-head@artemis.com` | Department Head |
| `priya-employee@artemis.com` | Employee |

The API runs at `http://localhost:4000/api/v1`. Health check: `GET /health`.

> Prefer a native Postgres instead of Docker? Edit `backend/.env` to point `DATABASE_URL` at your existing server (e.g. `localhost:5432`) and skip `npm run db:up`.

---

## Repository Layout

```
assetflow/
├── backend/                       # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma          # Single source of truth for data model
│   │   ├── migrations/            # Version-controlled SQL migrations
│   │   └── seed.ts                # Demo dataset
│   ├── src/
│   │   ├── app.ts                 # Express composition (helmet, cors, routers)
│   │   ├── server.ts              # HTTP bootstrap
│   │   ├── config/                # env, prisma client
│   │   ├── middleware/            # auth, rbac, error-handler
│   │   ├── modules/               # feature modules (one per resource)
│   │   │   ├── auth/
│   │   │   ├── departments/
│   │   │   ├── categories/
│   │   │   ├── employees/
│   │   │   ├── assets/
│   │   │   ├── allocations/
│   │   │   ├── transfers/
│   │   │   ├── bookings/
│   │   │   ├── maintenance/
│   │   │   ├── audits/
│   │   │   ├── reports/
│   │   │   ├── notifications/
│   │   │   └── activity-logs/
│   │   └── utils/
│   └── tests/                     # Vitest + Supertest
├── frontend/                      # React + Vite SPA
│   └── src/
│       ├── App.tsx                # Router composition
│       ├── main.tsx               # Providers (Query, Toaster)
│       ├── index.css              # Design tokens (OKLCH variables)
│       ├── components/
│       │   ├── layout/            # AppShell, Sidebar, navigation
│       │   ├── shared/            # PageHeader, Feedback, ConfirmDialog
│       │   └── ui/                # Button, Badge, Field
│       ├── features/              # Feature modules (mirrors backend)
│       ├── lib/                   # apiClient, utils
│       ├── routes/                # ProtectedRoute, PublicOnlyRoute, RoleGate
│       └── stores/                # authStore (Zustand)
├── docs/                          # PRD, Architecture, API, Data Model, Security, Contributing
├── docker-compose.yml             # Local Postgres
├── package.json                   # Workspace root
└── README.md
```

---

## Feature Matrix

| Module | Screen | Key business rule |
|---|---|---|
| **Auth** | Login, Signup | Signup always creates `EMPLOYEE`; no role selection |
| **Org Setup** | Departments, Categories, Employee Directory | Admin-only. Role promotion happens *only* here. |
| **Assets** | Directory, Detail (history) | Auto-generated `AF-####` tags via Postgres sequence |
| **Allocations** | List, New, Return | Double-allocation blocked with a Request-Transfer offer |
| **Transfers** | List, Approve, Reject | Atomic swap of custody within a transaction |
| **Bookings** | Calendar, New, Reschedule, Cancel | Overlap uses half-open interval; auto UPCOMING↔ONGOING↔COMPLETED |
| **Maintenance** | Kanban, Raise, Approve/Reject, Assign, Resolve | Asset flips to `UNDER_MAINTENANCE` on approval, back on resolve |
| **Audits** | Cycles list, Cycle detail, Close | MISSING → LOST; DAMAGED → auto HIGH-priority maintenance request |
| **Dashboard** | KPI tiles, overdue returns, upcoming returns | Real-time; refetch every 30s |
| **Reports** | Utilization, Maintenance, Department, Booking heatmap | CSV export per report |
| **Notifications** | Bell + panel, mark-all-read | Polls every 15s |
| **Activity Log** | Admin-only timeline | Every state-changing action is logged |

---

## Roles & Permissions (RBAC)

| Endpoint area | EMPLOYEE | DEPT_HEAD | ASSET_MANAGER | ADMIN |
|---|:---:|:---:|:---:|:---:|
| View own allocations/bookings | ✅ | ✅ | ✅ | ✅ |
| Register asset | ❌ | ❌ | ✅ | ✅ |
| Allocate asset | ❌ | ✅ (own dept) | ✅ | ✅ |
| Approve transfer | ❌ | ✅ (own dept) | ✅ | ✅ |
| Book resource | ✅ | ✅ | ✅ | ✅ |
| Approve maintenance | ❌ | ❌ | ✅ | ✅ |
| Org setup (depts, categories) | ❌ | ❌ | ❌ | ✅ |
| Promote employees | ❌ | ❌ | ❌ | ✅ |
| Create audit cycles | ❌ | ❌ | ❌ | ✅ |
| Perform audit | ✅ (if assigned) | ✅ (if assigned) | ✅ | ✅ |
| Reports / analytics | ❌ | ❌ (dept scope only) | ✅ | ✅ |
| View activity logs | ❌ | ❌ | ❌ | ✅ |

Enforced in Express middleware (`requireRole(...)`) at every route. Frontend uses a `<RoleGate roles={[...]}>` wrapper to hide navigation from unauthorized users, but never *depends on* frontend gating for security.

---

## Data Model

**17 tables, 12 enums, foreign-key-safe.** Full ER diagram and column-by-column reference in [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

**Core entities:**

```
User ─┬─ Employee ─┬─ Allocation ─┐
      │             ├─ Booking ────┼──> Asset ──> AssetCategory
      │             ├─ MaintenanceRequest, TransferRequest, AuditRecord
      │             ├─ AuditAssignment ──> AuditCycle ──> Department
      │             └─ Notification, ActivityLog
      └─ (1:1)                       Department ──> Department (self, hierarchy)
```

Cascade rules are deliberate: user deletion cascades to their `Employee`, but assets, allocations, and audit records use `Restrict` — you can't delete a person out from under their history.

---

## API Surface

Base URL: `/api/v1`. All routes except `/auth/*` require `Authorization: Bearer <jwt>`.

| Prefix | Module |
|---|---|
| `/auth` | signup, login, me |
| `/departments` | Admin CRUD |
| `/categories` | Admin CRUD |
| `/employees` | list, promote, status |
| `/assets` | CRUD, search, detail w/ history |
| `/allocations` | create (with conflict guard), list, return |
| `/transfers` | request, approve, reject |
| `/bookings` | create (with overlap guard), list, reschedule, cancel, `/resources` |
| `/maintenance` | raise, approve, reject, assign, start, resolve |
| `/audit-cycles` | create, assign, activate, close, discrepancies |
| `/audit-records` | mark (verified/missing/damaged) |
| `/reports` | dashboard-kpis, utilization, maintenance-frequency, department-allocation, booking-heatmap, export |
| `/notifications` | list, mark-read, mark-all-read |
| `/activity-logs` | Admin-only filtered list |

Full endpoint contract in [docs/API.md](docs/API.md).

---

## Environment Variables

### `backend/.env`
```env
DATABASE_URL="postgresql://assetflow:assetflow@localhost:5433/assetflow?schema=public"
PORT=4000
NODE_ENV=development
JWT_SECRET="replace-with-at-least-32-random-characters"
JWT_EXPIRES_IN="8h"
CORS_ORIGIN="http://localhost:5173"       # Comma-separated; leave unset to allow all in dev
```

### `frontend/.env`
```env
VITE_API_URL=http://localhost:4000/api/v1
```

Never reuse the demo `JWT_SECRET` or `demo1234` password in production.

---

## Common Commands

Run from the repo root (npm workspaces will dispatch to the right workspace):

| Command | Purpose |
|---|---|
| `npm run dev` | Boot API and web app concurrently |
| `npm run build` | Production build of both apps |
| `npm run typecheck` | TypeScript check across both workspaces |
| `npm test` | Vitest suites (backend + frontend) |
| `npm run db:up` | Start local Postgres via Docker Compose |
| `npm run db:down` | Stop Postgres (data preserved) |
| `npm run db:deploy` | Apply pending migrations (non-destructive) |
| `npm run db:migrate` | Create + apply a new migration (`prisma migrate dev`) |
| `npm run db:reset` | **Drop DB**, recreate, migrate, re-seed |
| `npm run db:seed` | Insert demo dataset |
| `npm run db:studio` | Open Prisma Studio for browsing rows |

---

## Testing

**Backend:** Vitest + Supertest. Coverage across:
- Auth security (signup does not accept role, tokens rejected for inactive/deleted employees)
- Organization RBAC (403 on unauthorized calls)
- Department hierarchy (cycle detection)
- Allocation conflicts (double-block + serialized transfer)
- Booking overlap edge cases (abutting, exact, partial)
- Audit cycle lifecycle (activate → mark → close → auto-consequences)
- Employee role security (no self-promotion)
- Transfer notifications and approval

**Frontend:** Vitest + Testing Library. Coverage on:
- `authStore` persistence and rehydration
- Role-based sidebar navigation filtering
- `ProtectedRoute` redirect logic
- `RoleChangeDialog` requiring email confirmation before granting admin

Current status: **52 backend tests · 9 frontend tests · all green.**

Run everything from the root:
```bash
npm run typecheck
npm test
```

---

## Security Model

Summary — full document in [docs/SECURITY.md](docs/SECURITY.md).

- **Password hashing:** bcryptjs with cost 12
- **JWT:** signed with a min-32-char secret from env, 8-hour default expiry, employee id + role encoded in the token
- **Fresh role every request:** middleware reloads the employee's role from DB on each request, so promotions/demotions take effect on next call — no waiting for token expiry
- **Inactive employees blocked:** even with a valid token, `status !== ACTIVE` fails auth
- **No self-elevating admin:** signup ignores any `role` field client-supplies. Role changes only via `PATCH /employees/:id/promote`, admin-only, and admins cannot promote themselves.
- **Server-side validation everywhere:** Zod schemas parsed inside every controller before touching the service layer
- **CORS allow-list:** `CORS_ORIGIN` restricts browser origins in non-dev
- **Helmet:** default security headers on every response
- **Explicit RBAC:** every route has a `requireRole(...)` guard or documents why it doesn't
- **SQL-safe by construction:** Prisma parameterizes every query — no raw SQL in application code except one migration-friendly sequence utility
- **Activity log is append-only** — no update or delete endpoints exposed for the log itself

---

## Deployment

Not covered by the hackathon submission, but the architecture is deployment-ready:

- **API:** Any Node 20 host (Railway, Render, Fly.io). Set env vars, run `npm run build && npm start`.
- **Frontend:** Any static host (Vercel, Netlify, Cloudflare Pages). `npm run build` outputs `dist/`.
- **DB:** Any managed Postgres 15+ (Neon, Supabase-Postgres, RDS). Run `npx prisma migrate deploy` on release.

---

## Documentation Index

- [docs/PRD.md](docs/PRD.md) — Product Requirements Document
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture & module boundaries
- [docs/API.md](docs/API.md) — Full REST API contract
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — Database schema, ER diagram, indexes
- [docs/SECURITY.md](docs/SECURITY.md) — Threat model, auth, RBAC, hardening
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — Dev workflow, branching, commits
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — Notable changes over the hackathon
- [AssetFlow_Blueprint.md](AssetFlow_Blueprint.md) — Original hackathon implementation plan
- [AssetFlow_UI_Guide.md](AssetFlow_UI_Guide.md) — Screen-by-screen UI specification

---

## Team

**Team Artemis** — Odoo Hackathon submission.

| Member | Owns |
|---|---|
| **Ruchir Kalokhe** · Foundation Engineer | Auth, RBAC, App Shell, Org Setup |
| **Atharva Nivatkar** · Assets & Allocation | Assets, Allocations, Transfers |
| **Harsh Jain** · Bookings & Maintenance | Bookings, Maintenance |
| **Krishna Naicker** · Insights & Notifications | Dashboard, Audits, Reports, Notifications, Activity Logs |

Every teammate commits to `dev` via PR. `main` is protected. Commit prefix convention: `feat(module): …`, `fix(module): …`, `chore: …`.

---

<div align="center">

*Built to be measured on: **database design, modularity, frontend design, performance, security, debugging** — in that order.*

</div>
