const ACCESS_KEY = "angkorgate_todo_access_token";
const REFRESH_KEY = "angkorgate_todo_refresh_token";
const ID_KEY = "angkorgate_todo_id_token";
const TX_KEY = "angkorgate_todo_oidc_tx";

export const ANGKORGATE_URL = (
  import.meta.env.VITE_ANGKORGATE_URL || "http://localhost:8080"
).replace(/\/+$/, "");

export const ANGKORGATE_CONSOLE_URL = (
  import.meta.env.VITE_ANGKORGATE_CONSOLE_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export const OIDC_CLIENT_ID =
  import.meta.env.VITE_OIDC_CLIENT_ID || "demo-app";

export const OIDC_SCOPES = "openid profile email roles offline_access";

export interface OidcTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBase64Url(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return toBase64Url(new Uint8Array(digest));
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getIdToken(): string | null {
  return localStorage.getItem(ID_KEY);
}

export function saveTokens(tokens: OidcTokenResponse): void {
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  }
  if (tokens.id_token) {
    localStorage.setItem(ID_KEY, tokens.id_token);
  }
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ID_KEY);
  sessionStorage.removeItem(TX_KEY);
}

export async function startSsoLogin(): Promise<void> {
  const state = randomBase64Url(24);
  const nonce = randomBase64Url(24);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const redirectUri = `${window.location.origin}/callback`;

  sessionStorage.setItem(
    TX_KEY,
    JSON.stringify({ state, nonce, codeVerifier, redirectUri })
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: OIDC_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: OIDC_SCOPES,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  window.location.replace(`${ANGKORGATE_URL}/oidc/auth?${params.toString()}`);
}

export async function exchangeCodeForTokens(
  code: string,
  returnedState: string | null
): Promise<OidcTokenResponse> {
  const rawTx = sessionStorage.getItem(TX_KEY);
  sessionStorage.removeItem(TX_KEY);

  if (!rawTx) {
    throw new Error("Missing OIDC login transaction. Please sign in again.");
  }

  const tx = JSON.parse(rawTx) as {
    state: string;
    codeVerifier: string;
    redirectUri: string;
  };

  if (!returnedState || returnedState !== tx.state) {
    throw new Error("Invalid OIDC state parameter.");
  }

  const res = await fetch(`${ANGKORGATE_URL}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: OIDC_CLIENT_ID,
      code,
      redirect_uri: tx.redirectUri,
      code_verifier: tx.codeVerifier,
    }).toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `OIDC token exchange failed (${res.status})`);
  }

  const tokens = (await res.json()) as OidcTokenResponse;
  saveTokens(tokens);
  return tokens;
}

export async function refreshOidcTokens(): Promise<OidcTokenResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }

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
  });

  if (!res.ok) {
    clearTokens();
    throw new Error(`Token refresh failed (${res.status})`);
  }

  const tokens = (await res.json()) as OidcTokenResponse;
  saveTokens(tokens);
  return tokens;
}

export function logoutSso(): void {
  const idToken = getIdToken();
  clearTokens();

  const params = new URLSearchParams({
    post_logout_redirect_uri: window.location.origin,
  });
  if (idToken) {
    params.set("id_token_hint", idToken);
  }

  window.location.replace(`${ANGKORGATE_URL}/oidc/session/end?${params.toString()}`);
}
