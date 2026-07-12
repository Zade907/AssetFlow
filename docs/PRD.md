# Product Requirements Document — AssetFlow

**Product name:** AssetFlow
**Product type:** Enterprise Asset & Resource Management (SaaS-style single-tenant web app)
**Owner:** Team Artemis
**Status:** Hackathon MVP · Ready for demo
**Last updated:** 2026-07-12

---

## 1. Problem Statement

Organizations of every kind — schools, hospitals, offices, factories, agencies — own physical assets: laptops, projectors, meeting rooms, vehicles, tools. Today the majority still track these in spreadsheets and paper logs, which leads to:

- **Loss of custody visibility** — no reliable answer to "who has laptop AF-0114?"
- **Double-booking** — two people show up to the same meeting room
- **Missed maintenance** — assets break because service is never scheduled
- **Untracked lifecycle transitions** — nobody remembers when a projector was retired
- **No audit trail** — reconciliation cycles are done from memory
- **Ad-hoc role escalation** — everyone becomes "admin" of the spreadsheet

AssetFlow replaces the spreadsheet with a structured ERP module: a database-backed, role-aware, workflow-driven system that any organization can configure to fit its structure.

## 2. Goals and Non-Goals

### 2.1 Goals

| # | Goal | Measured by |
|---|---|---|
| G1 | Register any physical asset with an auto-generated tag, category, condition, and location | New assets can be searched by tag, name, serial, or QR |
| G2 | Prevent double-allocation of any asset | An attempt returns `409` with the current holder and offers a transfer |
| G3 | Prevent overlapping bookings on shared resources | An attempt returns `409` with the conflicting booking |
| G4 | Route repair work through explicit approvals | Asset status only enters `UNDER_MAINTENANCE` via an approved `MaintenanceRequest` |
| G5 | Run structured audit cycles with auto-consequences on close | Missing assets become `LOST`; damaged assets get an auto HIGH-priority maintenance request |
| G6 | Provide role-scoped operational visibility | Dashboard KPIs + overdue-returns tile + notifications bell + activity log |
| G7 | Enforce role hierarchy that admins alone control | Signup ignores any role field; only admins can call `promote` |

### 2.2 Non-Goals

Explicitly **out of scope** for this product:

- Purchasing / procurement
- Invoicing / billing / accounting
- Vendor management
- Payroll or HR (beyond a name & department)
- Fleet telematics or IoT integration
- Time tracking

If your ERP needs any of the above, they belong in a sibling module. AssetFlow does not sneak them in.

## 3. Target Users & Personas

| Persona | Role in the org | Uses AssetFlow to… |
|---|---|---|
| **Anita — Admin** | Ops manager, tech-savvy | Set up departments, categories, promote colleagues to management roles |
| **Sarah — Asset Manager** | IT asset lead | Register new assets, allocate them, approve transfers and maintenance, run audits |
| **Raj — Department Head** | Engineering lead | See his team's assets, approve transfers into his dept, book conference rooms on team behalf |
| **Priya — Employee** | Individual contributor | See what she's holding, book a meeting room, raise a maintenance request, return an asset |
| **Alex — Auditor (temporary role)** | Rotating auditor | Verify each asset in a cycle scope; mark as verified/missing/damaged with notes |

All personas share **one** frontend and **one** API — the difference is what they can *do*, not what they *see*.

## 4. User Stories

### 4.1 Onboarding
- As a new hire, when I sign up I get an **Employee** account by default; I cannot pick a role.
- As an admin, I can promote an active employee to Department Head, Asset Manager, or Admin from the Employee Directory — nowhere else.
- As an admin, I cannot promote or demote myself.

### 4.2 Assets
- As an asset manager, I can register a new asset with a unique auto-generated tag (`AF-0001` format).
- As anyone, I can search all assets by tag, name, serial number, category, status, or location.
- As anyone, I can open an asset and see who has had it, when, and what maintenance it received.

