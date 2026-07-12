# Architecture — AssetFlow

This document explains **why** the code is shaped the way it is, not just what it does. If you're reading it to onboard, start at §1. If you're reviewing it, skip to §4 (invariants) and §5 (module boundaries).

---

## 1. System Overview

AssetFlow is a **three-tier web application** deployed as two separate processes plus a database:

```
┌───────────────────┐   HTTP + JSON   ┌───────────────────┐   Prisma   ┌───────────┐
│  React SPA        │ ──────────────▶ │  Express API      │ ─────────▶ │ Postgres  │
│  (Vite, port 5173)│ ◀────────────── │  (Node, port 4000)│ ◀───────── │ (5433)    │
└───────────────────┘   Bearer JWT    └───────────────────┘            └───────────┘
```

- The SPA is a **thin client**: it never trusts anything it hasn't received from the API in the current session. Business rules are enforced server-side.
- The API is a **stateless Express service**. State lives in Postgres.
- All persistent state lives in **one relational database** with foreign keys and check-like enum constraints.

## 2. High-Level Component Diagram

```
┌───────────────────────────────── Browser ─────────────────────────────────┐
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │ Auth store       │  │ Query cache      │  │ Router                   │ │
│  │ (Zustand +       │  │ (TanStack Query, │  │ (React Router 7,         │ │
│  │  localStorage)   │  │  stale-time 30s) │  │  <ProtectedRoute>,       │ │
│  └────────┬─────────┘  └────────┬─────────┘  │  <RoleGate>)             │ │
│           │                     │            └────────┬─────────────────┘ │
│           └──────────axios───────────────────────────┘                    │
│                        │ interceptor injects Authorization: Bearer <jwt>  │
└────────────────────────┼──────────────────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌────────────────────────────────── Express API ────────────────────────────┐
│                                                                           │
│   Global middleware chain                                                 │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │  helmet → cors → json → morgan → mount routers → notFound →      │   │
│   │                                                        errorHandler │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   Per-router chain (all except /auth/*)                                   │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │  authenticateToken → requireRole(...) → controller               │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   Modules (one folder each: routes / controller / service / schema)      │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │  auth · departments · categories · employees · assets ·          │   │
│   │  allocations · transfers · bookings · maintenance · audits ·     │   │
│   │  reports · notifications · activity-logs                         │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   Cross-cutting                                                           │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │  notifications/notify.ts       — every service imports notify()  │   │
│   │  activity-logs/service.ts      — every service imports logActivity() │
│   │  utils/app-error.ts            — typed AppError                  │   │
│   │  middleware/error-handler.ts   — translates Zod, AppError, Prisma │
│   └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬────────────────────────────────────────┘
                                   │  Prisma client (type-safe SQL)
                                   ▼
┌────────────────────────────────── PostgreSQL 15 ──────────────────────────┐
│  17 tables · 12 enums · foreign keys · unique constraints · indexes ·     │
│  version-controlled migrations                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

## 3. Request Lifecycle (worked example)

**Scenario:** Priya, an EMPLOYEE, tries to allocate asset `AF-0001` to herself. The asset is already allocated.

```
1. Frontend
   POST /api/v1/allocations
   headers: Authorization: Bearer eyJhbGc...
   body:    { assetId, employeeId, expectedReturnDate }

2. Express global middleware
   helmet → cors → json → morgan (log line printed)

3. Router middleware for /api/v1/allocations
   authenticateToken:
     - Parses Bearer token
     - Verifies JWT signature (jwt.verify with env.JWT_SECRET)
     - Reads employee.role FRESH from DB (not the token)
     - Rejects if status !== ACTIVE
     - Sets request.auth = { userId, employeeId, email, role }
   requireRole('EMPLOYEE','DEPT_HEAD','ASSET_MANAGER','ADMIN'): passes

4. Controller
   - Zod parses request.body (throws ZodError on invalid)
   - Calls allocations.service.createAllocation(input, actor)

5. Service (business logic)
   - Loads asset, checks status
   - Finds status = ALLOCATED
   - Throws new AppError(409, 'ALLOCATION_CONFLICT',
       'Asset is currently allocated', { currentHolder })

