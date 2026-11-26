import type { NextFunction, Request, Response } from "express";

export interface AuthenticatedSsoUser {
  id: string;
  email: string | null;
  name: string | null;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedSsoUser;
}

const ANGKORGATE_URL = (
  process.env.ANGKORGATE_URL || "http://localhost:8080"
).replace(/\/+$/, "");

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

async function resolveFromOidcUserInfo(
  token: string
): Promise<AuthenticatedSsoUser | null> {
  const res = await fetch(`${ANGKORGATE_URL}/oidc/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;

  const claims = (await res.json()) as Record<string, unknown>;
  if (typeof claims.sub !== "string" || !claims.sub) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    name:
      typeof claims.name === "string"
        ? claims.name
        : typeof claims.preferred_username === "string"
          ? claims.preferred_username
          : null,
    roles: normalizeStringArray(
      claims.roles ?? claims["https://angkorgate.com/roles"]
    ),
    permissions: normalizeStringArray(
      claims.permissions ?? claims["https://angkorgate.com/permissions"]
    ),
  };
}

async function resolveFromCoreAuthMe(
  token: string
): Promise<AuthenticatedSsoUser | null> {
  const res = await fetch(`${ANGKORGATE_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;

  const raw = (await res.json()) as { data?: Record<string, unknown> } & Record<
    string,
    unknown
  >;
  const profile: Record<string, unknown> =
    raw && typeof raw === "object" && raw.data && typeof raw.data === "object"
      ? raw.data
      : raw;

  if (typeof profile.id !== "string" || !profile.id) return null;

  return {
    id: profile.id,
    email: typeof profile.email === "string" ? profile.email : null,
    name: typeof profile.fullName === "string" ? profile.fullName : null,
    roles: normalizeStringArray(profile.roles),
    permissions: normalizeStringArray(profile.permissions),
  };
}

/**
 * Verifies the Bearer token against AngkorGate SSO (/oidc/me, with /auth/me fallback)
 * and attaches the user's identity, roles, and permissions to `req.authUser`.
 */
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
    const user =
      (await resolveFromOidcUserInfo(token)) ??
      (await resolveFromCoreAuthMe(token));

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

/**
 * Requires either one of the allowed roles (case-insensitive) OR one of the required permissions.
 */
export function requireRoleOrPermission(options: {
  roles?: string[];
  permissions?: string[];
}) {
  const allowedRoles = (options.roles || []).map((r) => r.toUpperCase());
  const requiredPerms = options.permissions || [];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.authUser;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const hasRole = user.roles.some((r) =>
      allowedRoles.includes(r.toUpperCase())
    );
    const hasPermission = user.permissions.some((p) =>
      requiredPerms.includes(p)
    );

    if (!hasRole && !hasPermission) {
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
