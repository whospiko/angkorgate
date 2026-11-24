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
- **Multi-Factor Authentication (MFA)**:
  - Time-based One-Time Passwords (TOTP)
  - Encrypted secrets & backup codes
- **Role-Based Access Control (RBAC)**:
  - Roles, permissions, and user permission overrides
- **Identity Federation**:
  - Inbound social logins (Google, Apple)

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

# Run e2e tests
npm run test:e2e

# Run all test suites
npm run test:all
```
