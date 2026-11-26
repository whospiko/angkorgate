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

export interface AngkorGateConfig {
  clientId: string;
  baseUrl: string;
  consoleUrl?: string;
  redirectUri?: string;
  postLogoutRedirectUri?: string;
  scope?: string;
  persistCookie?: boolean;
  storagePrefix?: string;
}

export interface AngkorGateContextValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AngkorGateUser | null;
  accessToken: string | null;
  idToken: string | null;
  error: string | null;
  accountPortalUrl: string;
  signIn: (redirectTo?: string) => Promise<void>;
  signOut: (postLogoutRedirectUri?: string) => void;
  refreshSession: () => Promise<OidcTokenSet | null>;
  getToken: () => Promise<string | null>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}
