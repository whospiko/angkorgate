# AngkorGate Core 🇰🇭

> **One Gateway. Every Identity.**  
> High-performance Open-Source Identity and Access Management (IAM) built on NestJS, TypeORM, and PostgreSQL, designed with Keycloak-grade capabilities.

---

## 🚀 Key Features

- **OAuth 2.0 & OpenID Connect (OIDC 1.0) Provider**:
  - Full discovery (`/.well-known/openid-configuration` & `/oidc/.well-known/openid-configuration`)
  - JWKS endpoint (`/oidc/jwks`)
  - Dynamic Client resolution via `AppsService` (PostgreSQL `app_settings` table)
  - Confidential & Public Clients with PKCE support (RFC 7636)
  - Grants: `authorization_code`, `refresh_token`, `client_credentials`
  - Claims enrichment (`sub`, `email`, `phone`, `roles`, `permissions`, and namespaced claims)
  - JWT Access Token customization for microservices & Resource Servers (e.g., Spring Boot `@PreAuthorize`)
  - Token Introspection (RFC 7662) & Token Revocation (RFC 7009)
  - End Session / Logout (OpenID Connect RP-Initiated Logout 1.0)
- **Multi-Factor, Passkeys & Passwordless**:
  - Time-based One-Time Passwords (TOTP) with encrypted secrets & backup codes
  - WebAuthn / FIDO2 Passkeys (`@simplewebauthn/server`)
  - Magic Links, 6-digit Email OTP, and SMS OTP
- **Session Security & Token Lifecycle**:
  - Refresh Token Rotation with **Reuse Detection** (revokes the token family on replay)
  - Enriched session metadata (OS, browser, device type, IP, last active) & `POST /auth/sessions/revoke-others`
  - **Google-aligned default lifetimes** (`3600s` / 1h access & ID tokens; `15552000s` / 180d refresh tokens), live-configurable in Runtime Config
- **Step-Up Verification ("Sudo Mode") & Secret Masking**:
  - 5-minute `auth:step_up:<userId>` verification window supporting **Passkey**, **Password**, **TOTP**, and **Email OTP** (for OAuth-only accounts)
  - Server-side masking (`••••••••`) on client secrets, OAuth provider secrets, and AES-256-GCM runtime secrets, with step-up-gated reveal endpoints
- **Role-Based Access Control (RBAC)**:
  - Roles, permissions, and user permission overrides
- **Identity Federation**:
  - Inbound social logins (Google, GitHub, Discord, Microsoft Entra ID, Telegram, Apple)

---

## 🛡️ Step-Up & Secret Reveal Endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /auth/step-up/status` | JWT | Returns current sudo window status and available methods (`password`, `passkey`, `totp`, `emailOtp`) |
| `POST /auth/step-up/verify` | JWT | Verifies `password`, `totp`, or `email_otp` to open a 5-minute sudo window |
| `POST /auth/step-up/email-otp/request` | JWT | Sends a 6-digit step-up OTP to the user's email (60s cooldown) |
| `POST /auth/step-up/passkey/options` | JWT | Issues WebAuthn challenge for in-session step-up |
| `POST /auth/step-up/passkey/verify` | JWT | Verifies WebAuthn assertion and opens a 5-minute sudo window |
| `DELETE /auth/step-up` | JWT | Immediately locks/clears the active sudo window |
| `GET /admin/apps/:code/reveal-secret` | JWT + Step-Up | Reveals plaintext `clientSecret` & `secondaryClientSecret` |
| `GET /admin/oauth/providers/:code/reveal-secret` | JWT + Step-Up | Reveals OAuth provider `clientSecret` / `privateKey` |
| `GET /system/runtime-config/:key/reveal` | JWT + Step-Up | Decrypts and reveals a single AES-256-GCM runtime secret |

---

## 🔑 OIDC Endpoints

| Protocol Endpoint | URL | Description |
|---|---|---|
| **Discovery** | `GET /oidc/.well-known/openid-configuration` | OpenID Connect discovery metadata |
| **Root Discovery** | `GET /.well-known/openid-configuration` | Redirects to standard OIDC discovery |
| **JWKS** | `GET /oidc/jwks` | JSON Web Key Set (public signing keys) |
| **Authorization** | `GET/POST /oidc/auth` | User-agent authentication & consent |
| **Resume Auth** | `GET/POST /oidc/auth/:uid` | Resumes auth flow after interaction login |
| **Token** | `POST /oidc/token` | Token issuance (`authorization_code`, `refresh_token`, `client_credentials`) |
| **UserInfo** | `GET/POST /oidc/me` | UserInfo endpoint returning user claims & roles |
| **Introspection** | `POST /oidc/introspect` | Inspect token status & validity (RFC 7662) |
| **Revocation** | `POST /oidc/revoke` | Revoke access / refresh tokens (RFC 7009) |
| **End Session** | `GET/POST /oidc/session/end` | RP-Initiated logout |
| **Interaction** | `GET/POST /oidc/interaction/:uid` | Login & consent orchestration |

---

## 🚀 Quick Start (Keycloak-Grade Dev Mode)

AngkorGate Core features a zero-configuration embedded developer mode powered by `better-sqlite3`, just like Keycloak's `start-dev`. No Docker or PostgreSQL installation needed to get started:

```bash
# 1. Install dependencies
npm install

# 2. Start in zero-config dev mode (SQLite + auto-seeded default admin & client apps)
npm run start:dev

# Or run with pure in-memory database:
npm run start:dev:memory

# Or run with production PostgreSQL (requires running Postgres instance):
npm run start:dev-postgres
```

On first boot in dev mode, AngkorGate automatically creates and seeds:
- **Default Admin Account**: `admin@angkorgate.local` / `AdminPass123!`
- **Default OIDC Client App**: `clinic-app` (`your-secret-key`)
- **Default SPA Console App**: `angkorgate-console` (public client with PKCE)
- **Standard OIDC Scopes & RBAC Roles**: (`openid`, `profile`, `email`, `roles`, etc.)
- **Swagger UI**: Accessible at [http://localhost:8080/api](http://localhost:8080/api)
- **OIDC Discovery**: [http://localhost:8080/oidc/.well-known/openid-configuration](http://localhost:8080/oidc/.well-known/openid-configuration)

---

## ⚙️ Environment Variables

Add the following to your `.env` configuration:

```env
PORT=8080

# OIDC Provider
OIDC_ISSUER=http://localhost:8080/oidc
OIDC_CLIENT_ID=clinic-app
OIDC_CLIENT_SECRET=your-secret-key

# Optional: supply an existing RSA private key PEM or JWKS in environment
# OIDC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# OIDC_JWKS='{"keys":[{"kty":"RSA",...}]}'
```

> [!NOTE]
> If no RSA private key is specified, AngkorGate will automatically generate a secure 2048-bit RSA key pair at startup and persist it to `oidc-keys/private.pem`.

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run full in-memory SQLite system smoke test
npm run smoke:sqlite

# Run linter and production build
npm run lint
npm run build

# Run e2e tests (requires PostgreSQL)
npm run test:e2e
```
