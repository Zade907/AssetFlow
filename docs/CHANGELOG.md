# Changelog — AssetFlow

All notable changes to AssetFlow are documented here. Format loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Because this is a hackathon build compressed into a single day, individual commits map to sections rather than semantic versions.

---

## [0.1.0] — Hackathon MVP · 2026-07-12

### Foundation (Phase 0–1)
- npm workspaces monorepo split into `backend/` and `frontend/`
- Docker Compose for PostgreSQL 15 (host port `5433`)
- Prisma schema: 17 tables, 12 enums, foreign keys and indexes
- Seed script: 3 departments, 5 categories, 11 employees, 6 assets, 1 booking, 1 maintenance request
- Express API scaffolded with Helmet, CORS, Morgan, structured error handler
- Auth module (`/auth`) — signup (Employee-only), login, `/auth/me`
- `authenticateToken` middleware re-reads role from DB on every request
- `requireRole(...)` middleware for coarse-grained RBAC
- React SPA with Vite + Tailwind CSS 4, OKLCH-based design tokens
- Zustand `authStore` persisting to `localStorage` with a hydration flag
- Axios `apiClient` with bearer-token interceptor
- App shell: role-filtered sidebar, mobile-collapsing layout
- `ProtectedRoute`, `PublicOnlyRoute`, `RoleGate` route wrappers

### Organization Setup (Phase 2 · P1)
- Departments CRUD with parent/hierarchy cycle detection
- Categories CRUD with `customFields` JSONB support
- Employee Directory with promote and status endpoints
- `RoleChangeDialog` requires typing the employee's email before granting admin

### Assets & Custody (Phase 2 · P2)
- Auto-generated asset tags (`AF-####`) via Postgres sequence
- Asset directory with search, filters, pagination
- Asset detail with allocation + maintenance + transfer history tabs
- Allocations with **double-allocation block**, returning `409 ALLOCATION_CONFLICT` and the current holder's data
- Return flow with `conditionOnReturn` notes
- Transfers workflow: request → approve (atomic swap) → reject with `decisionNotes`
- Overdue detection for allocations past `expectedReturnDate`

### Bookings & Maintenance (Phase 2 · P3)
- `/bookings/resources` endpoint returns only `isBookable=true` assets not in a locked status
- **Booking overlap validation** using half-open interval `[start, end)` — abutting slots legal
- Auto UPCOMING ↔ ONGOING ↔ COMPLETED status transitions on list reads
- Cancel + reschedule endpoints, both re-check overlap
- Maintenance kanban: Pending → Approved → Assigned → In Progress → Resolved
- **Approval flips asset to `UNDER_MAINTENANCE`** in the same transaction
- Resolution flips it back to `AVAILABLE`
- Priority levels (LOW / MEDIUM / HIGH / CRITICAL) surface visually

### Insights, Audits & Cross-Cutting (Phase 2 · P4)
- Dashboard KPIs endpoint: 7 real numbers refreshed every 30s
- Overdue-returns and upcoming-returns callouts on dashboard
- Audit cycles module: draft → assign auditors → activate → mark records → close
- **Close-cycle auto-consequences:** MISSING → asset `LOST`; DAMAGED → HIGH-priority `MaintenanceRequest`; other auditors notified
- Reports: utilization, maintenance frequency by asset+category, department allocation, booking heatmap (7 × 24 grid)
- CSV export per report
- Notifications: bell dropdown polling every 15s, mark-one-read, mark-all-read
- ActivityLog: append-only, admin-only, filterable by employee/entity/date

### Cross-module wiring (Phase 3)
- `notify()` called in every business flow: allocations, transfers, bookings, maintenance, audits
- `logActivity()` called in every state-changing service
- Both helpers wrapped in `try/catch` so audit/notification failures never break the primary write
- Sidebar hides `/org-setup` and `/activity-logs` for non-admins
- Sonner toast provider mounted globally

### Testing (Phase 3)
- **52 backend tests** (Vitest + Supertest): auth security, RBAC, department hierarchy, allocation conflict, allocation overdue, booking overlap, audit cycle lifecycle, employee role security, transfer notifications, organization validation
- **9 frontend tests** (Vitest + Testing Library): auth store, sidebar filtering, ProtectedRoute redirects, RoleChangeDialog

### Documentation (Phase 4)
- Comprehensive `README.md` with architecture diagram
- `docs/PRD.md` — Product Requirements Document
- `docs/ARCHITECTURE.md` — technical deep dive with worked request-lifecycle example
- `docs/API.md` — full REST contract, every endpoint and error code
- `docs/DATA_MODEL.md` — every table, index, cascade rule
- `docs/SECURITY.md` — auth, RBAC, threat model, non-goals
- `docs/CONTRIBUTING.md` — dev workflow, conventions, PR checklist
- `docs/CHANGELOG.md` — this file

### Fixes during verification
- `backend/tsconfig.json` — reverted `moduleResolution` from `"Bundler"` (incompatible with `module: CommonJS`) back to `"Node"` with `"ignoreDeprecations": "5.0"`
- `logActivity()` wrapped in `try/catch` to prevent audit-log failures from breaking business writes
- Regenerated Prisma client so `TransferRequest.decisionNotes` (declared in schema, added by migration `20260712110000`) is recognized by the type checker
- Removed unused imports (`BarChart3`, `ModulePlaceholderPage`) from `App.tsx`

### Known gaps left for future work
- Allocations don't yet call `notify()` — the allocatee isn't pinged when an asset is assigned to them
- No seeded active allocation or active audit cycle — demo works but starts with empty KPIs
- No image upload pipeline for assets/maintenance photos (URL field only)
- No real-time push for notifications (polling every 15s)
- No multi-tenant support
- `package.json#prisma` deprecation warning from Prisma 6.19 — non-blocking
