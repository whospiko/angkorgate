# AngkorGate + Express.js Todo API (TypeORM + `better-sqlite3`)

A minimal Express + TypeScript backend API backed by **TypeORM** and **`better-sqlite3`** that validates AngkorGate SSO Bearer tokens (`GET /oidc/me`, with `GET /auth/me` fallback) and enforces user identity, roles, and permissions.

## Features

- **AngkorGate SSO Verification ([src/middleware/angkorgate-auth.ts](src/middleware/angkorgate-auth.ts))**
  - `requireAuth` validates `Authorization: Bearer <token>` against AngkorGate (`GET /oidc/me` or `GET /auth/me`) and attaches `{ id, email, name, roles, permissions }` to `req.authUser`.
  - `requireRoleOrPermission` guards routes using AngkorGate RBAC roles and permissions.
- **TypeORM + `better-sqlite3` ([src/data-source.ts](src/data-source.ts), [src/entities/todo.entity.ts](src/entities/todo.entity.ts))**
  - Zero-config local SQLite persistence (`todo.sqlite`).
- **Endpoints**
  - `GET /health` — Public health check
  - `GET /me` — Returns authenticated SSO user info, roles, and permissions
  - `GET /todos` — List todos belonging to the current SSO user
  - `GET /todos/all` — List all todos (requires `ADMIN` role or `todos:read:all` permission)
  - `POST /todos` — Create a todo (`{ "title": "..." }`)
  - `PATCH /todos/:id` — Update `title` or `completed` (owner or `ADMIN`)
  - `DELETE /todos/:id` — Delete a todo (owner or `ADMIN`)

## Quick Start

1. Start **AngkorGate Core** on `http://localhost:8080`.
2. Install dependencies and start the API on `http://localhost:4001`:
   ```bash
   cp .env.example .env
   npm install
   npm run dev
   ```
3. Test with a Bearer token from AngkorGate SSO:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:4001/me
   curl -X POST http://localhost:4001/todos \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"Wire Express Todo API with AngkorGate SSO"}'
   ```
