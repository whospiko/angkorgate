# AngkorGate + Next.js (OIDC / SSO via Pure `fetch`, No Backend)

A minimal Next.js (App Router + TypeScript) example that integrates with **AngkorGate** via **OpenID Connect (OIDC) Authorization Code Flow + PKCE** using native `fetch`—with no custom backend or OIDC SDK—and protects `/dashboard`.

## How It Works

1. **SSO Redirect (`/login` -> AngkorGate `/oidc/auth`)**
   - Visiting `/login` (or being redirected from `/dashboard`) generates a PKCE `code_verifier` + `S256` `code_challenge`, `state`, and `nonce`, then routes the browser to `http://localhost:8080/oidc/auth`.
   - AngkorGate handles the login UI and SSO session.
2. **Authorization Code Exchange (`/callback` -> `POST /oidc/token`)**
   - AngkorGate redirects back to `http://localhost:3001/callback?code=...&state=...`.
   - [src/app/callback/page.tsx](src/app/callback/page.tsx) verifies `state` and exchanges `code` + `code_verifier` via native `fetch` against `POST /oidc/token`.
3. **Protected Route (`/dashboard`)**
   - [src/middleware.ts](src/middleware.ts) checks the `angkorgate_token` cookie on `/dashboard` (and `/dashboard/*`) and redirects unauthenticated requests to `/login?redirect=/dashboard`.
   - [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) fetches live claims from `GET /oidc/me`, displays decoded ID Token claims, supports token refresh (`grant_type=refresh_token`), and signs out via RP-Initiated Logout (`GET /oidc/session/end`).

## Quick Start

1. Start **AngkorGate Core** (`http://localhost:8080`) and **AngkorGate Console** (`http://localhost:4000`).
   - Uses the pre-seeded public OIDC client `demo-app`, which allows `http://localhost:3001/callback` and `http://localhost:3001`.
2. Configure environment variables (already pre-filled in `.env.local`):
   ```bash
   cp .env.example .env.local
   ```
3. Install dependencies and run on `http://localhost:3001`:
   ```bash
   npm install
   npm run dev
   ```
4. Open `http://localhost:3001/dashboard` — you will be routed to AngkorGate SSO to sign in, then returned to `/dashboard`.
