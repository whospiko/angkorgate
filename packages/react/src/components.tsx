import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useAngkorGate } from "./context";

export interface SignInButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  redirectTo?: string;
  children?: ReactNode;
}

export function SignInButton({
  redirectTo,
  children = "Sign In with AngkorGate",
  ...rest
}: SignInButtonProps) {
  const { signIn } = useAngkorGate();
  return (
    <button type="button" onClick={() => void signIn(redirectTo)} {...rest}>
      {children}
    </button>
  );
}

export interface SignOutButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  postLogoutRedirectUri?: string;
  children?: ReactNode;
}

export function SignOutButton({
  postLogoutRedirectUri,
  children = "Sign Out",
  ...rest
}: SignOutButtonProps) {
  const { signOut } = useAngkorGate();
  return (
    <button
      type="button"
      onClick={() => signOut(postLogoutRedirectUri)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAngkorGate();
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAngkorGate();
  if (!isLoaded || isSignedIn) return null;
  return <>{children}</>;
}

export interface ProtectProps {
  role?: string;
  permission?: string;
  anyRole?: string[];
  anyPermission?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Protect({
  role,
  permission,
  anyRole,
  anyPermission,
  fallback = null,
  children,
}: ProtectProps) {
  const { isLoaded, isSignedIn, hasRole, hasPermission } = useAngkorGate();

  if (!isLoaded || !isSignedIn) {
    return <>{fallback}</>;
  }

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (anyRole && anyRole.length > 0 && !anyRole.some((r) => hasRole(r))) {
    return <>{fallback}</>;
  }

  if (
    anyPermission &&
    anyPermission.length > 0 &&
    !anyPermission.some((p) => hasPermission(p))
  ) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export interface UserProfileProps {
  showRoles?: boolean;
  showPermissions?: boolean;
  showAccountLink?: boolean;
  className?: string;
}

export function UserProfile({
  showRoles = true,
  showPermissions = false,
  showAccountLink = true,
  className,
}: UserProfileProps) {
  const { isLoaded, isSignedIn, user, accountPortalUrl, signOut } =
    useAngkorGate();

  if (!isLoaded || !isSignedIn || !user) return null;

  const displayName = user.name || user.preferredUsername || user.email || user.id;

  return (
    <div
      className={className}
      style={
        className
          ? undefined
          : {
              border: "1px solid #27272a",
              borderRadius: 12,
              padding: 20,
              background: "#18181b",
              color: "#f4f4f5",
              fontFamily: "system-ui, sans-serif",
            }
      }
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{displayName}</div>
          {user.email && (
            <div style={{ fontSize: 13, color: "#a1a1aa", marginTop: 2 }}>
              {user.email}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {showAccountLink && (
            <a
              href={accountPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #3f3f46",
                color: "#c7d2fe",
                textDecoration: "none",
              }}
            >
              Manage Account ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 8,
              border: "none",
              background: "#dc2626",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {showRoles && user.roles.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {user.roles.map((r) => (
            <span
              key={r}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(99,102,241,0.16)",
                border: "1px solid rgba(99,102,241,0.35)",
                color: "#a5b4fc",
              }}
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {showPermissions && user.permissions.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {user.permissions.map((p) => (
            <code
              key={p}
              style={{
                fontSize: 11,
                padding: "2px 6px",
                borderRadius: 6,
                background: "#27272a",
                color: "#d4d4d8",
              }}
            >
              {p}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserButton({ className }: { className?: string }) {
  const { isLoaded, isSignedIn, user, accountPortalUrl, signOut } =
    useAngkorGate();

  if (!isLoaded || !isSignedIn || !user) return null;

  const label = user.email || user.name || user.id;

  return (
    <div
      className={className}
      style={
        className
          ? undefined
          : {
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "system-ui, sans-serif",
            }
      }
    >
      <a
        href={accountPortalUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 13, color: "inherit", textDecoration: "none" }}
      >
        {label}
      </a>
      <button
        type="button"
        onClick={() => signOut()}
        style={{
          fontSize: 12,
          padding: "5px 10px",
          borderRadius: 6,
          border: "1px solid #3f3f46",
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
