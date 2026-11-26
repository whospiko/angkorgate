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

export interface AngkorGateClientConfig {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  fetchImpl?: typeof fetch;
}
