# Data Model — AssetFlow

Single source of truth: `backend/prisma/schema.prisma`. This doc summarizes the model for reviewers and onboarding — every field, index, and cascade rule is intentional.

## 1. Entity-Relationship Overview

```
                           ┌───────────────┐
                           │     User      │
                           │  email PK     │
                           │  passwordHash │
                           └───────┬───────┘
                                   │ 1:1
                                   ▼
              ┌────────────────Employee───────────────┐
              │ id · name · email · role · status     │
              │ departmentId ── FK ──▶ Department     │
              └──┬──────────┬─────┬──────┬────────┬───┘
                 │          │     │      │        │
        Allocation  Booking  MaintenanceReq  TransferReq  AuditAssignment
        (asset)     (asset)  (asset)         (asset)      (auditCycle)
                 │
                 ▼
              Asset ─────▶ AssetCategory
                │
                └─▶ AuditRecord ─▶ AuditCycle ─▶ Department (scope)

              Notification    ActivityLog
              (employee)      (employee)
```

## 2. Enums

| Enum | Values |
|---|---|
| `Role` | `EMPLOYEE`, `DEPARTMENT_HEAD`, `ASSET_MANAGER`, `ADMIN` |
| `EmployeeStatus` | `ACTIVE`, `INACTIVE` |
| `AssetStatus` | `AVAILABLE`, `ALLOCATED`, `RESERVED`, `UNDER_MAINTENANCE`, `LOST`, `RETIRED`, `DISPOSED` |
| `AssetCondition` | `NEW`, `GOOD`, `FAIR`, `POOR` |
| `AllocationStatus` | `ACTIVE`, `RETURNED`, `OVERDUE` |
| `TransferStatus` | `REQUESTED`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED` |
| `BookingStatus` | `UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED` |
| `MaintenanceStatus` | `PENDING`, `APPROVED`, `REJECTED`, `TECHNICIAN_ASSIGNED`, `IN_PROGRESS`, `RESOLVED` |
| `MaintenancePriority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `AuditCycleStatus` | `DRAFT`, `ACTIVE`, `CLOSED` |
| `AuditRecordStatus` | `PENDING`, `VERIFIED`, `MISSING`, `DAMAGED` |

## 3. Table Catalogue (17 tables)

### 3.1 Identity

**`User`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | text UNIQUE | |
| passwordHash | text | bcrypt cost 12 |
| createdAt / updatedAt | timestamptz | |

**Cascades:** deleting a `User` cascades to their `Employee` — user account and profile are one identity.

---

**`Employee`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| userId | uuid UNIQUE FK → User | 1:1 |
| name | text | |
| email | text UNIQUE | Denormalized copy of `User.email` for reporting speed |
| departmentId | uuid FK → Department | `SetNull` on delete |
| role | Role enum | Default `EMPLOYEE` |
| status | EmployeeStatus | Default `ACTIVE` |

**Indexes:** `(departmentId)`, `(role, status)` — supports the Employee Directory filter + the "active managers" lookup used during allocation.

---

### 3.2 Organization

**`Department`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text UNIQUE | |
| code | text UNIQUE | Uppercase, alphanumeric + `_-` |
| parentDepartmentId | uuid FK → Department | Self-relation; `Restrict` on delete |
| headEmployeeId | uuid FK → Employee | `SetNull` on delete |
| status | EmployeeStatus | |

**Constraints (application-level):** hierarchy cycles rejected at write time.

---

**`AssetCategory`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text UNIQUE | |
| description | text? | |
| customFields | jsonb? | e.g. `{ "warrantyMonths": "number" }` |
| status | EmployeeStatus | |

---

### 3.3 Assets & Custody

