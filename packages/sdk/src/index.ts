export { AngkorGateClient, AngkorGateError } from "./client";

export {
  buildAuthorizationUrl,
  buildEndSessionUrl,
  createPkceChallenge,
  decodeJwtPayload,
  exchangeAuthorizationCode,
  isJwtUnexpired,
  randomBase64Url,
  refreshAccessToken,
} from "./oidc";

export {
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
  normalizeStringArray,
} from "./rbac";

export type {
  AngkorGateClientConfig,
  AngkorGateUser,
  CoreAuthResponse,
  IntrospectionResult,
  OidcDiscoveryDocument,
  OidcTokenSet,
  OidcTransaction,
} from "./types";
