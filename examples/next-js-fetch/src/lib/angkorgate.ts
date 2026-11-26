import type { OidcTokenResponse, OidcUserInfo } from "@/types/auth";
import {
  clearAuthTokens,
  consumeOidcTransaction,
  getAccessToken,
  getIdToken,
  getRefreshToken,
  saveOidcTokens,
  saveOidcTransaction,
} from "./auth-storage";

export const ANGKORGATE_URL = (
  process.env.NEXT_PUBLIC_ANGKORGATE_URL || "http://localhost:8080"
).replace(/\/+$/, "");

export const OIDC_CLIENT_ID =
  process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || "demo-app";

export const OIDC_REDIRECT_URI =
  process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI || "http://localhost:3000/callback";

export const OIDC_POST_LOGOUT_REDIRECT_URI =
  process.env.NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI || "http://localhost:3000";

export const OIDC_SCOPES =
  process.env.NEXT_PUBLIC_OIDC_SCOPES ||
  "openid profile email roles offline_access";

export class AngkorGateError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AngkorGateError";
  }
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

async function createPkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(digest));
}

export async function buildAuthorizationUrl(redirectTo = "/dashboard"): Promise<string> {
  const state = randomBase64Url(24);
  const nonce = randomBase64Url(24);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await createPkceChallenge(codeVerifier);

  saveOidcTransaction({ state, nonce, codeVerifier, redirectTo });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: OIDC_CLIENT_ID,
    redirect_uri: OIDC_REDIRECT_URI,
    scope: OIDC_SCOPES,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${ANGKORGATE_URL}/oidc/auth?${params.toString()}`;
}

async function parseOidcError(response: Response): Promise<never> {
  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  const obj = payload as {
    error_description?: string;
    error?: string;
    message?: string;
  } | null;

  const message =
    obj?.error_description ||
    obj?.message ||
    obj?.error ||
    `OIDC request failed with status ${response.status}`;

  throw new AngkorGateError(message, response.status, payload);
}

export async function exchangeCodeForTokens(
  code: string,
  returnedState: string | null
): Promise<{ tokens: OidcTokenResponse; redirectTo: string }> {
  const tx = consumeOidcTransaction();
  if (!tx) {
    throw new AngkorGateError(
      "Missing OIDC login session. Please start sign-in again.",
      400
    );
  }

  if (!returnedState || returnedState !== tx.state) {
    throw new AngkorGateError("Invalid OIDC state parameter.", 400);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: OIDC_CLIENT_ID,
    code,
    redirect_uri: OIDC_REDIRECT_URI,
    code_verifier: tx.codeVerifier,
  });

  const response = await fetch(`${ANGKORGATE_URL}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    await parseOidcError(response);
  }

  const tokens = (await response.json()) as OidcTokenResponse;
  saveOidcTokens(tokens);

  return { tokens, redirectTo: tx.redirectTo || "/dashboard" };
}

export async function refreshOidcTokens(): Promise<OidcTokenResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new AngkorGateError("No refresh token available.", 401);
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: OIDC_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${ANGKORGATE_URL}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    await parseOidcError(response);
  }

  const tokens = (await response.json()) as OidcTokenResponse;
  saveOidcTokens(tokens);
  return tokens;
}

export async function fetchUserInfo(): Promise<OidcUserInfo> {
  let token = getAccessToken();

  if (!token) {
    const refreshed = await refreshOidcTokens();
    token = refreshed.access_token;
  }

  const callMe = (accessToken: string) =>
    fetch(`${ANGKORGATE_URL}/oidc/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

  let response = await callMe(token);

  if (response.status === 401 && getRefreshToken()) {
    try {
      const refreshed = await refreshOidcTokens();
      response = await callMe(refreshed.access_token);
    } catch (err) {
      clearAuthTokens();
      throw err;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthTokens();
    }
    await parseOidcError(response);
  }

  return (await response.json()) as OidcUserInfo;
}

export function buildEndSessionUrl(): string {
  const idToken = getIdToken();
  clearAuthTokens();

  const params = new URLSearchParams({
    post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI,
  });
  if (idToken) {
    params.set("id_token_hint", idToken);
  }

  return `${ANGKORGATE_URL}/oidc/session/end?${params.toString()}`;
}
