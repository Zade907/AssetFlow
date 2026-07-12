# REST API Reference — AssetFlow

**Base URL:** `http://localhost:4000/api/v1`
**Auth:** All routes except `/auth/*` require an `Authorization: Bearer <jwt>` header.
**Content-Type:** `application/json` unless noted (e.g. CSV exports).

## Response shape

Every successful response wraps the payload in a `data` key:

```json
{ "data": { ... } }
```

Every error follows the same shape:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human readable summary",
    "details": { ... }
  }
}
```

Standard status codes:

| Status | Meaning |
|---|---|
| 200 | Success (read or non-creating write) |
| 201 | Resource created |
| 204 | Success, no body |
| 400 | Validation error (`VALIDATION_ERROR`) |
| 401 | Missing or invalid token (`AUTHENTICATION_REQUIRED`, `INVALID_TOKEN`) |
| 403 | Authenticated but forbidden (`FORBIDDEN`, `ACCOUNT_INACTIVE`) |
| 404 | Not found |
| 409 | Business-rule conflict (`ALLOCATION_CONFLICT`, `BOOKING_OVERLAP`, `TRANSFER_LOCKED`, etc.) |
| 500 | Unexpected server error |

---

## 1. Auth — `/auth`

### `POST /auth/signup`
Create an Employee account. **Role is always `EMPLOYEE`** regardless of any role field sent.

**Body**
```json
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "at-least-8-chars"
}
```

**201**
```json
{
  "data": {
    "token": "eyJhbGc...",
    "user": { "id": "...", "email": "priya@example.com", "name": "Priya Sharma", "role": "EMPLOYEE", ... }
  }
}
```

### `POST /auth/login`
**Body:** `{ "email": "...", "password": "..." }`
**200:** same `{ token, user }` shape as signup.
**401:** `INVALID_CREDENTIALS`

### `GET /auth/me`
Current authenticated user. **200:** `{ data: { id, email, name, role, department, ... } }`

---

## 2. Departments — `/departments`  (Admin only)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/departments` | — | list of departments with parent, head, counts |
| POST | `/departments` | `{ name, code, parentDepartmentId?, status? }` | created department |
| PATCH | `/departments/:id` | any subset of the above (+ `headEmployeeId`) | updated department |
| DELETE | `/departments/:id` | — | 204 · 409 if has employees, children, or cycles |

**Business rules**
- `code` is trimmed and uppercased server-side.
- A department cannot become its own ancestor (cycle detection).
- `headEmployeeId` must be an active employee already in the department.

---

## 3. Categories — `/categories`  (Admin only)

CRUD identical shape to Departments. Body fields:

```json
{
  "name": "Electronics",
  "description": "Computers, displays, phones...",
  "customFields": { "warrantyMonths": "number" },
  "status": "ACTIVE"
}
```

Deleting a category referenced by any asset returns `409 RECORD_IN_USE`.

---

## 4. Employees — `/employees`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/employees` | Any authenticated | Directory with optional `?departmentId=&role=&status=` filters |
| PATCH | `/employees/:id/promote` | Admin | Change role. Body: `{ "role": "ASSET_MANAGER" }`. Admins cannot promote themselves. |
| PATCH | `/employees/:id/status` | Admin | Toggle status. Body: `{ "status": "INACTIVE" }` |

---

## 5. Assets — `/assets`

### `GET /assets` — paginated list
Query: `search`, `status`, `categoryId`, `departmentId`, `location`, `page` (default 1), `limit` (default 20).

Returns:
```json
{
  "data": {
    "items": [ { "id":"...","assetTag":"AF-0001","name":"MacBook Pro","status":"ALLOCATED","currentHolder":{...},"category":{...} } ],
    "pagination": { "page":1,"limit":20,"total":42,"totalPages":3 }
  }
}
```

### `POST /assets` — register
**Access:** `ASSET_MANAGER`, `ADMIN`.

```json
{
  "name": "MacBook Pro 14\"",
  "categoryId": "uuid",
  "serialNumber": "MBP-14-0001",
  "acquisitionDate": "2024-11-01",
  "acquisitionCost": 180000,
  "condition": "GOOD",
  "location": "IT Storage · 3F",
  "isBookable": false
}
```

Server auto-generates `assetTag` (format `AF-XXXX`) via the `asset_tag_sequence` Postgres sequence.

### `GET /assets/:id` — detail with history
Returns the asset plus allocation history, maintenance history, and transfer history.

