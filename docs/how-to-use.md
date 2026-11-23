# AngkorGate Architecture, Features & Testing Guide

This document is the definitive technical reference and hands-on testing guide for **AngkorGate** — an enterprise-grade, Keycloak-aligned Identity & Access Management (IAM) and API Gateway platform. It covers both `angkorgate-core` (NestJS backend engine) and `angkorgate-console` (Next.js 15 App Router administrative dashboard).

---

## Table of Contents

1. [Architecture & Topology](#1-architecture--topology)
2. [Quickstart: Booting the System](#2-quickstart-booting-the-system)
3. [Feature 1: Client Application Management (OIDC/OAuth 2.0 Clients)](#3-feature-1-client-application-management-oidcoauth-20-clients)
   - [Confidential vs. Public Clients](#confidential-vs-public-clients)
   - [4-Step Registration Wizard](#4-step-registration-wizard)
   - [1-Click Keycloak JSON Import & Export](#1-click-keycloak-json-import--export)
   - [Zero-Downtime Dual-Secret Rotation (Grace Windows)](#zero-downtime-dual-secret-rotation-grace-windows)
   - [Multi-Framework SDK Snippet Generator](#multi-framework-sdk-snippet-generator)
   - [Live Regex & Wildcard Redirect Simulator](#live-regex--wildcard-redirect-simulator)
4. [Feature 2: OpenID Connect 1.0 & OAuth 2.0 Protocol Engine](#4-feature-2-openid-connect-10--oauth-20-protocol-engine)
   - [Endpoints & Discovery](#endpoints--discovery)
   - [Grant Types & Token Minting](#grant-types--token-minting)
   - [Dynamic Scope & Claim Enforcement](#dynamic-scope--claim-enforcement)
   - [PKCE RFC 7636 Hardening](#pkce-rfc-7636-hardening)
5. [Feature 3: End-to-End OAuth/OIDC Testing with OIDC Debugger](#5-feature-3-end-to-end-oauthoidc-testing-with-oidc-debugger)
   - [Why OIDC Debugger Works Against Localhost](#why-oidc-debugger-works-against-localhost)
   - [Configuration Parameters Table](#configuration-parameters-table)
   - [Step-by-Step Execution Walkthrough](#step-by-step-execution-walkthrough)
6. [Feature 4: Role-Based Access Control (RBAC) & Permissions](#6-feature-4-role-based-access-control-rbac--permissions)
   - [Two-Tab Unified Management Interface](#two-tab-unified-management-interface)
   - [Role-to-Permission Checkbox Matrix](#role-to-permission-checkbox-matrix)
   - [User Role Assignment & Granular Overrides (GRANT / REVOKE)](#user-role-assignment--granular-overrides-grant--revoke)
7. [Feature 5: Authentication, Security & Multi-Factor Auth (MFA)](#7-feature-5-authentication-security--multi-factor-auth-mfa)
   - [Local Authentication & Session Protection](#local-authentication--session-protection)
   - [Brute-Force Protection & Account Lockouts](#brute-force-protection--account-lockouts)
   - [TOTP 2FA & Emergency Backup Codes](#totp-2fa--emergency-backup-codes)
8. [Feature 6: External Social Identity Providers](#8-feature-6-external-social-identity-providers)
9. [Feature 7: System Monitoring, Distributed Cache & Audit Trail](#9-feature-7-system-monitoring-distributed-cache--audit-trail)
10. [Developer CLI Testing Playbook (cURL Commands)](#10-developer-cli-testing-playbook-curl-commands)
11. [Database Schema Reference](#11-database-schema-reference)
12. [Troubleshooting Matrix](#12-troubleshooting-matrix)

---

## 1. Architecture & Topology

```
+----------------------------------------------------------------------------------------------------+
|                                         USER BROWSER                                               |
|  - AngkorGate Console (http://localhost:3000)                                                      |
|  - Third-Party SPA / Mobile App / OIDC Debugger (https://oidcdebugger.com)                         |
+------------------------------------+-----------------------------------+---------------------------+
                                     |                                   |
                      HTTP / Next.js Server Actions           OIDC Auth Flow / CORS / API
                                     |                                   |
                                     v                                   v
+----------------------------------------------------------------------------------------------------+
|                                    ANGKORGATE CORE (Port 8080)                                      |
|  - OpenID Connect 1.0 Provider (oidc-provider engine with RS256 JWT minting)                       |
|  - Admin REST APIs (/admin/apps, /rbac, /users, /audit, /cache)                                    |
|  - CORS Handler (supports cross-origin browser tools & SPAs with credentials)                     |
|  - Dual-Secret Rotation Engine & Dynamic Scope Granularity Evaluator                               |
|  - In-Memory & Redis Distributed Cache Engine                                                      |
+--------------------------------------------------+-------------------------------------------------+
                                                   |
                                            TypeORM / SQL
                                                   |
                                                   v
+----------------------------------------------------------------------------------------------------+
|                                      POSTGRESQL DATABASE                                            |
|  - app_settings (OAuth Clients, PKCE flags, Redirect URIs, Primary & Secondary Secrets)            |
|  - scopes & app_scopes (OpenID Connect Scope-to-Claim Registry)                                    |
|  - roles, permissions, role_permissions (RBAC Hierarchy)                                           |
|  - users, user_roles, user_permission_overrides (Identity Records & Effective Permissions)          |
|  - audit_logs (Immutable Administrative Event Trail)                                               |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Quickstart: Booting the System

### Prerequisites
- Node.js >= 20.x
- PostgreSQL 15+ running on `localhost:5432`

### Step A: Initialize Database & Run Migrations
```bash
cd angkorgate-core
npm install
npm run migration:run
```
> **What this does:**
> - Creates `app_settings`, `scopes`, `app_scopes`, `roles`, `permissions`, and `role_permissions`.
> - Seeds default scopes: `openid`, `profile`, `email`, `phone`, `roles`, `permissions`, and `offline_access`.
> - Seeds initial administrative user `piko@angkorgate.com` (`admin1234`).

### Step B: Start AngkorGate Core (Backend Engine)
```bash
cd angkorgate-core
npm run start:dev
```
- **Backend API Base:** `http://localhost:8080`
- **Swagger Documentation:** `http://localhost:8080/docs`
- **OIDC Discovery:** `http://localhost:8080/oidc/.well-known/openid-configuration`
- **OIDC JWKS:** `http://localhost:8080/oidc/jwks`

### Step C: Start AngkorGate Console (Dashboard)
```bash
cd angkorgate-console
npm install
npm run dev
```
- **Console Dashboard:** `http://localhost:3000`
- **Default Admin Account:** `piko@angkorgate.com` / `admin1234`

---

## 3. Feature 1: Client Application Management (OIDC/OAuth 2.0 Clients)

AngkorGate delivers client management that matches and exceeds Keycloak's capabilities, accessible at **Console > Client Applications** (`http://localhost:3000/apps`).

### Confidential vs. Public Clients

| Characteristic | Confidential Client (`clinic-api`) | Public Client (`clinic-spa`, `demo-app`) |
| :--- | :--- | :--- |
| **Use Case** | Node.js, NestJS, Go, Python backend microservices | React, Next.js client-side, Vue, Flutter, Mobile apps |
| **Client Authentication** | Requires `client_secret` (Primary or Secondary) | **No secret required** |
| **PKCE Requirement** | Optional (Recommended) | **Strictly Enforced (RFC 7636 SHA-256)** |
| **Token Exchange** | POST `/oidc/token` with HTTP Basic Auth or Body | POST `/oidc/token` with `code_verifier` |
| **Allowed Flows** | `authorization_code`, `client_credentials`, `refresh_token` | `authorization_code`, `refresh_token` |

---

### 4-Step Registration Wizard
Click **"+ Register Client"** in the top-right corner of the Client Applications page:

1. **Step 1: General Settings**:
   - `Client ID` (`appCode`): Unique machine key (e.g., `clinic-api` or `mobile-app`).
   - `Client Name` & `Description`: Human-readable identifier.
2. **Step 2: Capabilities & Flows**:
   - `Client Authentication`: Toggle ON for Confidential, OFF for Public SPA.
   - `Standard Flow (Authorization Code)`: Enables user login via redirect.
   - `Service Accounts (M2M)`: Enables `client_credentials` grant for backend microservices.
   - `Require PKCE`: Mandatory for public clients; prevents authorization code interception attacks.
3. **Step 3: Login Settings & URLs**:
   - `Root URL` & `Home URL`: Base application endpoints.
   - `Valid Redirect URIs`: Whitelist of callbacks (supports exact URLs or wildcard patterns like `http://localhost:3000/*`).
   - `Web Origins (CORS)`: Whitelist of browser origins permitted to exchange codes.
4. **Step 4: Scopes Selection**:
   - Check standard scopes (`openid`, `profile`, `email`, `roles`, `permissions`, `offline_access`).
5. **Instant Credential Reveal**:
   - For confidential clients, generates a cryptographically secure 64-character secret with 1-click clipboard copy.

---

### 1-Click Keycloak JSON Import & Export
Seamlessly migrate existing Keycloak clients without manual data re-entry:
- **Import:** Open the Register Client wizard, click **"Import JSON"**, paste your Keycloak client export JSON, and click **"Prefill Form"**.
- **Export:** Open the Client Inspector Sheet, switch to the **JSON Export** tab, and copy or download a 100% Keycloak-compliant configuration snippet.

---

### Zero-Downtime Dual-Secret Rotation (Grace Windows)
Traditional IAM systems cause downtime when rotating secrets because all distributed microservices must be updated in sync. AngkorGate solves this:
1. Open the Client Sheet > **Credentials** tab.
2. Select a grace window: `1 hour`, `12 hours`, `24 hours (Recommended)`, or `7 days`.
3. Click **"Rotate Secret"**.
4. **Result:**
   - A new **Primary Secret** is minted immediately.
   - The previous secret is automatically transitioned into an **Expiring Secondary Secret** with a live countdown timer.
   - Microservices can update their configurations progressively over 24 hours without dropping a single production token request.

---

### Multi-Framework SDK Snippet Generator
Inside the Client Sheet > **SDK Snippets** tab, developers get dynamically populated copy-paste code with actual client credentials:
- **NextAuth.js v5 / Auth.js** (for Next.js App Router)
- **NestJS Passport OIDC Strategy** (for enterprise backend APIs)
- **React SPA / OIDC Client TS** (for vanilla Single-Page Applications)
- **Direct cURL Commands** (for terminal debugging)

---

### Live Regex & Wildcard Redirect Simulator
Inside the Client Sheet > **Redirect Simulator** tab, test any callback URI before deploying:
- `http://localhost:5173/callback` → **MATCH VALIDATED** (Green)
- `http://attacker.com/evil` → **REJECTED (Mismatch)** (Red)
- `http://localhost:5173/sub/route` (with `http://localhost:5173/*` configured) → **MATCH VALIDATED** (Green)

---

## 4. Feature 2: OpenID Connect 1.0 & OAuth 2.0 Protocol Engine

AngkorGate runs a certified OIDC engine supporting the complete OpenID Connect Core 1.0 specification.

### Endpoints & Discovery

| Endpoint | Method | Path | Description |
| :--- | :--- | :--- | :--- |
| **Discovery** | `GET` | `/oidc/.well-known/openid-configuration` | Returns metadata, supported response types, algorithms, and endpoints |
| **JWKS** | `GET` | `/oidc/jwks` | Public RS256 RSA keys for validating JWT signatures |
| **Authorize** | `GET` | `/oidc/auth` | User-agent interactive authorization initiation |
| **Interaction** | `GET/POST` | `/oidc/interaction/:uid` | Handles login challenge, MFA prompt, and consent resolution |
| **Token** | `POST` | `/oidc/token` | Exchanges authorization codes or client credentials for JWT tokens |
| **UserInfo** | `GET/POST` | `/oidc/me` | Returns user claims based on authorized scopes |
| **Introspection**| `POST` | `/oidc/introspect` | RFC 7662 token introspection |
| **Revocation** | `POST` | `/oidc/revoke` | RFC 7009 token revocation |
| **End Session** | `GET` | `/oidc/session/end` | RP-Initiated logout |

---

### Grant Types & Token Minting

1. **Authorization Code Flow (`grant_type=authorization_code`)**:
   - For user login via web, mobile, or desktop applications.
   - Issues **Access Token** (JWT, default 1 hour TTL), **ID Token** (RS256 signed JWT with user claims), and optional **Refresh Token** (with `offline_access` scope).
2. **Client Credentials Flow (`grant_type=client_credentials`)**:
   - For Machine-to-Machine (M2M) server communications.
   - Issues an Access Token containing application identity and assigned realm roles.

---

### Dynamic Scope & Claim Enforcement

Scopes control which claims are packed into the minted tokens and returned by `/oidc/me`:

| Scope | Injected Claims | Purpose |
| :--- | :--- | :--- |
| `openid` | `sub` | Subject identifier (unique user ID) |
| `profile` | `name`, `preferred_username` | Basic profile identity |
| `email` | `email`, `email_verified` | Primary email address |
| `phone` | `phone`, `phone_verified` | Verified phone number |
| `roles` | `roles`, `https://angkorgate.com/roles` | Array of assigned RBAC role codes |
| `permissions`| `permissions`, `https://angkorgate.com/permissions` | Array of effective permission strings |
| `offline_access`| None (Mints `refresh_token`) | Enables background token renewal |

---

## 5. Feature 3: End-to-End OAuth/OIDC Testing with OIDC Debugger

You can verify your OIDC provider live using the industry standard **[https://oidcdebugger.com/](https://oidcdebugger.com/)**.

### Why OIDC Debugger Works Against Localhost
OIDC Debugger runs client-side JavaScript inside your web browser. When you submit requests to `http://localhost:8080`, the browser makes requests from your local network loopback interface, meaning no public tunneling (e.g. ngrok) is required.

---

### Configuration Parameters Table

Set the following parameters in **[https://oidcdebugger.com/](https://oidcdebugger.com/)**:

| Field | Value to Enter | Notes |
| :--- | :--- | :--- |
| **Authorize URI** | `http://localhost:8080/oidc/auth` | AngkorGate Authorization endpoint |
| **Redirect URI** | `https://oidcdebugger.com/debug` | Default callback of the tool |
| **Client ID** | `demo-app` | Pre-configured public client in database |
| **Scope** | `openid profile email roles` | Space-separated list of scopes |
| **Response type** | `code` *(checked)* | Authorization Code flow |
| **Response mode** | `query` or `form_post` | Both standard GET query redirect and HTML Form Post (OAuth 2.0 Form Post Response Mode) are fully supported |
| **State** | *(leave auto-generated)* | Random anti-CSRF token |
| **Nonce** | *(leave auto-generated)* | Cryptographic replay mitigation |
| **Use PKCE?** | Optional or Checked (SHA-256) | Enforced when `Require PKCE: ON` in client settings; optional when OFF (matches Keycloak behavior) |
| **Token URI** | `http://localhost:8080/oidc/token` | Token exchange endpoint |
| **Client Secret** | *(leave blank)* | `demo-app` is a Public SPA client |

---

### Step-by-Step Execution Walkthrough

```
[OIDC Debugger]                                    [AngkorGate Core]                            [AngkorGate Console]
       |                                                   |                                              |
       | 1. GET /oidc/auth?client_id=demo-app...           |                                              |
       |-------------------------------------------------->|                                              |
       |                                                   | 2. Redirect to /login?interaction=<uid>      |
       |                                                   |--------------------------------------------->|
       |                                                   |                                              |
       |                               3. User enters piko@angkorgate.com / admin1234                     |
       |                                  and clicks "Sign In"                                            |
       |                                                   |<---------------------------------------------|
       |                                                   | 4. Finalize interaction & auto-consent       |
       |                                                   |                                              |
       | 5. 303 Redirect to https://oidcdebugger.com/debug?code=...                                       |
       |<--------------------------------------------------|                                              |
       |                                                   |                                              |
       | 6. POST /oidc/token (code + code_verifier)        |                                              |
       |-------------------------------------------------->|                                              |
       | 7. 200 OK (access_token, id_token, refresh_token) |                                              |
       |<--------------------------------------------------|                                              |
```

1. Click **"Send Request"** in OIDC Debugger.
2. The browser is directed to `http://localhost:8080/oidc/auth`, which redirects to:
   ```
   http://localhost:3000/login?interaction=<uid>
   ```
3. AngkorGate Console renders the OIDC sign-in prompt:
   - Notice the purple **OpenID Connect Authorization** banner.
   - Enter `piko@angkorgate.com` and `admin1234`.
   - Click **"Sign In"**.
4. The interaction completes, auto-consents, and redirects you back to:
   ```
   https://oidcdebugger.com/debug?code=AGT...&state=...&iss=http://localhost:8080/oidc
   ```
5. On the OIDC Debugger results page:
   - View your minted Authorization Code.
   - Click **"Exchange code"**.
   - OIDC Debugger sends a CORS request to `http://localhost:8080/oidc/token` with the PKCE `code_verifier`.
   - Review your decoded **ID Token** and **Access Token** showing your subject ID, email, verified status, and realm roles (`["ADMIN"]`).

---

## 6. Feature 4: Role-Based Access Control (RBAC) & Permissions

AngkorGate features an enterprise RBAC system at **Console > Roles & Permissions** (`http://localhost:3000/rbac`).

### Two-Tab Unified Management Interface
- **Roles Tab:** View all system and application roles (e.g. `ADMIN`, `DOCTOR`, `ACCOUNTANT`, `CUSTOMER`), create custom roles, and view permissions counts.
- **Permissions Tab:** Catalog of all fine-grained permissions across the organization (e.g. `apps:create`, `users:read`, `records:write`).

---

### Role-to-Permission Checkbox Matrix
To assign or revoke permissions for a role:
1. On the **Roles** tab, click any role row (or click the edit button).
2. The dialog opens displaying the **Permissions Checklist**:
   - Check or uncheck individual permissions.
   - Search permissions in real time.
3. Click **"Save Permissions"**.
4. Changes take effect immediately across all active user sessions upon next token issuance or refresh (`PUT /rbac/roles/:id/permissions`).

---

### User Role Assignment & Granular Overrides (GRANT / REVOKE)
In addition to role hierarchies, AngkorGate supports user-level exception overrides:
- **Assign Roles to User:** `POST /rbac/roles/assign` `{ userId, roleId }`
- **Bulk Replace User Roles:** `PUT /rbac/roles/assign-bulk` `{ userId, roleIds: [...] }`
- **Individual User Overrides:**
  - `GRANT`: Explicitly grant a permission to a user even if their role doesn't have it.
  - `REVOKE`: Explicitly revoke a permission from a user even if their role grants it.
  - Endpoint: `POST /rbac/overrides` `{ userId, permissionCode, effect: "GRANT" | "REVOKE" }`
- **Calculate Effective Permissions:** `GET /rbac/users/:userId/permissions` resolves the net effective permissions by computing `(Role Permissions + User Grants) - User Revocations`.

---

## 7. Feature 5: Authentication, Security & Multi-Factor Auth (MFA)

### Local Authentication & Session Protection
- **Password Security:** Multi-round cryptographic hashing with Argon2id / Bcrypt.
- **Access Tokens:** Short-lived JWTs (default 15 minutes) signed with RS256 private key.
- **Refresh Tokens:** Long-lived opaque reference tokens (default 7 days) stored with rotating revocation tracking.
- **Cookie Policy:** `httpOnly: true`, `sameSite: "lax"`, and path-isolated session cookies.

---

### Brute-Force Protection & Account Lockouts
- Tracks consecutive failed authentication attempts by IP and account identifier.
- After 5 consecutive failures, the account enters temporary lockout (`lockedUntil = NOW() + 15 minutes`).
- Any attempt to authenticate during lockout returns `403 Forbidden` with the remaining unlock countdown.

---

### TOTP 2FA & Emergency Backup Codes
- **TOTP Standard:** Compatible with Google Authenticator, 1Password, and Authy (RFC 6238).
- **MFA Enrollment:**
  - Request enrollment: `POST /auth/mfa/totp/setup` returns QR code URI and secret.
  - Verify and activate: `POST /auth/mfa/totp/enable` with 6-digit TOTP code.
- **Backup Codes:** Mints 10 single-use cryptographically hashed emergency recovery codes.
- **Login with MFA:** When MFA is enabled, primary authentication returns `MFA_REQUIRED`; the client then submits `POST /auth/mfa/verify` or provides `mfaCode` during OIDC interaction.

---

## 8. Feature 6: External Social Identity Providers

AngkorGate enables federated identity at **Console > OAuth Providers** (`http://localhost:3000/oauth-providers`):
- **Supported Providers:** Google, Apple (extensible to GitHub, Microsoft Azure AD).
- **Zero-Code Console Config:** Toggle providers ON/OFF and input Client ID, Client Secret, and Scopes directly in the dashboard.
- **Automatic Account Linking:** When a user logs in via Google with an email matching an existing local account, AngkorGate securely links the identity without creating duplicate user records.

---

## 9. Feature 7: System Monitoring, Distributed Cache & Audit Trail

- **Telemetry & Health:** `GET /system/health` probes database connectivity, OIDC provider readiness, and memory headroom.
- **Distributed Cache Engine:** Configurable between In-Memory LRU and Distributed Redis (`/cache/keys`, `/cache/flush`), providing sub-millisecond session validation.
- **Immutable Audit Trail:** Located at **Console > Audit Logs** (`http://localhost:3000/audit`). Records administrative actions: client registration, secret rotation, role assignments, user status alterations, and failed login anomalies.

---

## 10. Developer CLI Testing Playbook (cURL Commands)

Run these commands in your terminal to test each subsystem directly.

### 1. Authenticate Admin & Export Token
```bash
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8080/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"piko@angkorgate.com","password":"admin1234"}' | jq -r .accessToken)

echo "JWT: $ADMIN_TOKEN"
```

---

### 2. Inspect OIDC Discovery Configuration
```bash
curl -s http://localhost:8080/oidc/.well-known/openid-configuration | jq .
```

---

### 3. Machine-to-Machine Token Exchange (Client Credentials)
```bash
# Using clinic-api
curl -s -X POST "http://localhost:8080/oidc/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "clinic-api:69d2776ab1ad6dd956d967d8176e46550c3e18a13243b0bb45fb58ca234214c9" \
  -d "grant_type=client_credentials&scope=openid roles" | jq .
```

---

### 4. Public Client PKCE Authorization Code Exchange
```bash
# Step A: Initiate flow and extract code
CODE_VERIFIER="dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
CODE_CHALLENGE="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

# Step B: Exchange code for tokens (replace YOUR_AUTH_CODE)
curl -s -X POST "http://localhost:8080/oidc/token" \
  -H "Origin: https://oidcdebugger.com" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=demo-app&code=YOUR_AUTH_CODE&redirect_uri=https://oidcdebugger.com/debug&code_verifier=$CODE_VERIFIER" | jq .
```

---

### 5. Call UserInfo Endpoint
```bash
curl -s "http://localhost:8080/oidc/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq .
```

---

### 6. Introspect an Active Token
```bash
curl -s -X POST "http://localhost:8080/oidc/introspect" \
  -u "clinic-api:69d2776ab1ad6dd956d967d8176e46550c3e18a13243b0bb45fb58ca234214c9" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=YOUR_ACCESS_TOKEN" | jq .
```

---

### 7. Query Roles and Permissions via Admin API
```bash
# List all roles
curl -s "http://localhost:8080/rbac/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# List all permissions catalog
curl -s "http://localhost:8080/rbac/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

---

## 11. Database Schema Reference

Key tables managed by AngkorGate in PostgreSQL:

| Table | Primary Purpose | Key Columns |
| :--- | :--- | :--- |
| `app_settings` | Registered OIDC clients | `id`, `app_code`, `name`, `client_secret`, `secondary_client_secret`, `secondary_secret_expires_at`, `valid_redirect_uris`, `web_origins`, `is_public_client`, `require_pkce` |
| `scopes` | OIDC scope catalog | `id`, `name`, `display_name`, `claims`, `is_default` |
| `app_scopes` | M:N client-to-scope mappings | `app_id`, `scope_id` |
| `roles` | RBAC roles | `id`, `code`, `name`, `description`, `is_system` |
| `permissions` | RBAC permissions | `id`, `code`, `name`, `description`, `category` |
| `role_permissions` | M:N role-to-permission mappings| `role_id`, `permission_id` |
| `users` | User identity records | `id`, `email`, `password_hash`, `is_active`, `locked_until`, `failed_attempts` |
| `user_roles` | M:N user-to-role assignments | `user_id`, `role_id` |
| `user_permission_overrides` | User-specific permission overrides | `id`, `user_id`, `permission_code`, `effect` (`GRANT`/`REVOKE`) |
| `audit_logs` | Immutable audit events | `id`, `action`, `actor_id`, `resource`, `details`, `created_at` |

---

## 12. Troubleshooting Matrix

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **CORS error on `/oidc/token`** | Browser blocked cross-origin POST request from `oidcdebugger.com`. | Ensure `app.enableCors()` is active in `src/main.ts` and `clientBasedCORS` is enabled in `oidc.service.ts`. |
| **`redirect_uri_mismatch`** | Redirect URI requested does not match `valid_redirect_uris`. | In Console > Client Applications > Settings, add the exact URL (e.g. `https://oidcdebugger.com/debug`) or wildcard (e.g. `http://localhost:3000/*`). |
| **`invalid_client` (401)** | Missing secret for confidential client, or wrong client ID. | Verify `client_id` matches `appCode`. For public clients (`is_public_client: true`), leave secret blank. |
| **`PKCE verification failed`** | Missing or incorrect `code_verifier` at token exchange. | Ensure PKCE (SHA-256) is checked in your test client and the unhashed verifier is passed to `/oidc/token`. |
| **Redirected to port 5173 instead of 3000** | `CONSOLE_URL` defaulted to 5173 in `.env`. | Set `CONSOLE_URL=http://localhost:3000` and `APP_WEB_URL=http://localhost:3000` in `angkorgate-core/.env`. |
| **401 Unauthorized accessing `/users` or `/admin/apps`** | Admin JWT token expired or missing in request header. | Re-authenticate via `/auth/login` to obtain a fresh Bearer token or sign in again via the Console UI. |