**`Asset`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assetTag | text UNIQUE | Format `AF-0001`, generated from Postgres sequence |
| name | text | |
| categoryId | uuid FK → AssetCategory | `Restrict` on delete |
| serialNumber | text? UNIQUE | |
| acquisitionDate | timestamptz | |
| acquisitionCost | decimal(12,2) | |
| condition | AssetCondition | Default `GOOD` |
| location | text | |
| photoUrl | text? | URL string (no upload pipeline in MVP) |
| isBookable | bool | Drives inclusion in `/bookings/resources` |
| status | AssetStatus | State machine's authoritative field |
| customData | jsonb? | Category-specific overrides |

**Indexes:** `(status)`, `(categoryId)`, `(isBookable, status)` — supports directory filters and bookable lookup.

---

**`Allocation`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assetId | uuid FK → Asset | `Restrict` — allocations survive asset deletion attempts |
| employeeId | uuid FK → Employee | `Restrict` |
| allocatedAt | timestamptz | `now()` default |
| expectedReturnDate | timestamptz? | Nullable — some allocations are open-ended |
| returnedAt | timestamptz? | |
| conditionOnReturn | AssetCondition? | |
| notes | text? | |
| status | AllocationStatus | `ACTIVE` / `RETURNED` / `OVERDUE` |
| allocatedById | uuid FK → Employee | Who performed the allocation |

**Indexes:** `(assetId, status)`, `(employeeId, status)`, `(allocatedById)` — the first supports the double-allocation guard.

---

**`TransferRequest`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assetId | uuid FK → Asset | |
| fromEmployeeId | uuid FK → Employee | Must match current holder at approve time |
| toEmployeeId | uuid FK → Employee | Must be `ACTIVE` |
| reason | text | |
| status | TransferStatus | |
| approvedById | uuid? FK → Employee | |
| decisionNotes | text? | Approval or rejection reason |
| decidedAt | timestamptz? | |
| requestedAt | timestamptz | |

---

### 3.4 Bookings

**`Booking`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assetId | uuid FK → Asset | |
| employeeId | uuid FK → Employee | |
| startTime | timestamptz | |
| endTime | timestamptz | |
| purpose | text | |
| status | BookingStatus | Auto-transitioned on list reads |

**Indexes:** `(assetId, startTime, endTime)` — supports the overlap-guard query without a full scan. Also `(employeeId, startTime)`, `(status)`.

**Application-level guard:** `startTime < endTime`; overlap uses half-open interval `[start, end)`.

---

### 3.5 Maintenance

**`MaintenanceRequest`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| assetId | uuid FK → Asset | |
| raisedById | uuid FK → Employee | |
| description | text | |
| priority | MaintenancePriority | |
| photoUrl | text? | |
| status | MaintenanceStatus | State machine |
| assignedTechnicianId | uuid? FK → Employee | `SetNull` on delete |
| approvedById | uuid? FK → Employee | `SetNull` on delete |
| resolvedAt | timestamptz? | |
| resolutionNotes | text? | |

**Indexes:** `(assetId, status)`, `(raisedById, status)`, `(assignedTechnicianId)`, `(priority, status)` — supports the Kanban board and priority-filtered lists.

---

### 3.6 Audits

**`AuditCycle`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| scopeDepartmentId | uuid? FK → Department | Nullable — cycles can be location-only |
| scopeLocation | text? | Free text location filter |
| startDate / endDate | timestamptz | Validated `endDate > startDate` |
| status | AuditCycleStatus | `DRAFT` → `ACTIVE` → `CLOSED` |
| createdById | uuid FK → Employee | |
| closedAt | timestamptz? | |

**`AuditAssignment`** — join table between cycles and auditors. `UNIQUE(auditCycleId, auditorId)`.

**`AuditRecord`** — per-asset, per-cycle row. `UNIQUE(auditCycleId, assetId)` — every in-scope asset appears exactly once per cycle.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| auditCycleId | uuid FK → AuditCycle | Cascade delete with cycle |
| assetId | uuid FK → Asset | |
| auditorId | uuid? FK → Employee | The auditor who marked it |
| status | AuditRecordStatus | `PENDING` / `VERIFIED` / `MISSING` / `DAMAGED` |
| notes | text? | |
| recordedAt | timestamptz? | |