### `PATCH /assets/:id`, `DELETE /assets/:id`
Standard update / delete. Deleting an `ALLOCATED` asset returns `409 ASSET_ALLOCATED`.

---

## 6. Allocations — `/allocations`

### `POST /allocations` — allocate (with double-block)
**Access:** `DEPARTMENT_HEAD`, `ASSET_MANAGER`, `ADMIN`.

```json
{
  "assetId": "uuid",
  "employeeId": "uuid",
  "expectedReturnDate": "2026-08-01T00:00:00Z",
  "notes": "Optional"
}
```

**201** on success. **409** if asset is already allocated:

```json
{
  "error": {
    "code": "ALLOCATION_CONFLICT",
    "message": "Asset is currently allocated to another employee",
    "details": {
      "currentHolder": { "id":"...","name":"Priya Sharma","email":"..." },
      "allocationId": "uuid"
    }
  }
}
```

The frontend uses `details.currentHolder` to render the "Request Transfer" modal.

### `GET /allocations`
Query: `employeeId?`, `status?` (`ACTIVE|RETURNED|OVERDUE`), `scope?` (`mine|all`), `page`, `limit`.
Employees see their own by default; managers see all.

### `POST /allocations/:id/return`
```json
{ "conditionOnReturn": "GOOD", "notes": "..." }
```
Atomically closes the allocation and flips asset to `AVAILABLE`.

### `GET /allocations/overdue`
Convenience list for the dashboard.

---

## 7. Transfers — `/transfers`

| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/transfers` | Holder or manager | `{ assetId, fromEmployeeId, toEmployeeId, reason }` |
| GET | `/transfers` | Any | filters: `status?`, `assetId?` |
| POST | `/transfers/:id/approve` | Manager | `{ notes? }` — atomic custody swap |
| POST | `/transfers/:id/reject` | Manager | `{ reason }` — stored in `decisionNotes` |

Approving a transfer performs 4 writes in one transaction:
1. Old allocation → `RETURNED`
2. New allocation created for `toEmployeeId`
3. TransferRequest → `COMPLETED`
4. Asset status stays `ALLOCATED` (custody moved, not returned)

---

## 8. Bookings — `/bookings`

### `GET /bookings/resources`
Bookable assets (where `isBookable = true` and status not in `LOST/RETIRED/DISPOSED/UNDER_MAINTENANCE`).

### `POST /bookings` — with overlap check
```json
{
  "assetId": "uuid",
  "startTime": "2026-07-13T10:00:00.000Z",
  "endTime": "2026-07-13T11:00:00.000Z",
  "purpose": "Sprint planning · Team Kestrel",
  "employeeId": "uuid"
}
```

**409** on overlap:
```json
{
  "error": {
    "code": "BOOKING_OVERLAP",
    "message": "The requested time overlaps with an existing booking",
    "details": {
      "conflictingBooking": { "id":"...","startTime":"...","endTime":"...","asset":{...},"employee":{...} }
    }
  }
}
```

Overlap uses the half-open interval `[start, end)` — abutting slots are legal.

### `GET /bookings`
Query: `assetId?`, `employeeId?`, `status?`, `from?`, `to?`, `scope?` (`mine|all`).

### `PATCH /bookings/:id/cancel`, `PATCH /bookings/:id/reschedule`
Reschedule body: `{ startTime, endTime, purpose? }` — overlap check re-runs.

---

## 9. Maintenance — `/maintenance`

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/maintenance` | Any auth | Raise request. Body: `{ assetId, description, priority?, photoUrl? }` |
| GET | `/maintenance` | Any auth | Query: `status?`, `priority?`, `assetId?`, `scope?` |
| POST | `/maintenance/:id/approve` | Asset Mgr / Admin | Body: `{ assignedTechnicianId? }` — flips asset to `UNDER_MAINTENANCE` |
| POST | `/maintenance/:id/reject` | Asset Mgr / Admin | Body: `{ reason }` |
| POST | `/maintenance/:id/assign` | Asset Mgr / Admin | Body: `{ technicianId }` |
| POST | `/maintenance/:id/start` | Assigned tech / Mgr | Marks `IN_PROGRESS` |
| POST | `/maintenance/:id/resolve` | Assigned tech / Mgr | Body: `{ resolutionNotes }` — flips asset back to `AVAILABLE` |

---

