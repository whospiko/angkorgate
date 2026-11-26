# `@angkorgate/sdk`

Framework-agnostic TypeScript / JavaScript SDK for **AngkorGate IAM**—supporting Node.js, Express, Fastify, Hono, Bun, Deno, and browsers.

- **Zero runtime dependencies** (uses standard Web `fetch` and Web Crypto `crypto.subtle`)
- **Dual ESM + CJS builds** with full TypeScript declarations (`.d.ts`)
- **Covers**: OIDC/SSO Authorization Code + PKCE, Token Verification (`/oidc/me` & `/auth/me`), M2M Client Credentials, RFC 7662 Introspection, RFC 7009 Revocation, OIDC Discovery, Direct Login, and RBAC Role/Permission helpers.

---

## Installation

```bash
npm install @angkorgate/sdk
```

*(For local monorepo development: `"@angkorgate/sdk": "file:../../packages/sdk"`)*

---

## API Reference

### 1. `AngkorGateClient`

Main client for server-side token verification, M2M flows, introspection, revocation, discovery, and direct login.

```ts
import { AngkorGateClient, AngkorGateError } from "@angkorgate/sdk";

const angkorgate = new AngkorGateClient({
  baseUrl: "http://localhost:8080",
  clientId: "my-service",       // optional (required for M2M / introspect)
  clientSecret: "my-secret",    // optional (required for M2M / introspect)
  tokenCacheTtlMs: 30_000,      // optional SHA-256 TTL cache (default 30s; 0 disables)
  tokenCacheMaxEntries: 1000,   // optional max cached tokens (default 1000)
  useJwks: true,                // optional local RS256/RS384/RS512 JWT verification via /oidc/jwks
  jwksCacheTtlMs: 300_000,      // optional JWKS cache TTL (default 5m)
  fetchImpl: fetch,             // optional custom fetch implementation
});
```

#### Methods

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `verifyToken(token)` | `GET /oidc/me` → fallback `GET /auth/me` (or local `/oidc/jwks`) | Validates a Bearer token using the SHA-256 TTL cache, optional local JWKS verification (`useJwks: true`), and `/oidc/me` → `/auth/me` fallback. |
| `clearTokenCache()` / `clearJwksCache()` | — | Clears in-memory token verification or JWKS caches. |
| `getDiscovery()` | `GET /oidc/.well-known/openid-configuration` | Fetches the OIDC Discovery configuration document (`OidcDiscoveryDocument`). |
| `getClientCredentialsToken(options?)` | `POST /oidc/token` | Performs M2M `grant_type=client_credentials` exchange using HTTP Basic auth. Accepts `{ clientId?, clientSecret?, scope? }`. |
| `introspectToken(token, options?)` | `POST /oidc/introspect` | RFC 7662 token introspection. Returns `IntrospectionResult` (`{ active, sub, client_id, scope, exp, iat, ... }`). |
| `revokeToken(token, options?)` | `POST /oidc/revoke` | RFC 7009 token revocation. Supports confidential clients (`Basic` auth) or public clients (`client_id`). |
| `login({ email?, phone?, password })` | `POST /auth/login` | Direct email/phone + password login returning `CoreAuthResponse` (`{ accessToken, refreshToken, accessTokenExpiresIn, refreshTokenExpiresIn, user }`). |

All HTTP errors throw `AngkorGateError` (`message`, `status`, `details`).

---

### 2. RBAC Helpers (`roles` & `permissions`)

Case-insensitive role checks and exact permission checks for `AngkorGateUser` (or any object with `{ roles }` / `{ permissions }`):

| Function | Signature | Behavior |
| :--- | :--- | :--- |
| `hasRole(user, role)` | `(user, string) => boolean` | Case-insensitive check against `user.roles`. |
| `hasAnyRole(user, roles)` | `(user, string[]) => boolean` | Returns `true` if the user has at least one matching role. |
| `hasPermission(user, permission)` | `(user, string) => boolean` | Exact string match against `user.permissions`. |
| `hasAnyPermission(user, permissions)` | `(user, string[]) => boolean` | Returns `true` if the user has at least one matching permission. |
| `normalizeStringArray(val)` | `(unknown) => string[]` | Filters unknown values into `string[]`. |

#### Example: Express Middleware

