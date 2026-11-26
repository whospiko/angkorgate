import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_KEY,
  ID_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  isJwtValidStructureAndUnexpired,
} from "./lib/auth-storage";

const PROTECTED_ROUTES = ["/dashboard"];

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

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = hasValidSession(request);

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
