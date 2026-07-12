# Security Model — AssetFlow

This document explains how AssetFlow protects its data and workflows, what threats it defends against, and what it deliberately does not do. The goal is to be honest about the security posture, not to oversell it.

---

## 1. Trust Boundaries

```
Browser (untrusted)  ⇢  Express API (trusted, stateless)  ⇢  Postgres (trusted, isolated)
```

- Everything from the browser is untrusted input. Every field is Zod-validated at the controller before the service runs.
- The API server is the only tier that talks to the database. There is no direct client-to-database path.
- Postgres runs in an isolated container in dev; in production it's expected to be a managed private-network database.

## 2. Authentication

### Password storage
- **bcryptjs**, cost factor `12`
- Stored in `User.passwordHash`
- Never returned by any API — signup/login return a JWT, not the hash

### Session tokens
- **JWT (HS256)** signed with `env.JWT_SECRET`
- Payload: `{ sub: userId, employeeId, email, role }`
- Default expiry: `8h` (configurable via `env.JWT_EXPIRES_IN`)
- Transmitted as `Authorization: Bearer <token>` — never as a cookie, so no CSRF surface

### Fresh role every request
`authenticateToken` re-reads the employee's role and status from the database on every request. Consequences:

- Promotions and demotions take effect on the next call — no waiting for token expiry.
- Deactivating an employee (`status = INACTIVE`) revokes their access immediately.
- Deleting the user cascade-deletes the employee, so the token becomes invalid instantly.

### Where auth is *not* required
- `POST /auth/signup`
- `POST /auth/login`
- `GET /health`, `GET /api/v1/health`

Every other route mounts `authenticateToken` first.

## 3. Authorization (RBAC)

Roles form a hierarchy of capability, not seniority — a `DEPARTMENT_HEAD` and an `ASSET_MANAGER` are not comparable except through explicit rules.

| Role | Signup can pick | Assigned by |
|---|---|---|
| `EMPLOYEE` | ✅ (default) | Signup |
| `DEPARTMENT_HEAD` | ❌ | Admin, via `PATCH /employees/:id/promote` |
| `ASSET_MANAGER` | ❌ | Admin, via `PATCH /employees/:id/promote` |
| `ADMIN` | ❌ | Admin, via `PATCH /employees/:id/promote` |

### Enforcement in code
- Every route that requires a specific role uses `requireRole('...')` in `bookings.routes.ts` and friends.
- Fine-grained checks (e.g. "employees can cancel their own booking but not others'") live in the service layer where the actor and resource are both available.
- The frontend uses `<RoleGate roles={[...]}>` to hide navigation, but never *depends on* this for security.

### Anti-self-elevation
- `POST /auth/signup` **ignores** any `role` field in the request body.
- `PATCH /employees/:id/promote` rejects when `id === actor.employeeId`. Admins cannot promote themselves.
- `PATCH /employees/:id/status` similarly refuses self-mutation.

## 4. Input Validation

- **Every controller runs Zod `.parse(...)` before calling the service.** No exceptions.
- Schemas are `.strict()` — unknown keys are rejected, so tampered payloads never reach the service.
- Zod validation errors are translated into `400 VALIDATION_ERROR` with a `details.fieldErrors` map for client display.
- Business validation (double-allocation, booking overlap, transfer mismatch) lives in the service and throws `AppError` with a stable `code` the frontend switches on.

## 5. Transport & Headers

- **Helmet** applies the standard security header set (`X-Content-Type-Options`, `Strict-Transport-Security` in HTTPS, `X-Frame-Options`, etc.).
- **CORS allow-list** via `env.CORS_ORIGIN` (comma-separated). Left unset in dev to let localhost:5173 through freely.
- **`x-powered-by` header disabled** — no framework fingerprinting.
- HTTPS is expected in production but not enforced in code (the reverse proxy handles it).

## 6. SQL Injection

Prisma parameterizes every query at the SDK level. The only raw SQL in the application is:

```ts
prisma.$executeRaw`CREATE SEQUENCE IF NOT EXISTS asset_tag_sequence ...`
prisma.$queryRaw`SELECT nextval('asset_tag_sequence')::int AS value`
```

These have no user input — the queries are static string templates.

## 7. Cross-Site Scripting (XSS)

- React escapes all string children by default.
- We never call `dangerouslySetInnerHTML`.
- Notification titles and messages come from the API and could include user-supplied strings (e.g. transfer reasons). They render through JSX, so `<script>` in a reason becomes literal `<script>`.

## 8. Rate Limiting

**Not implemented** in the MVP. In production, deploy behind a reverse proxy or edge gateway that rate-limits `/auth/login` and `/auth/signup` at minimum.

## 9. Audit Trail

Every state-changing action calls `logActivity()`, which appends a row to `ActivityLog`:

| Field | Purpose |
|---|---|
| `employeeId` | who did it |
| `action` | machine-readable action (e.g. `ALLOCATION_CREATED`) |
| `entityType`, `entityId` | what they acted on |
| `details` | JSONB context (before/after, reason, etc.) |
| `ipAddress` | request source when available |
| `createdAt` | when |

Only admins can read the log. The API exposes read-only endpoints; there is no delete or update path — inserts only.

`logActivity` is wrapped in `try/catch`; a log-write failure never breaks the business action.

## 10. Notifications

Notifications are strictly per-employee. The list endpoint filters by `request.auth.employeeId` before any read. Mark-read endpoints do the same. There is no admin path to read another employee's notifications.

## 11. Secrets Management

- Only two secrets: `DATABASE_URL` and `JWT_SECRET`.
- Both live in `backend/.env`, ignored by git.
- The demo secret in the committed `.env.example` is deliberately not a real credential.
- Production expects environment injection (`process.env`); no secret file is read at runtime.

## 12. Dependency Hygiene

- All dependencies are pinned in `package.json` to caret-major.
- `npm audit` is not automated in the hackathon, but every runtime dep is a well-maintained, widely-used package.
- No custom crypto — bcrypt and jsonwebtoken are the only auth-adjacent libraries.

## 13. Data Deletion & Retention

- User + Employee: hard delete cascades from User → Employee. All *history* referenced by that employee (allocations, transfers, bookings) uses `Restrict`, so deletion is blocked if the employee owns history. In production you would soft-delete instead (`status = INACTIVE`).
- Notification: cascades on employee delete — no reason to keep unread pings for a deleted account.
- ActivityLog: `Restrict` — history is preserved even at the cost of blocking employee deletion.

## 14. Threat Model (STRIDE-style summary)

| Threat | Mitigation |
|---|---|
| **Spoofing** — someone claims to be another user | JWT signature + role reloaded from DB on every request |
| **Tampering** — payload modified in transit | HTTPS in production; Zod `.strict()` rejects extra keys |
| **Repudiation** — actor denies performing action | ActivityLog with `employeeId` + `ipAddress` |
| **Information disclosure** — reading data one shouldn't | Per-route `requireRole` + service-level per-actor filtering |
| **Denial of Service** — flood requests | Rate limiting at reverse proxy (deployment concern) |
| **Elevation of Privilege** — employee becomes admin | Signup role forcing; self-promotion prohibited; role read fresh each request |

## 15. Known Non-Goals

Explicitly *not* addressed:

- MFA / TOTP
- SSO / SAML / OIDC
- Password rotation policies
- Account lockout after N failed logins
- Sessions revocation list (JWT is short-lived instead)
- Field-level encryption
- GDPR data export / erasure workflow

These are all reasonable production requirements. They belong to a security-hardening milestone, not the MVP.
