import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_ACCESS_COOKIE,
  DEFAULT_ID_COOKIE,
  DEFAULT_REFRESH_COOKIE,
  fetchOidcUser,
  isJwtUnexpired,
  normalizeStringArray,
  type AngkorGateUser,
} from "@angkorgate/react";

export function createRouteMatcher(patterns: Array<string | RegExp>) {
  const compiled = patterns.map((p) =>
    p instanceof RegExp ? p : new RegExp(`^${p}(?:/.*)?$`)
  );
  return (request: NextRequest): boolean => {
    const pathname = request.nextUrl.pathname;
    return compiled.some((regex) => regex.test(pathname));
  };
}

function hasValidSessionCookie(request: NextRequest): boolean {
  const accessToken = request.cookies.get(DEFAULT_ACCESS_COOKIE)?.value;
  if (!accessToken) return false;

  if (accessToken.split(".").length === 3) {
    return isJwtUnexpired(accessToken);
  }

  const idToken = request.cookies.get(DEFAULT_ID_COOKIE)?.value;
  if (idToken && idToken.split(".").length === 3) {
    return isJwtUnexpired(idToken);
  }

  return true;
}

export interface AngkorGateMiddlewareOptions {
  protectedRoutes?: Array<string | RegExp>;
  loginPath?: string;
  afterSignInPath?: string;
}

export function angkorgateMiddleware(
  options: AngkorGateMiddlewareOptions = {}
) {
  const {
    protectedRoutes = ["/dashboard"],
    loginPath = "/login",
    afterSignInPath = "/dashboard",
  } = options;

  const isProtected = createRouteMatcher(protectedRoutes);

  return function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const isAuthenticated = hasValidSessionCookie(request);

    if (isProtected(request) && !isAuthenticated) {
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete(DEFAULT_ACCESS_COOKIE);
      res.cookies.delete(DEFAULT_REFRESH_COOKIE);
      res.cookies.delete(DEFAULT_ID_COOKIE);
      return res;
    }

    if (pathname === loginPath && isAuthenticated) {
      return NextResponse.redirect(new URL(afterSignInPath, request.url));
    }

    return NextResponse.next();
  };
}

export async function verifyAngkorGateToken(
  token: string,
  baseUrl: string
): Promise<AngkorGateUser | null> {
  const cleanBase = baseUrl.replace(/\/+$/, "");

  const oidcUser = await fetchOidcUser(cleanBase, token);
  if (oidcUser) return oidcUser;

  try {
    const res = await fetch(`${cleanBase}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const raw = (await res.json()) as {
      data?: Record<string, unknown>;
    } & Record<string, unknown>;
    const profile: Record<string, unknown> =
      raw && typeof raw === "object" && raw.data && typeof raw.data === "object"
        ? raw.data
        : raw;

    if (typeof profile.id !== "string" || !profile.id) return null;

    return {
      id: profile.id,
      sub: profile.id,
      email: typeof profile.email === "string" ? profile.email : null,
      name: typeof profile.fullName === "string" ? profile.fullName : null,
      roles: normalizeStringArray(profile.roles),
      permissions: normalizeStringArray(profile.permissions),
      claims: profile,
    };
  } catch {
    return null;
  }
}

export async function verifyAngkorGateRequest(
  request: NextRequest,
  options: { baseUrl: string }
): Promise<AngkorGateUser | null> {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const cookieToken = request.cookies.get(DEFAULT_ACCESS_COOKIE)?.value || null;
  const token = bearer || cookieToken;
  if (!token) return null;

  return verifyAngkorGateToken(token, options.baseUrl);
}

export async function auth(options: {
  baseUrl: string;
}): Promise<{ user: AngkorGateUser | null; token: string | null }> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(DEFAULT_ACCESS_COOKIE)?.value || null;
    if (!token) return { user: null, token: null };
    const user = await verifyAngkorGateToken(token, options.baseUrl);
    return { user, token: user ? token : null };
  } catch {
    return { user: null, token: null };
  }
}
