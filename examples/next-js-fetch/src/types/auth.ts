export interface ApiEnvelope<T> {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
}

export interface UserSummary {
  id: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  mustChangePassword: boolean;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: UserSummary;
}

export interface MfaChallengeResponse {
  mfaRequired: true;
  mfaToken: string;
  backupCodesRemaining: number;
}

export type LoginResponse = AuthTokensResponse | MfaChallengeResponse;

export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  roles: string[];
  permissions: string[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  mfaEnabled: boolean;
  passkeysCount: number;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth: string;
  phone?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
}