## 10. Audits — `/audit-cycles` + `/audit-records`

### `POST /audit-cycles` (Admin)
```json
{
  "name": "Q1 2026 Engineering Audit",
  "scopeDepartmentId": "uuid",
  "startDate": "2026-01-15",
  "endDate": "2026-01-31"
}
```
Returns a `DRAFT` cycle.

### `POST /audit-cycles/:id/assign` (Admin)
```json
{ "auditorIds": ["uuid","uuid"] }
```
Idempotent: only assigns not-yet-assigned auditors.

### `POST /audit-cycles/:id/activate` (Admin)
Materializes an `AuditRecord` (status `PENDING`) for every in-scope asset and moves the cycle to `ACTIVE`.

### `PATCH /audit-records/:id` (Auditor or Manager)
```json
{ "status": "VERIFIED" | "MISSING" | "DAMAGED", "notes": "..." }
```

### `POST /audit-cycles/:id/close` (Admin)
Atomic close:
- Cycle → `CLOSED`
- Every `MISSING` asset → `LOST`
- Every `DAMAGED` asset gets a new `MaintenanceRequest` (priority `HIGH`, status `PENDING`)
- Other assigned auditors are notified

### `GET /audit-cycles`, `GET /audit-cycles/:id`, `GET /audit-cycles/:id/discrepancies`
Read endpoints; discrepancies filter to `MISSING`/`DAMAGED` records.

---

## 11. Reports — `/reports`

| Endpoint | Access | Returns |
|---|---|---|
| `GET /reports/dashboard-kpis` | Any auth | `{ assetsAvailable, assetsAllocated, maintenanceToday, activeBookings, pendingTransfers, upcomingReturns, overdueReturns }` |
| `GET /reports/utilization` | Manager / Admin | Assets sorted by allocated-days |
| `GET /reports/maintenance-frequency` | Manager / Admin | Grouped by asset with category |
| `GET /reports/department-allocation` | Manager / Admin | Active allocation count per department |
| `GET /reports/booking-heatmap` | Manager / Admin | 7 × 24 grid of booking counts |
| `GET /reports/export?type=utilization\|maintenance\|department\|heatmap` | Manager / Admin | `text/csv` file download |

---

## 12. Notifications — `/notifications`

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications?unreadOnly=true` | Returns `{ notifications, unreadCount }`, own only, latest 30 |
| PATCH | `/notifications/:id/read` | Marks one as read |
| PATCH | `/notifications/read-all` | Marks all own as read; returns `{ updated: n }` |

Notification types emitted by services:
- `BOOKING_CONFIRMED`
- `MAINTENANCE_APPROVED`, `MAINTENANCE_REJECTED`, `MAINTENANCE_RESOLVED`
- `TRANSFER_REQUESTED`, `TRANSFER_APPROVED`, `TRANSFER_REJECTED`
- `AUDIT_ASSIGNED`, `AUDIT_CLOSED`

---

## 13. Activity Logs — `/activity-logs`  (Admin only)

`GET /activity-logs` — query: `entityType?`, `entityId?`, `employeeId?`, `from?`, `to?`.
Returns up to 250 most-recent entries with employee joined.

---

## Common Error Codes

| Code | Origin |
|---|---|
| `VALIDATION_ERROR` | Zod parse failure at controller |
| `AUTHENTICATION_REQUIRED` | Missing or malformed Bearer header |
| `INVALID_TOKEN` | Signature invalid / expired / user gone |
| `ACCOUNT_INACTIVE` | Valid token but employee is `INACTIVE` |
| `FORBIDDEN` | Role check failed |
| `NOT_FOUND` | Resource does not exist |
| `ALLOCATION_CONFLICT` | Asset already allocated |
| `BOOKING_OVERLAP` | Requested slot conflicts |
| `ASSET_UNAVAILABLE` / `ASSET_UNDER_MAINTENANCE` | Asset cannot be booked/allocated |
| `TRANSFER_MISMATCH` | `fromEmployeeId` does not currently hold the asset |
| `TRANSFER_LOCKED` | Transfer already decided |
| `MAINTENANCE_LOCKED` | Request in a non-transitionable state |
| `AUDIT_NOT_ACTIVE` | Cycle isn't in `ACTIVE` state for the requested action |
| `AUDIT_ALREADY_CLOSED` | Close attempted twice |
| `INTERNAL_SERVER_ERROR` | Unexpected — check server logs |
