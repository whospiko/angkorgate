import { decodeJwtPayload } from "./oidc";
import { normalizeStringArray } from "./rbac";
import type {
  AngkorGateClientConfig,
  AngkorGateSession,
  AngkorGateUser,
  CoreAuthResponse,
  IntrospectionResult,
  OidcDiscoveryDocument,
  OidcTokenSet,
  RevokeSessionsResult,
} from "./types";

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

interface CachedTokenEntry {
  user: AngkorGateUser;
  expiresAt: number;
}

interface JwkKey extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

function base64UrlToUint8Array(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary =
    typeof atob === "function"
      ? atob(padded)
      : Buffer.from(padded, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function mapJwtAlgToWebCrypto(
  alg: string
): { importParams: RsaHashedImportParams; verifyParams: AlgorithmIdentifier } | null {
  switch (alg) {
    case "RS256":
      return {
        importParams: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        verifyParams: "RSASSA-PKCS1-v1_5",
      };
    case "RS384":
      return {
        importParams: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" },
        verifyParams: "RSASSA-PKCS1-v1_5",
      };
    case "RS512":
      return {
        importParams: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" },
        verifyParams: "RSASSA-PKCS1-v1_5",
      };
    default:
      return null;
  }
}

export class AngkorGateClient {
  private readonly baseUrl: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly fetchFn: typeof fetch;
  private readonly tokenCacheTtlMs: number;
  private readonly tokenCacheMaxEntries: number;
  private readonly useJwks: boolean;
  private readonly jwksCacheTtlMs: number;

  private readonly tokenCache = new Map<string, CachedTokenEntry>();
  private jwksCache: { keys: JwkKey[]; expiresAt: number } | null = null;

  constructor(config: AngkorGateClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.fetchFn = config.fetchImpl || fetch;
    this.tokenCacheTtlMs = config.tokenCacheTtlMs ?? 30_000;
    this.tokenCacheMaxEntries = config.tokenCacheMaxEntries ?? 1000;
    this.useJwks = config.useJwks ?? false;
    this.jwksCacheTtlMs = config.jwksCacheTtlMs ?? 300_000;
  }

  clearTokenCache(): void {
    this.tokenCache.clear();
  }

  clearJwksCache(): void {
    this.jwksCache = null;
  }

  private unwrapEnvelope<T>(payload: unknown): T {
    if (
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      (payload as { data?: T }).data !== undefined
    ) {
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  private basicAuthHeader(clientId?: string, clientSecret?: string): string {
    const id = clientId ?? this.clientId;
    const secret = clientSecret ?? this.clientSecret;
    if (!id || !secret) {
      throw new AngkorGateError(
        "clientId and clientSecret are required for this operation",
        400
      );
    }
    const raw = `${id}:${secret}`;
    const encoded =
      typeof btoa === "function"
        ? btoa(raw)
        : Buffer.from(raw, "utf-8").toString("base64");
    return `Basic ${encoded}`;
  }

  private userFromClaims(claims: Record<string, unknown>): AngkorGateUser | null {
    const sub =
      typeof claims.sub === "string" && claims.sub
        ? claims.sub
        : typeof claims.id === "string" && claims.id
          ? claims.id
          : null;
    if (!sub) return null;

    return {
      id: sub,
      sub,
      email: typeof claims.email === "string" ? claims.email : null,
      name:
        typeof claims.name === "string"
          ? claims.name
          : typeof claims.fullName === "string"
            ? claims.fullName
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

  private async getJwksKeys(forceRefresh = false): Promise<JwkKey[]> {
    const now = Date.now();
    if (!forceRefresh && this.jwksCache && this.jwksCache.expiresAt > now) {
      return this.jwksCache.keys;
    }

    const res = await this.fetchFn(`${this.baseUrl}/oidc/jwks`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new AngkorGateError(
        `Failed to fetch JWKS (${res.status})`,
        res.status
      );
    }

    const body = (await res.json()) as { keys?: JwkKey[] };
    const keys = Array.isArray(body?.keys) ? body.keys : [];
    this.jwksCache = {
      keys,
      expiresAt: now + this.jwksCacheTtlMs,
    };
    return keys;
  }

  private async verifyJwtWithJwks(
    token: string
  ): Promise<{ matched: boolean; user: AngkorGateUser | null }> {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { matched: false, user: null };
    }

    let header: { alg?: string; kid?: string };
    try {
      const headerJson = new TextDecoder().decode(base64UrlToUint8Array(parts[0]));
      header = JSON.parse(headerJson) as { alg?: string; kid?: string };
    } catch {
      return { matched: false, user: null };
    }

    const alg = header.alg || "RS256";
    const cryptoAlg = mapJwtAlgToWebCrypto(alg);
    if (!cryptoAlg) {
      return { matched: false, user: null };
    }

    let keys = await this.getJwksKeys(false);
    let jwk = header.kid
      ? keys.find((k) => k.kid === header.kid)
      : keys.find((k) => !k.use || k.use === "sig");

    if (!jwk && header.kid) {
      keys = await this.getJwksKeys(true);
      jwk = keys.find((k) => k.kid === header.kid);
    }

    if (!jwk) {
      return { matched: false, user: null };
    }

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      cryptoAlg.importParams,
      false,
      ["verify"]
    );

    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlToUint8Array(parts[2]);

    const isValidSig = await crypto.subtle.verify(
      cryptoAlg.verifyParams,
      key,
      signature as unknown as BufferSource,
      signingInput
    );

    if (!isValidSig) {
      return { matched: true, user: null };
    }

    const payload = decodeJwtPayload<Record<string, unknown>>(token);
    if (!payload) {
      return { matched: true, user: null };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp <= nowSec) {
      return { matched: true, user: null };
    }
    if (typeof payload.nbf === "number" && payload.nbf > nowSec) {
      return { matched: true, user: null };
    }

    return { matched: true, user: this.userFromClaims(payload) };
  }

  async getDiscovery(): Promise<OidcDiscoveryDocument> {
    const res = await this.fetchFn(
      `${this.baseUrl}/oidc/.well-known/openid-configuration`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) {
      throw new AngkorGateError(
        `Failed to fetch OIDC discovery (${res.status})`,
        res.status
      );
    }
    return (await res.json()) as OidcDiscoveryDocument;
  }

  /**
   * Verifies an AngkorGate Bearer token:
   * 1. Checks short-lived SHA-256 TTL cache (when `tokenCacheTtlMs > 0`).
   * 2. If `useJwks` is enabled and token is a 3-part JWT, verifies locally against `/oidc/jwks`.
   * 3. Otherwise verifies via `GET /oidc/me` (with `GET /auth/me` fallback).
   */
  async verifyToken(token: string): Promise<AngkorGateUser | null> {
    if (!token) return null;

    const now = Date.now();
    let cacheKey: string | null = null;

    if (this.tokenCacheTtlMs > 0) {
      cacheKey = await sha256Hex(token);
      const cached = this.tokenCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.user;
      }
      if (cached) {
        this.tokenCache.delete(cacheKey);
      }
    }

    let resolvedUser: AngkorGateUser | null = null;

    if (this.useJwks && token.split(".").length === 3) {
      try {
        const jwksResult = await this.verifyJwtWithJwks(token);
        if (jwksResult.matched) {
          resolvedUser = jwksResult.user;
        } else {
          resolvedUser = await this.verifyRemotely(token);
        }
      } catch {
        resolvedUser = await this.verifyRemotely(token);
      }
    } else {
      resolvedUser = await this.verifyRemotely(token);
    }

    if (resolvedUser && cacheKey && this.tokenCacheTtlMs > 0) {
      let expiresAt = now + this.tokenCacheTtlMs;
      const exp = resolvedUser.claims?.exp;
      if (typeof exp === "number") {
        expiresAt = Math.min(expiresAt, exp * 1000);
      }
      if (expiresAt > now) {
        if (this.tokenCache.size >= this.tokenCacheMaxEntries) {
          const oldestKey = this.tokenCache.keys().next().value;
          if (oldestKey !== undefined) {
            this.tokenCache.delete(oldestKey);
          }
        }
        this.tokenCache.set(cacheKey, { user: resolvedUser, expiresAt });
      }
    }

    return resolvedUser;
  }

  private async verifyRemotely(token: string): Promise<AngkorGateUser | null> {
    const oidcRes = await this.fetchFn(`${this.baseUrl}/oidc/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (oidcRes.ok) {
      const claims = (await oidcRes.json()) as Record<string, unknown>;
      const user = this.userFromClaims(claims);
      if (user) return user;
    }

    const authRes = await this.fetchFn(`${this.baseUrl}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!authRes.ok) return null;

    const raw = await authRes.json();
    const profile = this.unwrapEnvelope<Record<string, unknown>>(raw);
    if (!profile || typeof profile !== "object") {
      return null;
    }

    return this.userFromClaims(profile);
  }

  /**
   * M2M Client Credentials token grant (POST /oidc/token).
   */
  async getClientCredentialsToken(options?: {
    clientId?: string;
    clientSecret?: string;
    scope?: string;
  }): Promise<OidcTokenSet> {
    const auth = this.basicAuthHeader(options?.clientId, options?.clientSecret);
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      ...(options?.scope ? { scope: options.scope } : {}),
    });

    const res = await this.fetchFn(`${this.baseUrl}/oidc/token`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new AngkorGateError(
        `Client credentials grant failed (${res.status})`,
        res.status,
        data
      );
    }

    return data as OidcTokenSet;
  }

  /**
   * RFC 7662 token introspection (POST /oidc/introspect).
   */
  async introspectToken(
    token: string,
    options?: { clientId?: string; clientSecret?: string }
  ): Promise<IntrospectionResult> {
    const auth = this.basicAuthHeader(options?.clientId, options?.clientSecret);
    const res = await this.fetchFn(`${this.baseUrl}/oidc/introspect`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ token }).toString(),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new AngkorGateError(
        `Token introspection failed (${res.status})`,
        res.status,
        data
      );
    }
    return data as IntrospectionResult;
  }

  /**
   * RFC 7009 token revocation (POST /oidc/revoke).
   */
  async revokeToken(
    token: string,
    options?: { clientId?: string; clientSecret?: string }
  ): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    const body = new URLSearchParams({ token });

    const id = options?.clientId ?? this.clientId;
    const secret = options?.clientSecret ?? this.clientSecret;
    if (id && secret) {
      headers.Authorization = this.basicAuthHeader(id, secret);
    } else if (id) {
      body.set("client_id", id);
    }

    const res = await this.fetchFn(`${this.baseUrl}/oidc/revoke`, {
      method: "POST",
      headers,
      body: body.toString(),
    });

    if (!res.ok) {
      throw new AngkorGateError(
        `Token revocation failed (${res.status})`,
        res.status
      );
    }
  }

  /**
   * Direct email/password login (POST /auth/login).
   */
  async login(credentials: {
    email?: string;
    phone?: string;
    password: string;
  }): Promise<CoreAuthResponse> {
    const res = await this.fetchFn(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new AngkorGateError(
        (json as { message?: string } | null)?.message ||
          `Login failed (${res.status})`,
        res.status,
        json
      );
    }

    return this.unwrapEnvelope<CoreAuthResponse>(json);
  }

  /**
   * Rotates a core refresh token (POST /auth/refresh).
   * Throws AngkorGateError (401) if the token is expired or its family was revoked due to reuse.
   */
  async refresh(refreshToken: string): Promise<CoreAuthResponse> {
    const res = await this.fetchFn(`${this.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new AngkorGateError(
        (json as { message?: string } | null)?.message ||
          `Refresh failed (${res.status})`,
        res.status,
        json
      );
    }

    return this.unwrapEnvelope<CoreAuthResponse>(json);
  }

  /**
   * Lists enriched active sessions (parsed OS/Browser, IP, lastActiveAt) for the authenticated user.
   */
  async listSessions(
    accessToken: string,
    currentRefreshToken?: string
  ): Promise<AngkorGateSession[]> {
    const query = currentRefreshToken
      ? `?currentRefreshToken=${encodeURIComponent(currentRefreshToken)}`
      : "";
    const res = await this.fetchFn(`${this.baseUrl}/auth/sessions${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new AngkorGateError(
        (json as { message?: string } | null)?.message ||
          `Failed to list sessions (${res.status})`,
        res.status,
        json
      );
    }

    const sessions = this.unwrapEnvelope<AngkorGateSession[]>(json);
    return Array.isArray(sessions) ? sessions : [];
  }

  /**
   * Revokes a specific active session by ID (DELETE /auth/sessions/:id).
   */
  async revokeSession(accessToken: string, sessionId: string): Promise<void> {
    const res = await this.fetchFn(
      `${this.baseUrl}/auth/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new AngkorGateError(
        (json as { message?: string } | null)?.message ||
          `Failed to revoke session (${res.status})`,
        res.status,
        json
      );
    }
  }

  /**
   * Revokes all other active sessions while preserving the current refresh token family.
   */
  async revokeOtherSessions(
    accessToken: string,
    currentRefreshToken: string
  ): Promise<RevokeSessionsResult> {
    const res = await this.fetchFn(`${this.baseUrl}/auth/sessions/revoke-others`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ currentRefreshToken }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new AngkorGateError(
        (json as { message?: string } | null)?.message ||
          `Failed to revoke other sessions (${res.status})`,
        res.status,
        json
      );
    }

    return this.unwrapEnvelope<RevokeSessionsResult>(json);
  }
}
