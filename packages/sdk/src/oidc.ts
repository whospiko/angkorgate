import type { OidcTokenSet, OidcTransaction } from "./types";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomBase64Url(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function createPkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(digest));
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

export async function buildAuthorizationUrl(params: {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  redirectTo?: string;
  prompt?: "none" | "login" | "consent";
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
    scope: params.scope || "openid profile email roles offline_access",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  if (params.prompt) {
    query.set("prompt", params.prompt);
  }

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

export function buildEndSessionUrl(params: {
  baseUrl: string;
  postLogoutRedirectUri?: string;
  idTokenHint?: string | null;
}): string {
  const cleanBase = params.baseUrl.replace(/\/+$/, "");
  const query = new URLSearchParams();
  if (params.postLogoutRedirectUri) {
    query.set("post_logout_redirect_uri", params.postLogoutRedirectUri);
  }
  if (params.idTokenHint) {
    query.set("id_token_hint", params.idTokenHint);
  }
  const qs = query.toString();
  return `${cleanBase}/oidc/session/end${qs ? `?${qs}` : ""}`;
}

export async function exchangeAuthorizationCode(params: {
  baseUrl: string;
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  fetchImpl?: typeof fetch;
}): Promise<OidcTokenSet> {
  const fetchFn = params.fetchImpl || fetch;
  const cleanBase = params.baseUrl.replace(/\/+$/, "");
  const res = await fetchFn(`${cleanBase}/oidc/token`, {
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
  fetchImpl?: typeof fetch;
}): Promise<OidcTokenSet> {
  const fetchFn = params.fetchImpl || fetch;
  const cleanBase = params.baseUrl.replace(/\/+$/, "");
  const res = await fetchFn(`${cleanBase}/oidc/token`, {
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
