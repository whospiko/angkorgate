import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AngkorGateProvider as ReactAngkorGateProvider,
  type AngkorGateProviderProps,
} from "@angkorgate/react";

export function AngkorGateProvider({
  children,
  persistCookie = true,
  onNavigate,
  ...rest
}: AngkorGateProviderProps) {
  const router = useRouter();

  const defaultNavigate = useCallback(
    (path: string) => {
      router.replace(path);
      router.refresh();
    },
    [router]
  );

  return (
    <ReactAngkorGateProvider
      persistCookie={persistCookie}
      onNavigate={onNavigate ?? defaultNavigate}
      {...rest}
    >
      {children}
    </ReactAngkorGateProvider>
  );
}

export {
  useAngkorGate,
  useAuth,
  useUser,
  SignInButton,
  SignOutButton,
  SignedIn,
  SignedOut,
  Protect,
  UserProfile,
  UserButton,
  type AngkorGateProviderProps,
  type SignInButtonProps,
  type SignOutButtonProps,
  type ProtectProps,
  type UserProfileProps,
  type AngkorGateConfig,
  type AngkorGateContextValue,
  type AngkorGateUser,
  type OidcTokenSet,
} from "@angkorgate/react";
