import {
  AngkorGateClient,
  hasAnyPermission,
  hasAnyRole,
  type AngkorGateUser,
} from "@angkorgate/sdk";
import type { NextFunction, Request, Response } from "express";

export interface AuthenticatedRequest extends Request {
  authUser?: AngkorGateUser;
}

const angkorgate = new AngkorGateClient({
  baseUrl: process.env.ANGKORGATE_URL || "http://localhost:8080",
});

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization Bearer token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Empty Bearer token" });
    return;
  }

  try {
    const user = await angkorgate.verifyToken(token);
    if (!user) {
      res.status(401).json({ error: "Invalid or expired AngkorGate token" });
      return;
    }

    req.authUser = user;
    next();
  } catch (err) {
    console.error("AngkorGate SSO verification error:", err);
    res.status(502).json({ error: "Unable to reach AngkorGate SSO server" });
  }
}

export function requireRoleOrPermission(options: {
  roles?: string[];
  permissions?: string[];
}) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.authUser;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const ok =
      (options.roles?.length ? hasAnyRole(user, options.roles) : false) ||
      (options.permissions?.length
        ? hasAnyPermission(user, options.permissions)
        : false);

    if (!ok) {
      res.status(403).json({
        error: "Forbidden: insufficient AngkorGate role or permission",
        requiredRoles: options.roles || [],
        requiredPermissions: options.permissions || [],
      });
      return;
    }

    next();
  };
}