---

### 3.7 Cross-cutting

**`Notification`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| employeeId | uuid FK → Employee | Cascade on delete |
| type | text | Stable code, e.g. `BOOKING_CONFIRMED` |
| title, message | text | |
| relatedEntityType, relatedEntityId | text? | Loose join to the source entity |
| isRead | bool | Default `false` |
| createdAt | timestamptz | |

**Indexes:** `(employeeId, isRead)` supports the unread-badge count.

---

**`ActivityLog`** — append-only.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| employeeId | uuid FK → Employee | `Restrict` — you can't delete a person out from under their history |
| action | text | e.g. `ALLOCATION_CREATED` |
| entityType | text | e.g. `Asset` |
| entityId | text (uuid string) | |
| details | jsonb? | Diff or context for the action |
| ipAddress | text? | |
| createdAt | timestamptz | |

**Indexes:** `(employeeId, createdAt)`, `(entityType, entityId)` — supports both the person and entity audit views.

---

## 4. Cascade Summary

| From | To | Rule | Reason |
|---|---|---|---|
| User | Employee | Cascade | Account & profile are one identity |
| Department | Department (parent) | Restrict | Cannot orphan a subtree |
| Department | Employee | SetNull | Keep employees, drop the link |
| AuditCycle | AuditAssignment, AuditRecord | Cascade | Cycle owns its rows |
| Asset | Allocation, Booking, MaintenanceRequest, TransferRequest, AuditRecord | Restrict | History is sacrosanct |
| Employee | Allocation (as employee), TransferRequest (from/to), AuditRecord | Restrict | Same |

## 5. Sequences & Special Objects

- **`asset_tag_sequence`** — Postgres `SEQUENCE`, integer, starts at 1. `nextval` is called inside `nextAssetTag()` to atomically claim the next `AF-####` tag. Seed script advances the sequence past the seeded highwater mark.

## 6. Migration History

Committed migrations (in `backend/prisma/migrations/`):

1. **`20260712000000_init`** — the whole 17-table schema
2. **`20260712110000_transfer_decision_notes_and_asset_tag_sequence`** — adds `TransferRequest.decisionNotes` and creates the `asset_tag_sequence` object

Apply with `npm run db:deploy` (non-destructive) or recreate from scratch with `npm run db:reset` (destructive; dev-only).

## 7. Query Hot Paths

Documented so future indexing is data-driven, not vibes:

| Query | Uses index |
|---|---|
| Double-allocation guard: `Allocation where assetId=X and status=ACTIVE` | `(assetId, status)` |
| Overlap guard: `Booking where assetId=X and startTime<end and endTime>start and status in UPCOMING/ONGOING` | `(assetId, startTime, endTime)` |
| Dashboard unread badge: `Notification where employeeId=X and isRead=false` | `(employeeId, isRead)` |
| Kanban: `MaintenanceRequest where status=Y order by priority desc` | `(priority, status)` |
| Asset directory search: `Asset where status=Y and categoryId=Z` | `(status)` + `(categoryId)` |
| Booking heatmap: `Booking where status != CANCELLED order by startTime` | `(status)` |

## 8. Data-Integrity Design Choices

- **UUIDs** everywhere — safe to expose in URLs, no sequential enumeration.
- **Every FK has an explicit `onDelete` policy.** No implicit cascades.
- **Enums instead of magic strings** for every finite state; Prisma enforces at insert time.
- **Timestamps in UTC** — the frontend renders in the browser's TZ.
- **Decimal(12,2)** for currency — never floats.
- **`updatedAt`** on every mutable row — cheap change detection.
- **Application-level uniqueness** guards ride on top of DB constraints for good error messages; e.g. `TransferRequest` reason-and-guard checks happen before the insert so we can throw `TRANSFER_MISMATCH` with useful details instead of the raw Prisma error.
