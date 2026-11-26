export interface AngkorGateUser {
  id: string;
  sub: string;
  email: string | null;
  name: string | null;
  preferredUsername?: string | null;
  emailVerified?: boolean;
  roles: string[];
  permissions: string[];
  claims: Record<string, unknown>;
}

export interface OidcTokenSet {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface OidcTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  redirectTo: string;
}

export interface IntrospectionResult {
  active: boolean;
  sub?: string;
  client_id?: string;
  scope?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
  introspection_endpoint?: string;
  revocation_endpoint?: string;
  [key: string]: unknown;
}

export interface CoreAuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    roles: string[];
    mustChangePassword: boolean;
  };
}

export type SessionDeviceType =
  | "desktop"
  | "mobile"
  | "tablet"
  | "cli"
  | "bot"
  | "unknown";

export interface AngkorGateSession {
  id: string;
  familyId: string;
  userAgent?: string;
  browser: string;
  os: string;
  deviceType: SessionDeviceType;
  ipAddress?: string;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface RevokeSessionsResult {
  revokedCount: number;
}

export interface AngkorGateClientConfig {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  fetchImpl?: typeof fetch;
  /**
   * In-memory TTL (ms) for verified token results, keyed by SHA-256 hash of the token.
   * Defaults to 30_000 (30 seconds). Set to 0 to disable caching.
   */
  tokenCacheTtlMs?: number;
  /**
   * Maximum number of cached token entries before oldest entry is evicted.
   * Defaults to 1000.
   */
  tokenCacheMaxEntries?: number;
  /**
   * When true, 3-part JWT access tokens are verified locally against GET /oidc/jwks
   * using Web Crypto before falling back to /oidc/me (opaque tokens still use /oidc/me).
   */
  useJwks?: boolean;
  /**
   * In-memory TTL (ms) for cached JWKS keys. Defaults to 300_000 (5 minutes).
   */
  jwksCacheTtlMs?: number;
}
