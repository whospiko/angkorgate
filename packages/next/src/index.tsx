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

  return (
    <ReactAngkorGateProvider
      persistCookie={persistCookie}
      onNavigate={
        onNavigate ??
        ((path) => {
          router.replace(path);
          router.refresh();
        })
      }
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
