# AngkorGate Console

Admin Console and Self-Service Account Portal for **AngkorGate IAM**, built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn / Base UI, Remixicon, and Zod.

---

## ✨ Key Capabilities

- **Admin Dashboard (`/dashboard`)**: Live IAM overview, user/app telemetry, and `Cmd + K` global Command Palette.
- **OIDC Client Apps (`/apps`)**: Confidential & public PKCE client wizard, scope assignment, redirect URI simulator, rotating grace-period secrets, and SDK quickstart snippets.
- **OAuth Providers (`/oauth-providers`)**: Configure Google, GitHub, Discord, Microsoft Entra ID, Telegram, and Apple social logins.
- **API Keys (`/api-keys`)**: Scoped machine API keys with method/resource matrices and field-level PII projections.
- **Runtime Environment (`/settings/environment`)**: Live-edit SMTP, SMS, Passkey, Passwordless, and **Session & JWT / OIDC Token TTLs** (Google-aligned defaults: `3600s` access, `15552000s` / 180d refresh) without restarting `angkorgate-core`.
- **Self-Service Account Portal (`/account`)**: End-user profile, WebAuthn Passkeys, and active session management (OS/browser, IP, last active, **Revoke All Other Sessions**).
- **Masked Secrets & Step-Up Verification**: Sensitive keys and inputs are masked (`••••••••`) by default via `SecretDisplayField` and `SecretInputField` (`components/secret-field.tsx`), requiring a 5-minute step-up check (`StepUpVerificationDialog` supporting Passkey, Password, TOTP, or Email OTP for OAuth-only accounts) before revealing or copying.

---

## 🏗️ Project Structure

```text
angkorgate-console/
├── app/                   # Next.js App Router pages, route handlers & proxy middleware
├── components/            # Shared UI primitives (ui/, secret-field.tsx, nav-user.tsx, etc.)
├── features/              # Feature-driven modules (account, api-keys, apps, auth, oauth-providers, rbac, system, users, ...)
└── lib/                   # API client, environment helpers, session metadata utilities
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env`:

```env
CORE_API_URL=http://localhost:8080
NEXT_PUBLIC_CORE_API_URL=http://localhost:8080
NEXT_PUBLIC_CONSOLE_URL=http://localhost:4000
```

---

## 🚀 Development & Verification

```bash
npm install
npm run dev        # Starts on http://localhost:4000

# Verification
npm test           # Node/tsx test runner (features/**/*.test.ts)
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run build      # Next.js production build
```
