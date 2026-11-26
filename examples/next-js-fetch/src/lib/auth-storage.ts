export const ACCESS_TOKEN_KEY = "angkorgate_token";
export const REFRESH_TOKEN_KEY = "angkorgate_refresh_token";

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix));
  if (!match) return null;
  return decodeURIComponent(match.slice(prefix.length));
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function saveAuthTokens(params: {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
}) {
  if (typeof window === "undefined") return;

  const accessMaxAge = params.accessTokenExpiresIn ?? 900;
  const refreshMaxAge = params.refreshTokenExpiresIn ?? 604800;

  localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, params.refreshToken);

  // Also persist in cookies so Next.js middleware.ts can protect /dashboard
  setCookie(ACCESS_TOKEN_KEY, params.accessToken, accessMaxAge);
  setCookie(REFRESH_TOKEN_KEY, params.refreshToken, refreshMaxAge);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) || getCookie(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY) || getCookie(REFRESH_TOKEN_KEY);
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
}

export function isJwtValidStructureAndUnexpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf-8");
    const payload = JSON.parse(json) as { exp?: number };
    const now = Math.floor(Date.now() / 1000);
    return !payload.exp || payload.exp > now;
  } catch {
    return false;
  }
}
