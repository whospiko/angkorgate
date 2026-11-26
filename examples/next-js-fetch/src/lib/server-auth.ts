import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_KEY } from "./auth-storage";

export interface VerifiedSsoUser {
  id: string;
  email: string | null;
  name: string | null;
  roles: string[];
  permissions: string[];
}

const ANGKORGATE_URL = (
  process.env.NEXT_PUBLIC_ANGKORGATE_URL || "http://localhost:8080"
).replace(/\/+$/, "");

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function verifyRequestAuth(
  request: NextRequest
): Promise<VerifiedSsoUser | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const cookieToken = request.cookies.get(ACCESS_TOKEN_KEY)?.value || null;
  const token = bearerToken || cookieToken;

  if (!token) return null;

  try {
    const oidcRes = await fetch(`${ANGKORGATE_URL}/oidc/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (oidcRes.ok) {
      const claims = (await oidcRes.json()) as Record<string, unknown>;
      if (typeof claims.sub === "string" && claims.sub) {
        return {
          id: claims.sub,
          email: typeof claims.email === "string" ? claims.email : null,
          name:
            typeof claims.name === "string"
              ? claims.name
              : typeof claims.preferred_username === "string"
                ? claims.preferred_username
                : null,
          roles: toStringArray(
            claims.roles ?? claims["https://angkorgate.com/roles"]
          ),
          permissions: toStringArray(
            claims.permissions ?? claims["https://angkorgate.com/permissions"]
          ),
        };
      }
    }

    const authRes = await fetch(`${ANGKORGATE_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!authRes.ok) return null;

    const raw = (await authRes.json()) as {
      data?: Record<string, unknown>;
    } & Record<string, unknown>;
    const profile: Record<string, unknown> =
      raw && typeof raw === "object" && raw.data && typeof raw.data === "object"
        ? raw.data
        : raw;

    if (typeof profile.id !== "string" || !profile.id) return null;

    return {
      id: profile.id,
      email: typeof profile.email === "string" ? profile.email : null,
      name: typeof profile.fullName === "string" ? profile.fullName : null,
      roles: toStringArray(profile.roles),
      permissions: toStringArray(profile.permissions),
    };
  } catch {
    return null;
  }
}