### 4.3 Allocations & Transfers
- As an asset manager, when I try to allocate an asset that is already allocated, the system blocks me and shows the current holder plus a "Request Transfer" button.
- As an employee holding an asset, I can submit a return with a condition note and (optional) issue description.
- As a manager, I can approve a transfer request — custody moves atomically, both employees are notified.

### 4.4 Bookings
- As anyone, I can see a resource's upcoming bookings on a calendar.
- As anyone, when I try to book an overlapping time slot, the system blocks me and shows which existing booking conflicts.
- As the booking owner or a manager, I can cancel or reschedule a booking.

### 4.5 Maintenance
- As anyone, I can raise a maintenance request against an asset with priority and description.
- As an asset manager, I can approve — this atomically flips the asset to `UNDER_MAINTENANCE`.
- As an asset manager (or assigned technician), I can mark work in progress and resolve — this flips the asset back to `AVAILABLE`.

### 4.6 Audits
- As an admin, I can create an audit cycle scoped to a department or location, with a start/end date.
- As an admin, I can assign auditors to a cycle.
- As an admin, I can activate the cycle — the system materializes a checklist of every in-scope asset.
- As an assigned auditor, I can mark each asset **verified / missing / damaged** with notes.
- As an admin, I can close the cycle — missing → `LOST`, damaged → auto HIGH-priority maintenance request, cycle becomes read-only, other auditors get notified.

### 4.7 Insights & Notifications
- As anyone, my dashboard shows real KPIs based on my role's scope.
- As anyone, my notification bell shows unread events (transfer approved, maintenance approved, booking confirmed, overdue return, audit discrepancy).
- As an admin, I can browse a filterable activity log of every state-changing action across the org.

## 5. Functional Requirements

### 5.1 Auth
- FR-1.1 Email + password login, 8-hour JWT.
- FR-1.2 Signup creates `role=EMPLOYEE` regardless of request body.
- FR-1.3 On every request, role is re-read from DB so promotions take effect immediately.
- FR-1.4 Inactive employees cannot authenticate.

### 5.2 Assets
- FR-2.1 Asset tag auto-generated via a Postgres sequence.
- FR-2.2 Categories carry optional `customFields` JSON (e.g. warranty period for Electronics).
- FR-2.3 Deleting a category with assets is refused (409).
- FR-2.4 Deleting an allocated asset is refused (409).

### 5.3 Allocations
- FR-3.1 `POST /allocations` enforces `asset.status === AVAILABLE`; otherwise returns 409 with `currentHolder` in the details.
- FR-3.2 On success, transaction creates `Allocation` and updates `Asset.status = ALLOCATED`.
- FR-3.3 Return closes the allocation and flips asset back to `AVAILABLE`.
- FR-3.4 Allocations past `expectedReturnDate` are surfaced as **overdue** on the dashboard.

### 5.4 Transfers
- FR-4.1 A transfer request must reference the current holder in `fromEmployeeId`; mismatches return 409.
- FR-4.2 Approval is a single transaction: old allocation → `RETURNED`, new allocation created for `toEmployeeId`, asset remains `ALLOCATED`.
- FR-4.3 Both parties receive notifications on approval or rejection.
- FR-4.4 Rejection reason is persisted in `TransferRequest.decisionNotes`.

### 5.5 Bookings
- FR-5.1 Overlap check uses the half-open interval `[start, end)` — abutting slots (e.g. `10:00–11:00` right after `09:00–10:00`) are legal.
- FR-5.2 Bookings past their end time auto-transition to `COMPLETED` on any list read.
- FR-5.3 Non-bookable assets are rejected at booking time.
- FR-5.4 Bookings on `UNDER_MAINTENANCE` assets are rejected (409).

### 5.6 Maintenance
- FR-6.1 Raising a request does not change asset status.
- FR-6.2 Approval flips `Asset.status → UNDER_MAINTENANCE` in the same transaction.
- FR-6.3 Resolution flips it back to `AVAILABLE` (unless it was retired/disposed in between).

