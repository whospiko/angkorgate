import {
  AngkorGateClient,
  hasAnyPermission,
  hasAnyRole,
  type AngkorGateClientConfig,
  type AngkorGateUser,
} from "@angkorgate/sdk";
import type { NextFunction, Request, Response } from "express";

export interface AngkorGateRequest extends Request {
  authUser?: AngkorGateUser;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AngkorGateUser;
    }
  }
}

export interface AngkorGateAuthOptions extends AngkorGateClientConfig {
  /**
   * When true, requests without a Bearer token are allowed through with `req.authUser = undefined`.
   */
  optional?: boolean;
  /**
   * Optional custom error handler if AngkorGate cannot be reached.
   */
  onError?: (err: unknown, req: Request, res: Response, next: NextFunction) => void;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * Express middleware that verifies `Authorization: Bearer <token>` against AngkorGate
 * (`/oidc/me` with `/auth/me` fallback) and attaches `req.authUser`.
 */
export function angkorgateAuth(options: AngkorGateAuthOptions) {
  const client = new AngkorGateClient(options);

  return async (
    req: AngkorGateRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const token = extractBearerToken(req);

    if (!token) {
      if (options.optional) {
        next();
        return;
      }
      res.status(401).json({ error: "Missing or invalid Authorization Bearer token" });
      return;
    }

    try {
      const user = await client.verifyToken(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired AngkorGate token" });
        return;
      }
      req.authUser = user;
      next();
    } catch (err) {
      if (options.onError) {
        options.onError(err, req, res, next);
        return;
      }
      res.status(502).json({ error: "Unable to reach AngkorGate SSO server" });
    }
  };
}

/**
 * Requires the authenticated user to hold at least one of the specified roles (case-insensitive).
 */
export function requireRole(role: string | string[]) {
  const roles = Array.isArray(role) ? role : [role];

  return (req: AngkorGateRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!hasAnyRole(req.authUser, roles)) {
      res.status(403).json({
        error: "Forbidden: missing required role",
        requiredRoles: roles,
      });
      return;
    }
    next();
  };
}

/**
 * Requires the authenticated user to hold at least one of the specified permissions.
 */
export function requirePermission(permission: string | string[]) {
  const permissions = Array.isArray(permission) ? permission : [permission];

  return (req: AngkorGateRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!hasAnyPermission(req.authUser, permissions)) {
      res.status(403).json({
        error: "Forbidden: missing required permission",
        requiredPermissions: permissions,
      });
      return;
    }
    next();
  };
}

/**
 * Requires either one of the specified roles OR one of the specified permissions.
 */
export function requireRoleOrPermission(options: {
  roles?: string[];
  permissions?: string[];
}) {
  const roles = options.roles || [];
  const permissions = options.permissions || [];

  return (req: AngkorGateRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const ok =
      (roles.length > 0 && hasAnyRole(req.authUser, roles)) ||
      (permissions.length > 0 && hasAnyPermission(req.authUser, permissions));

    if (!ok) {
      res.status(403).json({
        error: "Forbidden: insufficient AngkorGate role or permission",
        requiredRoles: roles,
        requiredPermissions: permissions,
      });
      return;
    }
    next();
  };
}

export {
  AngkorGateClient,
  AngkorGateError,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
  type AngkorGateUser,
} from "@angkorgate/sdk";
