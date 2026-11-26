import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_KEY,
  ID_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  isJwtValidStructureAndUnexpired,
} from "./lib/auth-storage";

const PROTECTED_ROUTES = ["/dashboard"];

const ANGKORGATE_URL = (
  process.env.NEXT_PUBLIC_ANGKORGATE_URL || "http://localhost:8080"
).replace(/\/+$/, "");

const OIDC_CLIENT_ID =
  process.env.NEXT_PUBLIC_ANGKORGATE_CLIENT_ID || "next-js-fetch-demo";

function hasValidSession(request: NextRequest): boolean {
  const accessToken = request.cookies.get(ACCESS_TOKEN_KEY)?.value;
  if (!accessToken) return false;

  // OIDC access_token can be opaque (oidc-provider default) or a JWT.
  if (accessToken.split(".").length === 3) {
    return isJwtValidStructureAndUnexpired(accessToken);
  }

  const idToken = request.cookies.get(ID_TOKEN_KEY)?.value;
  if (idToken && idToken.split(".").length === 3) {
    return isJwtValidStructureAndUnexpired(idToken);
  }

  return true;
}

interface RefreshedTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
}

async function tryRefreshOidcTokens(
  refreshToken: string
): Promise<RefreshedTokens | null> {
  try {
    const res = await fetch(`${ANGKORGATE_URL}/oidc/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: OIDC_CLIENT_ID,
        refresh_token: refreshToken,
      }).toString(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RefreshedTokens;
    return data?.access_token ? data : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let isAuthenticated = hasValidSession(request);
  let refreshed: RefreshedTokens | null = null;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isAuthenticated && (isProtected || pathname === "/login")) {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_KEY)?.value;
    if (refreshToken) {
      refreshed = await tryRefreshOidcTokens(refreshToken);
      if (refreshed) {
        isAuthenticated = true;
      }
    }
  }

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(ACCESS_TOKEN_KEY);
    response.cookies.delete(REFRESH_TOKEN_KEY);
    response.cookies.delete(ID_TOKEN_KEY);
    return response;
  }

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (refreshed) {
    const isProd = process.env.NODE_ENV === "production";
    const response = NextResponse.next();
    response.cookies.set(ACCESS_TOKEN_KEY, refreshed.access_token, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: refreshed.expires_in || 3600,
    });
    if (refreshed.refresh_token) {
      response.cookies.set(REFRESH_TOKEN_KEY, refreshed.refresh_token, {
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 604800,
      });
    }
    if (refreshed.id_token) {
      response.cookies.set(ID_TOKEN_KEY, refreshed.id_token, {
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 604800,
      });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