### 5.7 Audits
- FR-7.1 Activation materializes an `AuditRecord` for every asset in scope.
- FR-7.2 Only assigned auditors (or asset managers / admins) can mark records.
- FR-7.3 Close is a transaction: MISSING → `LOST`, DAMAGED → HIGH-priority maintenance request, other auditors notified, cycle locked.

### 5.8 Notifications
- FR-8.1 Notifications are user-scoped: a user only sees their own.
- FR-8.2 Business events (allocation, transfer, booking, maintenance, audit close) call `notify()` fire-and-forget — a notification failure never blocks the primary write.

### 5.9 Activity Log
- FR-9.1 Every state-changing action is appended to `ActivityLog` (append-only).
- FR-9.2 Only admins can query the log.

## 6. Non-Functional Requirements

| Concern | Target |
|---|---|
| **Latency (p50)** | < 100 ms for reads, < 250 ms for writes on a laptop-class dev DB |
| **Availability** | Not a hackathon concern; production would target 99.5% |
| **Auditability** | 100% of state-changing routes logged to `ActivityLog` |
| **Accessibility** | Keyboard-navigable, focus-visible, semantic HTML, ARIA on custom controls |
| **Responsiveness** | Sidebar collapses under 1024 px; layout adapts to mobile |
| **Browser support** | Latest 2 versions of Chrome, Firefox, Safari, Edge |
| **Security** | Bcrypt cost 12, JWT signed with min-32-char secret, RBAC in middleware, CORS allow-list, Helmet defaults |
| **Data integrity** | Every multi-step state transition uses a Prisma transaction |

## 7. Success Metrics

For a hackathon submission, "success" is judged not in production KPIs but in what the judges will grade on:

| Criterion | How we score |
|---|---|
| Database design | 17 tables, meaningful FK topology, indexed hot paths, atomic transitions |
| Modularity | 13 backend modules · 12 frontend feature folders, one shape everywhere |
| Frontend design | Consistent design tokens, role-aware nav, empty/error/loading states |
| Performance | Indexed queries, memoized React Query, no waterfalls |
| Security | Bcrypt, JWT, RBAC middleware, no self-elevation, server-side validation |
| Debugging | Clear error codes, structured `AppError`, activity log, request logging |

## 8. Milestones

| Phase | Scope | Owner(s) | Status |
|---|---|---|---|
| Phase 0 | Repo scaffold, Docker, env, Prisma | P1 | ✅ |
| Phase 1 | Auth, RBAC, Org Setup, App Shell | P1 | ✅ |
| Phase 2a | Assets, Allocations, Transfers | P2 | ✅ |
| Phase 2b | Bookings, Maintenance | P3 | ✅ |
| Phase 2c | Dashboard, Audits, Reports, Notifications, Activity Log | P4 | ✅ |
| Phase 3 | Cross-module wiring (notify + logActivity in every service) | All | ✅ |
| Phase 4 | Demo prep, seed data, docs | All | ✅ |

## 9. Open Questions / Future Work

Not in the current MVP; documented so nothing gets promised:

- **Photo upload** for assets and maintenance — currently a URL field, not a real upload pipeline.
- **Multi-tenant** support — currently single-tenant per DB.
- **SSO / SAML** — currently email + password only.
- **Real-time push** for notifications — currently polling every 15 seconds.
- **Mobile app** — the SPA is responsive but not a native shell.
- **Delegated approvals** — Department Heads cannot yet delegate their approval authority.
- **Booking recurrence** — every booking is a single interval today.
- **Custom report builder** — reports are fixed views; no ad-hoc query UI.

## 10. Glossary

| Term | Meaning |
|---|---|
| **Asset** | Any physical thing the org owns and tracks |
| **Allocation** | An asset assigned to a specific employee |
| **Transfer** | A request to move an allocation from one employee to another |
| **Booking** | A time-slot reservation of a shared, bookable asset |
| **Maintenance Request** | A workflow tracking repair on an asset |
| **Audit Cycle** | A scoped, time-bounded verification pass over a set of assets |
| **RBAC** | Role-Based Access Control — permissions determined by role |
| **Overdue** | An allocation past its `expectedReturnDate` while still `ACTIVE` |
