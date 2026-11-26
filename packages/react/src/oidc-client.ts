import type { AngkorGateUser, OidcTokenSet } from "./types";

export const DEFAULT_ACCESS_COOKIE = "angkorgate_token";
export const DEFAULT_REFRESH_COOKIE = "angkorgate_refresh_token";
export const DEFAULT_ID_COOKIE = "angkorgate_id_token";

export interface OidcTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  redirectTo: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBase64Url(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function createPkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(digest));
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
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
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function decodeJwtPayload<T = Record<string, unknown>>(
  token: string
): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function isJwtUnexpired(token: string): boolean {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  if (!payload) return false;
  const now = Math.floor(Date.now() / 1000);
  return !payload.exp || payload.exp > now;
}

export function normalizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string");
}

export function createTokenStore(prefix = "angkorgate", persistCookie = true) {
  const accessKey = `${prefix}_access_token`;
  const refreshKey = `${prefix}_refresh_token`;
  const idKey = `${prefix}_id_token`;
  const txKey = `${prefix}_oidc_tx`;

  return {
    saveTokens(tokens: OidcTokenSet) {
      if (typeof window === "undefined") return;
      const maxAge = tokens.expires_in ?? 3600;
      localStorage.setItem(accessKey, tokens.access_token);
      if (persistCookie) {
        setCookie(DEFAULT_ACCESS_COOKIE, tokens.access_token, maxAge);
      }
      if (tokens.refresh_token) {
        localStorage.setItem(refreshKey, tokens.refresh_token);
        if (persistCookie) {
          setCookie(DEFAULT_REFRESH_COOKIE, tokens.refresh_token, 60 * 60 * 24 * 30);
        }
      }
      if (tokens.id_token) {
        localStorage.setItem(idKey, tokens.id_token);
        if (persistCookie) {
          setCookie(DEFAULT_ID_COOKIE, tokens.id_token, maxAge);
        }
      }
    },
    getAccessToken(): string | null {
      if (typeof window === "undefined") return null;
      return (
        localStorage.getItem(accessKey) ||
        (persistCookie ? getCookie(DEFAULT_ACCESS_COOKIE) : null)
      );
    },
    getRefreshToken(): string | null {
      if (typeof window === "undefined") return null;
      return (
        localStorage.getItem(refreshKey) ||
        (persistCookie ? getCookie(DEFAULT_REFRESH_COOKIE) : null)
      );
    },
    getIdToken(): string | null {
      if (typeof window === "undefined") return null;
      return (
        localStorage.getItem(idKey) ||
        (persistCookie ? getCookie(DEFAULT_ID_COOKIE) : null)
      );
    },
    clear() {
      if (typeof window === "undefined") return;
      localStorage.removeItem(accessKey);
      localStorage.removeItem(refreshKey);
      localStorage.removeItem(idKey);
      sessionStorage.removeItem(txKey);
      if (persistCookie) {
        deleteCookie(DEFAULT_ACCESS_COOKIE);
        deleteCookie(DEFAULT_REFRESH_COOKIE);
        deleteCookie(DEFAULT_ID_COOKIE);
      }
    },
    saveTransaction(tx: OidcTransaction) {
      if (typeof window === "undefined") return;
      sessionStorage.setItem(txKey, JSON.stringify(tx));
    },
    consumeTransaction(): OidcTransaction | null {
      if (typeof window === "undefined") return null;
      const raw = sessionStorage.getItem(txKey);
      sessionStorage.removeItem(txKey);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as OidcTransaction;
      } catch {
        return null;
      }
    },
  };
}

export async function buildAuthorizationUrl(params: {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  redirectTo?: string;
}): Promise<{ url: string; transaction: OidcTransaction }> {
  const state = randomBase64Url(24);
  const nonce = randomBase64Url(24);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await createPkceChallenge(codeVerifier);
  const cleanBase = params.baseUrl.replace(/\/+$/, "");

  const query = new URLSearchParams({
    response_type: "code",
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: params.scope,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return {
    url: `${cleanBase}/oidc/auth?${query.toString()}`,
    transaction: {
      state,
      nonce,
      codeVerifier,
      redirectUri: params.redirectUri,
      redirectTo: params.redirectTo || "/",
    },
  };
}

export async function exchangeAuthorizationCode(params: {
  baseUrl: string;
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<OidcTokenSet> {
  const cleanBase = params.baseUrl.replace(/\/+$/, "");
  const res = await fetch(`${cleanBase}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: params.clientId,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    }).toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `OIDC token exchange failed (${res.status})`);
  }

  return (await res.json()) as OidcTokenSet;
}

export async function refreshAccessToken(params: {
  baseUrl: string;
  clientId: string;
  refreshToken: string;
}): Promise<OidcTokenSet> {
  const cleanBase = params.baseUrl.replace(/\/+$/, "");
  const res = await fetch(`${cleanBase}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: params.clientId,
      refresh_token: params.refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status})`);
  }

  return (await res.json()) as OidcTokenSet;
}

export async function fetchOidcUser(
  baseUrl: string,
  accessToken: string
): Promise<AngkorGateUser | null> {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const res = await fetch(`${cleanBase}/oidc/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;

  const claims = (await res.json()) as Record<string, unknown>;
  if (typeof claims.sub !== "string" || !claims.sub) return null;

  return {
    id: claims.sub,
    sub: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    name:
      typeof claims.name === "string"
        ? claims.name
        : typeof claims.preferred_username === "string"
          ? claims.preferred_username
          : null,
    preferredUsername:
      typeof claims.preferred_username === "string"
        ? claims.preferred_username
        : null,
    emailVerified:
      typeof claims.email_verified === "boolean"
        ? claims.email_verified
        : undefined,
    roles: normalizeStringArray(
      claims.roles ?? claims["https://angkorgate.com/roles"]
    ),
    permissions: normalizeStringArray(
      claims.permissions ?? claims["https://angkorgate.com/permissions"]
    ),
    claims,
  };
}
