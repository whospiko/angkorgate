# `@angkorgate/express`

Drop-in Express.js middleware for **AngkorGate** SSO authentication and RBAC role/permission guards, built on `@angkorgate/sdk`.

## Installation

```bash
npm install @angkorgate/express
```

## Quick Start

```ts
import express from "express";
import {
  angkorgateAuth,
  requireRole,
  requirePermission,
  requireRoleOrPermission,
} from "@angkorgate/express";

const app = express();
const auth = angkorgateAuth({ baseUrl: "http://localhost:8080" });

app.get("/me", auth, (req, res) => {
  res.json({ user: req.authUser });
});

app.get("/admin", auth, requireRole("ADMIN"), (req, res) => {
  res.json({ ok: true });
});

app.get(
  "/todos/all",
  auth,
  requireRoleOrPermission({
    roles: ["ADMIN"],
    permissions: ["todos:read:all"],
  }),
  (req, res) => {
    res.json({ todos: [] });
  }
);
```

## API

- `angkorgateAuth({ baseUrl, optional?, onError?, ... })`: Verifies `Authorization: Bearer <token>` against AngkorGate (`/oidc/me` with `/auth/me` fallback) and populates `req.authUser`.
- `requireRole(role | roles[])`: Allows access if `req.authUser` has at least one matching role (case-insensitive); otherwise responds with `403`.
- `requirePermission(permission | permissions[])`: Allows access if `req.authUser` has at least one matching permission; otherwise responds with `403`.
- `requireRoleOrPermission({ roles?, permissions? })`: Allows access if any specified role **or** permission matches.