6. errorHandler middleware
   - Catches AppError, responds:
     HTTP/1.1 409 Conflict
     Content-Type: application/json
     { "error": { "code":"ALLOCATION_CONFLICT",
                  "message":"Asset is currently allocated",
                  "details": { "currentHolder": { ... } } } }

7. Frontend
   - axios rejects the promise, error.response.data.error is
     read by useMutation onError
   - UI opens a modal: "Held by <name> — Request Transfer?"
```

Notice what did NOT happen: no half-written allocation row, no orphan asset status change. All-or-nothing.

## 4. Design Invariants (things we never violate)

| Invariant | Enforced by |
|---|---|
| **Signup never grants a role above EMPLOYEE** | `auth.service.signup` ignores any client-supplied role |
| **Role is read from DB on every request**, not from token | `authenticateToken` reloads role |
| **State transitions are atomic** | Every multi-write is inside `prisma.$transaction` |
| **No duplicate allocation on a single asset** | Explicit status check + status-field update in the same transaction |
| **No overlapping bookings on a single asset** | `findFirst` with `[start, end)` half-open interval before insert |
| **UNDER_MAINTENANCE only via approved MaintenanceRequest** | Only `maintenance.service.approve` flips the status |
| **LOST only via closed audit cycle** | Only `audits.service.closeAuditCycle` flips MISSING assets |
| **Notifications and logs never block business writes** | `notify()` and `logActivity()` wrapped in try/catch |
| **Every list endpoint scopes by role** | Service reads `actor.role` and filters (e.g. `scope: 'mine'` fallback for employees) |
| **All input parsed with Zod at the controller** | Zod schemas per module; controller calls `.parse()` |

## 5. Module Boundaries

Every backend module follows the same four-file shape:

```
src/modules/<name>/
  <name>.routes.ts        # Express Router; mounts middleware in order
  <name>.controller.ts    # HTTP layer: parse input, call service, respond
  <name>.service.ts       # Business logic; only file that touches prisma
  <name>.schema.ts        # Zod input/query schemas and inferred TS types
```

**Rules:**
1. **Controllers never import prisma.** They call the service.
2. **Services never import Express types.** They receive plain `actor` objects.
3. **Schemas are the only source of truth for TS types** — inferred with `z.infer<>`.
4. **Cross-module calls go through the service export**, never through another controller.

Frontend features mirror this shape:

```
src/features/<name>/
  api.ts                  # apiClient wrapper + query keys
  pages/                  # route-level components (Page.tsx)
  components/             # feature-local components (Dialog, Row, etc.)
  utils.ts                # date/format helpers etc.
```

**Rules:**
1. **Pages own routing and layout.** They don't fetch data directly — they call hooks from `api.ts`.
2. **Reusable UI lives in `components/ui/` at the app root.** Feature-local UI stays in the feature.
3. **Every list page implements the four states**: loading skeleton, error banner, empty state, populated table/grid.

## 6. State Management on the Frontend

Two stores, each with a narrow role:

| Store | Purpose | Lifetime |
|---|---|---|
| **`authStore` (Zustand)** | Current token, current user, `hasHydrated` flag for the pre-mount check | Persists to `localStorage` |
| **TanStack Query cache** | All server data (departments, assets, bookings, notifications, KPIs, …) | Per-tab, refetched on mount + `staleTime` boundary |

No Redux, no Context outside these two — everything else is React local state.

**Refetch cadences:**
- Dashboard KPIs: every 30s
- Notifications: every 15s (bell polling)
- Everything else: on tab focus + manual `invalidateQueries` after mutation

## 7. Error Handling

A single classifier in `middleware/error-handler.ts` translates every error type into a stable HTTP shape:

```ts
{
  error: {
    code: string,     // stable, machine-readable
    message: string,  // human-readable
    details?: any     // structured, only when useful
  }
}
```

| Error type | HTTP status | `code` example |
|---|---|---|
| `ZodError` | 400 | `VALIDATION_ERROR` |
| `AppError` | as thrown | `ALLOCATION_CONFLICT`, `BOOKING_OVERLAP`, `FORBIDDEN` |
| Prisma `P2002` | 409 | `CONFLICT` |
| Prisma `P2003` | 409 | `RECORD_IN_USE` |
| Prisma `P2025` | 404 | `NOT_FOUND` |
| Anything else | 500 | `INTERNAL_SERVER_ERROR` (details only in dev) |

The frontend's `getErrorMessage` walks this shape to render toasts and inline errors.

## 8. Database Choices

**Postgres, not MySQL, not Mongo.** Reasons:

1. Odoo itself runs on Postgres — this signals credibility to the judges.
2. Native support for JSONB (used in `AssetCategory.customFields`).
3. Sequences and transactions are first-class.
4. Prisma's Postgres adapter is its most mature.

**Migration-first.** No auto-syncing at boot. Every schema change goes through `prisma migrate` and produces a committed SQL file. Two migrations exist:
- `20260712000000_init` — the whole 17-table schema
- `20260712110000_transfer_decision_notes_and_asset_tag_sequence` — adds `TransferRequest.decisionNotes` and creates the `asset_tag_sequence` Postgres sequence used to generate `AF-####` tags atomically

