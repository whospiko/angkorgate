# `@angkorgate/sdk`

Framework-agnostic TypeScript / JavaScript SDK for **AngkorGate IAM** (Node.js, Bun, Deno, and Browsers).

## Installation

```bash
npm install @angkorgate/sdk
```

## Quick Start

### Verify User Tokens & Check Permissions (Backend)

```ts
import { AngkorGateClient, hasRole, hasPermission } from "@angkorgate/sdk";

const angkorgate = new AngkorGateClient({
  baseUrl: "http://localhost:8080",
});

const user = await angkorgate.verifyToken(bearerToken);
if (user && (hasRole(user, "ADMIN") || hasPermission(user, "billing:read"))) {
  // Authorized
}
```

### Machine-to-Machine (M2M Client Credentials)

```ts
const m2m = new AngkorGateClient({
  baseUrl: "http://localhost:8080",
  clientId: "clinic-api",
  clientSecret: process.env.CLIENT_SECRET!,
});

const { access_token } = await m2m.getClientCredentialsToken({
  scope: "openid roles",
});
```

### Browser / SPA PKCE Helpers

```ts
import { buildAuthorizationUrl, exchangeAuthorizationCode } from "@angkorgate/sdk";
```