```ts
import {
  AngkorGateClient,
  hasRole,
  hasAnyRole,
  hasAnyPermission,
} from "@angkorgate/sdk";

const angkorgate = new AngkorGateClient({ baseUrl: "http://localhost:8080" });

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Missing Bearer token" });

  const user = await angkorgate.verifyToken(token);
  if (!user) return res.status(401).json({ error: "Invalid or expired token" });

  req.authUser = user;
  next();
}

export function requireAdminOrBilling(req, res, next) {
  const user = req.authUser;
  if (
    !hasAnyRole(user, ["ADMIN"]) &&
    !hasAnyPermission(user, ["billing:read"])
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
```

---

### 3. OIDC / PKCE & JWT Helpers

Low-level helpers for building OIDC Authorization Code + PKCE flows in browsers, SPAs, CLIs, or custom frameworks:

| Function | Description |
| :--- | :--- |
| `randomBase64Url(byteLength = 32)` | Generates cryptographically random base64url strings (`state`, `nonce`, `code_verifier`). |
| `createPkceChallenge(verifier)` | Computes the `S256` PKCE `code_challenge` from a `code_verifier` via `crypto.subtle.digest("SHA-256", ...)`. |
| `buildAuthorizationUrl({ baseUrl, clientId, redirectUri, scope?, redirectTo?, prompt? })` | Builds the `/oidc/auth` URL with `S256` PKCE and returns `{ url, transaction }`. Supports `prompt: "none" \| "login" \| "consent"`. |
| `exchangeAuthorizationCode({ baseUrl, clientId, code, redirectUri, codeVerifier, fetchImpl? })` | Exchanges an authorization `code` + `codeVerifier` at `POST /oidc/token` for `OidcTokenSet`. |
| `refreshAccessToken({ baseUrl, clientId, refreshToken, fetchImpl? })` | Exchanges a `refresh_token` at `POST /oidc/token` for a new `OidcTokenSet`. |
| `buildEndSessionUrl({ baseUrl, postLogoutRedirectUri?, idTokenHint? })` | Builds the `/oidc/session/end` RP-Initiated Logout URL. |
| `decodeJwtPayload<T>(token)` | Decodes the base64url payload of a 3-part JWT without verifying signature (`T \| null`). |
| `isJwtUnexpired(token)` | Returns `true` if `token` is a valid 3-part JWT and `exp` is in the future (or omitted). |

#### Example: PKCE Flow

```ts
import {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  buildEndSessionUrl,
} from "@angkorgate/sdk";

// 1. Start SSO login
const { url, transaction } = await buildAuthorizationUrl({
  baseUrl: "http://localhost:8080",
  clientId: "demo-app",
  redirectUri: "http://localhost:3001/callback",
  scope: "openid profile email roles offline_access",
});
// Save `transaction` in sessionStorage, then redirect to `url`

// 2. On /callback?code=...&state=...
const tokens = await exchangeAuthorizationCode({
  baseUrl: "http://localhost:8080",
  clientId: "demo-app",
  code,
  redirectUri: transaction.redirectUri,
  codeVerifier: transaction.codeVerifier,
});

// 3. RP-Initiated SSO Logout
const logoutUrl = buildEndSessionUrl({
  baseUrl: "http://localhost:8080",
  postLogoutRedirectUri: "http://localhost:3001",
  idTokenHint: tokens.id_token,
});
```

---

### 4. M2M, Introspection & Revocation Examples

```ts
const m2m = new AngkorGateClient({
  baseUrl: "http://localhost:8080",
  clientId: "clinic-api",
  clientSecret: process.env.CLIENT_SECRET!,
});

// Mint M2M token
const { access_token } = await m2m.getClientCredentialsToken({
  scope: "openid roles",
});

// Introspect token (RFC 7662)
const info = await m2m.introspectToken(access_token);
console.log(info.active, info.sub, info.scope);

// Revoke token (RFC 7009)
await m2m.revokeToken(access_token);
```

---

### 5. Exported TypeScript Types

- `AngkorGateClientConfig`
- `AngkorGateUser`
- `OidcTokenSet`
- `OidcTransaction`
- `IntrospectionResult`
- `OidcDiscoveryDocument`
- `CoreAuthResponse`

---

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # tsx --test "src/**/*.test.ts"
npm run build       # tsup (ESM + CJS + DTS -> dist/)
```