**Indexing strategy.** We index everything a list endpoint filters or sorts by:
- `Asset(status)`, `Asset(categoryId)`, `Asset(isBookable, status)`
- `Allocation(assetId, status)`, `Allocation(employeeId, status)`
- `Booking(assetId, startTime, endTime)` — supports the overlap query directly
- `MaintenanceRequest(assetId, status)`, `(priority, status)`
- `Notification(employeeId, isRead)` — supports the unread badge count
- `ActivityLog(employeeId, createdAt)`, `(entityType, entityId)`

## 9. Concurrency & Transactions

Every mutation that touches more than one row is wrapped in `prisma.$transaction`. Examples:

| Action | Rows touched atomically |
|---|---|
| Create allocation | `Allocation` (create) + `Asset` (status update) |
| Return allocation | `Allocation` (update) + `Asset` (status update) |
| Approve transfer | old `Allocation` (update) + new `Allocation` (create) + `TransferRequest` (update) + `Asset` (unchanged, status stays ALLOCATED) |
| Approve maintenance | `MaintenanceRequest` (update) + `Asset` (status → UNDER_MAINTENANCE) |
| Resolve maintenance | `MaintenanceRequest` (update) + `Asset` (status → AVAILABLE) |
| Close audit cycle | `AuditCycle` (update) + every MISSING `Asset` (status → LOST) + every DAMAGED asset gets a new `MaintenanceRequest` |

For hot-contention rows (a single asset receiving concurrent allocation attempts), the transaction plus an explicit status check gives us optimistic concurrency for free — the second writer either sees the updated status inside the transaction or hits the unique-holder invariant.

## 10. Observability

**Server-side:**
- `morgan` logs every request in dev format (`dev`) or `combined` in prod
- `console.error` for anything unexpected (Prisma unknown errors, notify failures)
- `ActivityLog` table is the durable audit trail

**Client-side:**
- Sonner toasts for success + error visibility
- React Query devtools available in dev via browser extension
- No third-party telemetry (privacy-first + no external calls)

## 11. Testing Strategy

**Unit + integration mix.**

**Backend (Vitest + Supertest):**
- Auth security: signup role forcing, token rejection paths, inactive employee blocking
- RBAC: 403 for unauthorized calls per route family
- Business rules: allocation conflict, allocation overdue, department hierarchy cycles, booking overlap edges, audit cycle full lifecycle, transfer notifications
- Full HTTP surface via `supertest(app)` — the same middleware chain the client hits

**Frontend (Vitest + Testing Library):**
- Store persistence and rehydration
- Router redirects for `<ProtectedRoute>` and `<RoleGate>`
- Interaction tests where behavior is non-trivial (`RoleChangeDialog` requires typing the employee's email before admin promotion)

Total: **52 backend + 9 frontend = 61 tests**, all green.

## 12. What's *not* in this architecture

Being explicit about what the design **doesn't** try to be:

- **Not multi-tenant.** One DB per organization.
- **Not real-time.** Notifications poll every 15s.
- **Not event-sourced.** The `ActivityLog` is an audit trail, not the source of truth.
- **Not microservices.** One API, one DB. Modularity is inside the monolith.
- **Not queue-backed.** Notifications happen in-process; there's no worker pool.

Those are all sensible next steps for a production scale-out, but adding them here would trade real ERP fundamentals for infrastructure theatre — which is not what the hackathon rewards.
