export const ACCESS_TOKEN_KEY = "angkorgate_token";
export const REFRESH_TOKEN_KEY = "angkorgate_refresh_token";
export const ID_TOKEN_KEY = "angkorgate_id_token";
export const OIDC_TX_KEY = "angkorgate_oidc_tx";

export interface OidcTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectTo: string;
}

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

export function saveOidcTokens(tokens: {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
}) {
  if (typeof window === "undefined") return;

  const accessMaxAge = tokens.expires_in ?? 3600;

  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  setCookie(ACCESS_TOKEN_KEY, tokens.access_token, accessMaxAge);

  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    setCookie(REFRESH_TOKEN_KEY, tokens.refresh_token, 60 * 60 * 24 * 30);
  }

  if (tokens.id_token) {
    localStorage.setItem(ID_TOKEN_KEY, tokens.id_token);
    setCookie(ID_TOKEN_KEY, tokens.id_token, accessMaxAge);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) || getCookie(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY) || getCookie(REFRESH_TOKEN_KEY);
}

export function getIdToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ID_TOKEN_KEY);
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  sessionStorage.removeItem(OIDC_TX_KEY);
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
  deleteCookie(ID_TOKEN_KEY);
}

export function saveOidcTransaction(tx: OidcTransaction) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OIDC_TX_KEY, JSON.stringify(tx));
}

export function consumeOidcTransaction(): OidcTransaction | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(OIDC_TX_KEY);
  sessionStorage.removeItem(OIDC_TX_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OidcTransaction;
  } catch {
    return null;
  }
}

export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function isJwtValidStructureAndUnexpired(token: string): boolean {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  if (!payload) return false;
  const now = Math.floor(Date.now() / 1000);
  return !payload.exp || payload.exp > now;
}
