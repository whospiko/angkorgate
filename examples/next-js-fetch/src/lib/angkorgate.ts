import type {
  ApiEnvelope,
  AuthTokensResponse,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  SessionInfo,
  UserProfile,
} from "@/types/auth";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from "./auth-storage";

export const ANGKORGATE_URL = (
  process.env.NEXT_PUBLIC_ANGKORGATE_URL || "http://localhost:8080"
).replace(/\/+$/, "");

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

function unwrapEnvelope<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

async function rawFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetch(`${ANGKORGATE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let json: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const errObj = json as { message?: string | string[]; error?: string } | null;
    const rawMsg = errObj?.message;
    const message =
      (Array.isArray(rawMsg) ? rawMsg.join(", ") : rawMsg) ||
      errObj?.error ||
      `Request failed with status ${response.status}`;
    throw new AngkorGateError(message, response.status, json);
  }

  return unwrapEnvelope<T>(json);
}

export async function loginWithEmail(payload: LoginPayload): Promise<LoginResponse> {
  const result = await rawFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!("mfaRequired" in result)) {
    saveAuthTokens(result);
  }

  return result;
}

export async function completeMfaLogin(
  mfaToken: string,
  code: string
): Promise<AuthTokensResponse> {
  const result = await rawFetch<AuthTokensResponse>("/auth/login/mfa", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mfaToken}`,
    },
    body: JSON.stringify({ code }),
  });

  saveAuthTokens(result);
  return result;
}

export async function registerCustomer(payload: RegisterPayload): Promise<unknown> {
  return rawFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshSession(): Promise<AuthTokensResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new AngkorGateError("No refresh token available", 401);
  }

  const result = await rawFetch<AuthTokensResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

  saveAuthTokens(result);
  return result;
}

async function fetchWithAutoRefresh<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let token = getAccessToken();

  if (!token) {
    const refreshed = await refreshSession();
    token = refreshed.accessToken;
  }

  try {
    return await rawFetch<T>(path, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    if (err instanceof AngkorGateError && err.status === 401 && getRefreshToken()) {
      try {
        const refreshed = await refreshSession();
        return await rawFetch<T>(path, {
          ...init,
          headers: {
            ...init.headers,
            Authorization: `Bearer ${refreshed.accessToken}`,
          },
        });
      } catch (refreshErr) {
        clearAuthTokens();
        throw refreshErr;
      }
    }
    throw err;
  }
}

export async function fetchMe(): Promise<UserProfile> {
  return fetchWithAutoRefresh<UserProfile>("/auth/me", { method: "GET" });
}

export async function fetchSessions(): Promise<SessionInfo[]> {
  const refreshToken = getRefreshToken();
  const query = refreshToken
    ? `?currentRefreshToken=${encodeURIComponent(refreshToken)}`
    : "";
  return fetchWithAutoRefresh<SessionInfo[]>(`/auth/sessions${query}`, {
    method: "GET",
  });
}

export async function logoutSession(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await rawFetch<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearAuthTokens();
  }
}
