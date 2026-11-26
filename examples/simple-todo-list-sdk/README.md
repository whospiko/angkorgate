# Simple Todo List SDK (`@angkorgate/sdk` + `@angkorgate/react`)

Full-stack Todo List example powered by AngkorGate's drop-in SDK packages:

- [backend/](backend/) — Express + TypeORM + `better-sqlite3` + Swagger UI (`/docs`) using **`@angkorgate/sdk`** (`AngkorGateClient`, `hasRole`, `hasAnyRole`, `hasAnyPermission`) on `http://localhost:4001`.
- [frontend/](frontend/) — React + Vite + TypeScript using **`@angkorgate/react`** (`<AngkorGateProvider>`, `<SignedIn>`, `<SignedOut>`, `<SignInButton>`, `<UserProfile>`, `<Protect>`) on `http://localhost:3001`.

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
4. Open `http://localhost:3001` and click **Sign In with AngkorGate**.
