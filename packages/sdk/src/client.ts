import { normalizeStringArray } from "./rbac";
import type {
  AngkorGateClientConfig,
  AngkorGateUser,
  CoreAuthResponse,
  IntrospectionResult,
  OidcDiscoveryDocument,
  OidcTokenSet,
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

export class AngkorGateClient {
  private readonly baseUrl: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: AngkorGateClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.fetchFn = config.fetchImpl || fetch;
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
   * Verifies an AngkorGate Bearer token via GET /oidc/me (with GET /auth/me fallback)
   * and returns normalized identity, roles, and permissions.
   */
  async verifyToken(token: string): Promise<AngkorGateUser | null> {
    if (!token) return null;

    const oidcRes = await this.fetchFn(`${this.baseUrl}/oidc/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (oidcRes.ok) {
      const claims = (await oidcRes.json()) as Record<string, unknown>;
      if (typeof claims.sub === "string" && claims.sub) {
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
    if (!profile || typeof profile.id !== "string" || !profile.id) {
      return null;
    }

    return {
      id: profile.id,
      sub: profile.id,
      email: typeof profile.email === "string" ? profile.email : null,
      name: typeof profile.fullName === "string" ? profile.fullName : null,
      roles: normalizeStringArray(profile.roles),
      permissions: normalizeStringArray(profile.permissions),
      claims: profile,
    };
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
}
