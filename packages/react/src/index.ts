export {
  AngkorGateProvider,
  useAngkorGate,
  useAuth,
  useUser,
  type AngkorGateProviderProps,
} from "./context";

export {
  SignInButton,
  SignOutButton,
  SignedIn,
  SignedOut,
  Protect,
  UserProfile,
  UserButton,
  type SignInButtonProps,
  type SignOutButtonProps,
  type ProtectProps,
  type UserProfileProps,
} from "./components";

export {
  buildAuthorizationUrl,
  createPkceChallenge,
  createTokenStore,
  decodeJwtPayload,
  exchangeAuthorizationCode,
  fetchOidcUser,
  isJwtUnexpired,
  normalizeStringArray,
  refreshAccessToken,
  DEFAULT_ACCESS_COOKIE,
  DEFAULT_ID_COOKIE,
  DEFAULT_REFRESH_COOKIE,
} from "./oidc-client";

export type {
  AngkorGateConfig,
  AngkorGateContextValue,
  AngkorGateUser,
  OidcTokenSet,
} from "./types";
