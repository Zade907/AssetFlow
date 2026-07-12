# AssetFlow backend

Node.js 20, Express, TypeScript, Prisma, and PostgreSQL 15+ API for AssetFlow.

## Local setup

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

The API is served at `http://localhost:4000/api/v1`; health is available at
`/health` and `/api/v1/health`.

The idempotent seed creates exactly eight employee accounts total, including the
administrator. Every seeded account uses password `demo1234`. Admin login:

- `admin@artemis.com`
- `demo1234`

Employee login for role-based UI checks:

- `maya.patel@artemis.com`
- `demo1234`

Public signup always creates an `EMPLOYEE`; role-shaped properties are rejected.
Only an authenticated administrator can change roles via
`PATCH /api/v1/employees/:id/promote`.

## Checks

```bash
npm run prisma:validate
npm run prisma:generate
npm run typecheck
npm run build
npm test
```
