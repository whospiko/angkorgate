import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  buildAuthorizationUrl,
  createTokenStore,
  exchangeAuthorizationCode,
  fetchOidcUser,
  refreshAccessToken,
} from "./oidc-client";
import type {
  AngkorGateConfig,
  AngkorGateContextValue,
  AngkorGateUser,
  OidcTokenSet,
} from "./types";

const AngkorGateContext = createContext<AngkorGateContextValue | null>(null);

export interface AngkorGateProviderProps extends AngkorGateConfig {
  children: ReactNode;
  onNavigate?: (path: string) => void;
}

export function AngkorGateProvider({
  clientId,
  baseUrl,
  consoleUrl = "http://localhost:4000",
  redirectUri,
  postLogoutRedirectUri,
  scope = "openid profile email roles offline_access",
  persistCookie = true,
  storagePrefix = "angkorgate",
  onNavigate,
  children,
}: AngkorGateProviderProps) {
  const store = useMemo(
    () => createTokenStore(storagePrefix, persistCookie),
    [storagePrefix, persistCookie]
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<AngkorGateUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const callbackPromiseRef = useRef<Promise<void> | null>(null);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  const cleanConsoleUrl = consoleUrl.replace(/\/+$/, "");
  const accountPortalUrl = `${cleanConsoleUrl}/account`;

  const applyTokensAndUser = useCallback(
    async (tokens: OidcTokenSet): Promise<AngkorGateUser | null> => {
      store.saveTokens(tokens);
      setAccessToken(tokens.access_token);
      setIdToken(tokens.id_token ?? store.getIdToken());
      const fetchedUser = await fetchOidcUser(cleanBaseUrl, tokens.access_token);
      setUser(fetchedUser);
      return fetchedUser;
    },
    [cleanBaseUrl, store]
  );

  const refreshSession = useCallback(async (): Promise<OidcTokenSet | null> => {
    const refreshToken = store.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const tokens = await refreshAccessToken({
        baseUrl: cleanBaseUrl,
        clientId,
        refreshToken,
      });
      await applyTokensAndUser(tokens);
      setError(null);
      return tokens;
    } catch (err) {
      store.clear();
      setAccessToken(null);
      setIdToken(null);
      setUser(null);
      setError(err instanceof Error ? err.message : "Session refresh failed");
      return null;
    }
  }, [applyTokensAndUser, cleanBaseUrl, clientId, store]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;

    async function initSession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const oidcError = url.searchParams.get("error");

      if (oidcError) {
        if (active) {
          setError(url.searchParams.get("error_description") || oidcError);
          setIsLoaded(true);
        }
        return;
      }

      if (code) {
        if (!callbackPromiseRef.current) {
          const tx = store.consumeTransaction();
          if (!tx || !state || state !== tx.state) {
            if (active) {
              setError("Invalid or expired OIDC login state.");
              setIsLoaded(true);
            }
            return;
          }

          callbackPromiseRef.current = (async () => {
            const tokens = await exchangeAuthorizationCode({
              baseUrl: cleanBaseUrl,
              clientId,
              code,
              redirectUri: tx.redirectUri,
              codeVerifier: tx.codeVerifier,
            });
            await applyTokensAndUser(tokens);
            const target = tx.redirectTo || "/";
            if (onNavigateRef.current) {
              onNavigateRef.current(target);
            } else {
              window.history.replaceState({}, "", target);
            }
          })();
        }

        try {
          await callbackPromiseRef.current;
        } catch (err) {
          if (active) {
            setError(
              err instanceof Error ? err.message : "OIDC token exchange failed."
            );
          }
        } finally {
          if (active) setIsLoaded(true);
        }
        return;
      }

      const existingAccess = store.getAccessToken();
      if (!existingAccess) {
        if (active) setIsLoaded(true);
        return;
      }

      try {
        const fetchedUser = await fetchOidcUser(cleanBaseUrl, existingAccess);
        if (!active) return;

        if (fetchedUser) {
          setAccessToken(existingAccess);
          setIdToken(store.getIdToken());
          setUser(fetchedUser);
        } else {
          await refreshSession();
        }
      } catch {
        if (active) await refreshSession();
      } finally {
        if (active) setIsLoaded(true);
      }
    }

    void initSession();

    return () => {
      active = false;
    };
  }, [applyTokensAndUser, cleanBaseUrl, clientId, refreshSession, store]);

  const signIn = useCallback(
    async (redirectTo?: string) => {
      if (typeof window === "undefined") return;
      const effectiveRedirectUri =
        redirectUri || `${window.location.origin}/callback`;
      const { url, transaction } = await buildAuthorizationUrl({
        baseUrl: cleanBaseUrl,
        clientId,
        redirectUri: effectiveRedirectUri,
        scope,
        redirectTo: redirectTo || window.location.pathname || "/",
      });
      store.saveTransaction(transaction);
      window.location.replace(url);
    },
    [cleanBaseUrl, clientId, redirectUri, scope, store]
  );

  const signOut = useCallback(
    (overridePostLogoutUri?: string) => {
      if (typeof window === "undefined") return;
      const currentIdToken = idToken || store.getIdToken();
      store.clear();
      setAccessToken(null);
      setIdToken(null);
      setUser(null);

      const postLogout =
        overridePostLogoutUri || postLogoutRedirectUri || window.location.origin;
      const params = new URLSearchParams({
        post_logout_redirect_uri: postLogout,
      });
      if (currentIdToken) {
        params.set("id_token_hint", currentIdToken);
      }
      window.location.replace(
        `${cleanBaseUrl}/oidc/session/end?${params.toString()}`
      );
    },
    [cleanBaseUrl, idToken, postLogoutRedirectUri, store]
  );

  const getToken = useCallback(async (): Promise<string | null> => {
    const current = accessToken || store.getAccessToken();
    if (current) return current;
    const refreshed = await refreshSession();
    return refreshed?.access_token ?? null;
  }, [accessToken, refreshSession, store]);

  const hasRole = useCallback(
    (role: string) => {
      if (!user) return false;
      const target = role.toUpperCase();
      return user.roles.some((r) => r.toUpperCase() === target);
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      return user.permissions.includes(permission);
    },
    [user]
  );

  const value = useMemo<AngkorGateContextValue>(
    () => ({
      isLoaded,
      isSignedIn: Boolean(user && accessToken),
      user,
      accessToken,
      idToken,
      error,
      accountPortalUrl,
      signIn,
      signOut,
      refreshSession,
      getToken,
      hasRole,
      hasPermission,
    }),
    [
      isLoaded,
      user,
      accessToken,
      idToken,
      error,
      accountPortalUrl,
      signIn,
      signOut,
      refreshSession,
      getToken,
      hasRole,
      hasPermission,
    ]
  );

  return (
    <AngkorGateContext.Provider value={value}>
      {children}
    </AngkorGateContext.Provider>
  );
}

export function useAngkorGate(): AngkorGateContextValue {
  const ctx = useContext(AngkorGateContext);
  if (!ctx) {
    throw new Error("useAngkorGate must be used inside <AngkorGateProvider>");
  }
  return ctx;
}

export function useAuth() {
  const ctx = useAngkorGate();
  return {
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
    userId: ctx.user?.id ?? null,
    accessToken: ctx.accessToken,
    signIn: ctx.signIn,
    signOut: ctx.signOut,
    getToken: ctx.getToken,
    hasRole: ctx.hasRole,
    hasPermission: ctx.hasPermission,
  };
}

export function useUser() {
  const ctx = useAngkorGate();
  return {
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
    user: ctx.user,
  };
}
