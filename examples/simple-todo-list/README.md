# Simple Todo List (AngkorGate SSO + React + Express + TypeORM + SQLite)

Full-stack example integrating a **React + TypeScript** frontend (pure `fetch` + OIDC PKCE) with an **Express + TypeORM + `better-sqlite3`** backend API, both secured by **AngkorGate SSO**.

## Structure

- [backend/](backend/) — Express + TypeORM + `better-sqlite3` Todo API + Swagger UI (`http://localhost:4001/docs`)
- [frontend/](frontend/) — React + Vite + TypeScript frontend (`http://localhost:3001`)

## Quick Start

1. Start **AngkorGate Core** (`http://localhost:8080`) and **AngkorGate Console** (`http://localhost:4000`).
2. Start the **backend** (`http://localhost:4001`):
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```
3. In a second terminal, start the **frontend** (`http://localhost:3001`):
   ```bash
   cd frontend
   cp .env.example .env.local
   npm install
   npm run dev
   ```
4. Open `http://localhost:3001`, click **Sign In with AngkorGate SSO**, and manage your todos.
