# AngkorGate + Next.js (`@angkorgate/nextjs` SDK + `better-sqlite3`)

Fullstack Next.js App Router example using the drop-in **`@angkorgate/nextjs`** SDK and **`better-sqlite3`**—no raw OAuth/OIDC boilerplate.

## What It Uses

- [src/app/layout.tsx](src/app/layout.tsx): `<AngkorGateProvider>`
- [src/middleware.ts](src/middleware.ts): `angkorgateMiddleware({ protectedRoutes: ["/dashboard"] })`
- [src/app/page.tsx](src/app/page.tsx): `<SignedIn>`, `<SignedOut>`, `<SignInButton>`, `<UserButton>`
- [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx): `<UserProfile>`, `<Protect>`, `useAngkorGate()`
- [src/app/api/todos/route.ts](src/app/api/todos/route.ts) & [src/app/api/todos/[id]/route.ts](src/app/api/todos/[id]/route.ts): `verifyAngkorGateRequest` + `better-sqlite3`

## Quick Start

1. Start **AngkorGate Core** (`http://localhost:8080`) and **AngkorGate Console** (`http://localhost:4000`).
2. Install dependencies and run on `http://localhost:3001`:
   ```bash
   cp .env.example .env.local
   npm install
   npm run dev
   ```
3. Open `http://localhost:3001/dashboard`.
