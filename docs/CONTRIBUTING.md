# Contributing — AssetFlow

Guidelines for anyone working on AssetFlow. During the hackathon these apply to Team Artemis; after handoff, to any future contributor.

---

## 1. Getting the environment ready

Follow the **Quick Start** in the [README](../README.md). One-liner check that everything's set up:

```bash
npm install \
  && cp backend/.env.example backend/.env \
  && cp frontend/.env.example frontend/.env \
  && npm run db:up \
  && npm run db:deploy \
  && npm run db:seed \
  && npm run dev
```

You should be able to log in at http://localhost:5173 as `admin@artemis.com` / `demo1234`.

## 2. Branching Model

```
main            ← always-working, releasable
  └── dev       ← integration branch, PRs land here first
       ├── feat/<module>-<name>
       ├── fix/<module>-<name>
       └── chore/<name>
```

- `main` is protected. Only merges from `dev` after a green demo.
- `dev` is also protected. Every merge is a PR with at least one approval.
- Feature branches: `feat/bookings-harsh`, `fix/allocation-double-block-priya`, `chore/deps-bump`.

## 3. Commit Convention

Format:
```
<type>(<module>): <short imperative summary>
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`.

Examples:
- `feat(bookings): add reschedule endpoint with overlap guard`
- `fix(auth): reload role from db on every request`
- `chore(deps): bump prisma to 6.19.3`
- `docs(api): document /audit-cycles/:id/close consequences`

**Commit hygiene:**
- Small, focused commits every 30–60 min of real progress.
- Never squash on a shared branch.
- Never `git push --force` to `main` or `dev`.

## 4. Code Style

### TypeScript
- `strict: true` on both workspaces.
- No `any`. If truly unavoidable, `unknown` with a narrowing cast.
- Prefer `type` for API shapes, `interface` for extension-heavy internal contracts.
- Async everywhere — no `.then` chains.

### Backend module shape

Every backend feature module has exactly four files:

```
src/modules/<name>/
  <name>.routes.ts        ← Express Router; only middleware wiring
  <name>.controller.ts    ← Parse request, call service, respond
  <name>.service.ts       ← Business logic; only file that touches prisma
  <name>.schema.ts        ← Zod schemas + inferred TS types
```

**Rules:**
1. Controllers **never** import `prisma`. They call the service.
2. Services **never** import Express types (`Request`, `Response`). They receive plain `actor` objects.
3. All input goes through Zod at the controller. Never trust `request.body` directly in the service.

### Frontend feature shape

```
src/features/<name>/
  api.ts                  ← apiClient wrappers + queryKey factory
  pages/                  ← Route-level components
  components/             ← Feature-local components (dialogs, rows)
  utils.ts                ← Date/format helpers
```

**Rules:**
1. Pages never fetch data via bare `fetch` — always TanStack Query hooks.
2. Reusable UI (`Button`, `Badge`, `Field`) lives in `components/ui/` at app root, not per-feature.
3. Every list page implements the four states: loading skeleton, error banner, empty state, populated view.

### Naming
- Files: **kebab-case** (`booking-overlap.test.ts`)
- Components: **PascalCase** (`NewBookingDialog.tsx`)
- Functions: **camelCase**
- Enum values: **SCREAMING_SNAKE_CASE**
- CSS custom properties: `var(--kebab-case)`

## 5. Data Model Changes

Any schema change requires a migration:

```bash
# 1. Edit backend/prisma/schema.prisma
# 2. Create + apply the migration
cd backend
npx prisma migrate dev --name <descriptive_slug>
# 3. Prisma will offer to regenerate the client automatically
```

**Rules:**
- Never edit an existing migration SQL file. Create a new migration to correct.
- Never run `prisma db push` on any branch — that skips migration history.
- Test migrations by running `npm run db:reset` on a clone before pushing.

## 6. Testing

- Backend: `npm test -w backend` — Vitest + Supertest
- Frontend: `npm test -w frontend` — Vitest + Testing Library
- Full suite: `npm test` from repo root

**Before opening a PR:**
- [ ] `npm run typecheck` clean
- [ ] `npm test` all green
- [ ] Manual test the happy path in the browser
- [ ] Manual test one failure path (e.g. try to book an overlapping slot)

**When to add tests:**
- Business rules with edge cases (overlap boundaries, transfer mismatches) — always.
- Auth / RBAC paths — always.
- Pure UI changes — skip unless there's stateful interaction.

## 7. PR Checklist

Copy this into the PR description:

```
- [ ] Changes match the module-shape conventions (routes/controller/service/schema)
- [ ] Zod validation added or updated for new input surfaces
- [ ] Prisma migration created for any schema change
- [ ] RBAC updated (docs + code) if a new route added
- [ ] Tests added or updated
- [ ] `npm run typecheck` clean
- [ ] `npm test` green
- [ ] Manually verified in the browser
```

## 8. Common Pitfalls

### Prisma types out of date
After changing `schema.prisma`, regenerate the client:
```bash
cd backend && npx prisma generate
```

### `moduleResolution` deprecation warning
The editor may complain about `"moduleResolution": "Node"`. The value `"ignoreDeprecations": "5.0"` in `backend/tsconfig.json` silences the TS 5.9 CLI. VS Code's bundled TS may still warn — safe to ignore.

### Docker Postgres won't reach 5433
Start Docker Desktop first, then `npm run db:up`. Check with `docker ps`.

### `Environment variable not found: DATABASE_URL`
You forgot `cp backend/.env.example backend/.env`.

### `prisma.<model>.<method> is not a function` in tests
Prisma client is stale. Run `npx prisma generate` in `backend/`.

## 9. Debugging Tips

### Server-side
- `npm run dev` prints request logs via morgan.
- Set `NODE_ENV=development` (default) — error responses include `details` for unknown errors.
- `npx prisma studio` opens a browser UI to inspect DB rows.

### Client-side
- React Query DevTools browser extension shows cache state.
- Every mutation surfaces server errors via Sonner toasts.
- `localStorage.assetflow-auth` holds the token — clear it to simulate a logout.

## 10. Documentation

Update docs *in the same PR* as the code change:

| Change | Doc to update |
|---|---|
| New endpoint | `docs/API.md` |
| Schema change | `docs/DATA_MODEL.md` + migration file |
| New role gate | `docs/SECURITY.md` + RBAC table in README |
| Architectural shift | `docs/ARCHITECTURE.md` |
| User-visible feature | Feature Matrix in README |

Don't ship documentation drift. Reviewers should reject PRs that add features without updating docs.

## 11. Team Contacts

| Member | Owns |
|---|---|
| **Ruchir Kalokhe** · Foundation Engineer | Auth, RBAC, App Shell, Org Setup |
| **Atharva Nivatkar** · Assets & Allocation | Assets, Allocations, Transfers |
| **Harsh Jain** · Bookings & Maintenance | Bookings, Maintenance |
| **Krishna Naicker** · Insights & Notifications | Dashboard, Audits, Reports, Notifications, Activity Logs |

Contact the module owner before touching another member's territory.
