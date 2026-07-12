# AssetFlow

AssetFlow tracks physical assets, current custody, shared-resource bookings, maintenance, and audit workflows for organizations.

Phase 1 provides the foundation: PostgreSQL and Prisma, seeded organization data, JWT authentication, role-based access control, protected React routes, a responsive app shell, and admin organization setup.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker with Docker Compose (recommended for local PostgreSQL)

## First run

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm install
npm run db:up
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:5173` and sign in with:

- Email: `admin@artemis.com`
- Password: `demo1234`

The API runs at `http://localhost:4000/api/v1`. Its health endpoint is `http://localhost:4000/health`.

## Common commands

```bash
npm run dev          # backend and frontend together
npm run build        # production builds for both apps
npm run typecheck    # TypeScript checks for both apps
npm test             # backend and frontend tests
npm run db:up        # start local PostgreSQL
npm run db:down      # stop local PostgreSQL without deleting data
npm run db:reset     # recreate DB, apply migrations, and reseed (destructive)
npm run db:studio    # open Prisma Studio
```

## Authentication contract

All API routes except `/api/v1/auth/signup` and `/api/v1/auth/login` require `Authorization: Bearer <jwt>`. Signup always creates an `EMPLOYEE`; roles can only be changed by an administrator from Org Setup → Employees.

## Project layout

- `backend/`: Express, TypeScript, Prisma, auth/RBAC, and organization APIs
- `frontend/`: React, Vite, Router, Zustand, Query, Tailwind, and the admin shell
- `PRODUCT.md`: product strategy and interaction principles
- `DESIGN.md`: visual tokens and component guidance

## Local configuration

The Compose database defaults match `backend/.env.example` and expose PostgreSQL on host port `5433` to avoid colliding with a conventional local instance on `5432`. For an existing PostgreSQL instance, set `DATABASE_URL` in `backend/.env` and skip `npm run db:up`.

Never reuse the demo password or development JWT secret in a deployed environment.
