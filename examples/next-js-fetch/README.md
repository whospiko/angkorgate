# AngkorGate + Next.js (Pure `fetch`, No Backend)

A minimal Next.js (App Router + TypeScript) example that authenticates directly against **AngkorGate Core** using native `fetch`—with zero custom backend or Next.js API proxy routes—and protects `/dashboard`.

## How It Works

1. **Direct `fetch` Client ([src/lib/angkorgate.ts](src/lib/angkorgate.ts))**
   - `POST /auth/login` (plus `POST /auth/login/mfa` when TOTP MFA is enabled)
   - `POST /auth/register`
   - `POST /auth/refresh` (automatic 401 retry & token rotation)
   - `GET /auth/me` & `GET /auth/sessions`
   - `POST /auth/logout`
2. **Route Protection ([src/middleware.ts](src/middleware.ts))**
   - Checks the `angkorgate_token` cookie on `/dashboard` (and `/dashboard/*`), validates JWT structure and `exp`, and redirects unauthenticated requests to `/login?redirect=/dashboard`.
   - Redirects already-authenticated users away from `/login` and `/register` to `/dashboard`.
3. **Client Verification ([src/app/dashboard/page.tsx](src/app/dashboard/page.tsx))**
   - Fetches live user profile and active sessions from AngkorGate Core, supports manual token rotation, and clears tokens + redirects on `401` or sign-out.

## Quick Start

1. Start **AngkorGate Core** on `http://localhost:8080`:
   ```bash
   cd ../../angkorgate-core
   npm run start:dev
   ```
2. Configure environment variables (already pre-filled in `.env.local`):
   ```bash
   cp .env.example .env.local
   ```
3. Install dependencies and run the Next.js app on `http://localhost:3001`:
   ```bash
   npm install
   npm run dev
   ```
4. Visit `http://localhost:3001/dashboard` — you will be redirected to `/login`, and after signing in you will land on `/dashboard`.
