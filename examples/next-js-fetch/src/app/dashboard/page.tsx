"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ANGKORGATE_CONSOLE_URL,
  AngkorGateError,
  buildEndSessionUrl,
  fetchUserInfo,
  refreshOidcTokens,
} from "@/lib/angkorgate";
import {
  clearAuthTokens,
  decodeJwtPayload,
  getIdToken,
} from "@/lib/auth-storage";
import type { OidcUserInfo } from "@/types/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<OidcUserInfo | null>(null);
  const [idClaims, setIdClaims] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"refresh" | "logout" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUserInfo = useCallback(async () => {
    const info = await fetchUserInfo();
    const idToken = getIdToken();
    return {
      info,
      claims: idToken ? decodeJwtPayload(idToken) : null,
    };
  }, []);

  useEffect(() => {
    let active = true;

    loadUserInfo()
      .then(({ info, claims }) => {
        if (!active) return;
        setUserInfo(info);
        setIdClaims(claims);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof AngkorGateError && err.status === 401) {
          clearAuthTokens();
          router.replace("/login?redirect=/dashboard");
          return;
        }
        setError(
          err instanceof AngkorGateError
            ? err.message
            : "Failed to load OIDC UserInfo from AngkorGate."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadUserInfo, router]);

  async function handleRefreshToken() {
    setBusyAction("refresh");
    setStatusMessage(null);
    setError(null);
    try {
      const refreshed = await refreshOidcTokens();
      setStatusMessage(
        `OIDC tokens refreshed (expires in ${refreshed.expires_in}s).`
      );
      const { info, claims } = await loadUserInfo();
      setUserInfo(info);
      setIdClaims(claims);
    } catch (err) {
      if (err instanceof AngkorGateError && err.status === 401) {
        clearAuthTokens();
        router.replace("/login?redirect=/dashboard");
        return;
      }
      setError(err instanceof Error ? err.message : "Token refresh failed.");
    } finally {
      setBusyAction(null);
    }
  }

  function handleLogout() {
    setBusyAction("logout");
    const endSessionUrl = buildEndSessionUrl();
    window.location.replace(endSessionUrl);
  }

  if (loading && !userInfo) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
        <div className="text-sm text-zinc-400">
          Verifying OIDC session with AngkorGate...
        </div>
      </main>
    );
  }

  const roles = Array.isArray(userInfo?.roles) ? userInfo.roles : [];
  const permissions = Array.isArray(userInfo?.permissions)
    ? userInfo.permissions
    : [];

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200">
            ← Home
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Protected Dashboard</h1>
          <p className="text-xs text-zinc-400">
            Guarded by <code>src/middleware.ts</code> and verified via{" "}
            <code>GET /oidc/me</code>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={`${ANGKORGATE_CONSOLE_URL}/account`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3.5 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/25"
          >
            Manage Account ↗
          </a>
          <button
            type="button"
            onClick={handleRefreshToken}
            disabled={busyAction !== null}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {busyAction === "refresh" ? "Refreshing..." : "Refresh Token"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={busyAction !== null}
            className="rounded-lg bg-red-600/90 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {busyAction === "logout" ? "Signing out..." : "Sign Out (SSO)"}
          </button>
        </div>
      </header>

      {statusMessage && (
        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {userInfo && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              OIDC UserInfo (/oidc/me)
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Subject (sub)</dt>
                <dd className="truncate font-mono text-xs text-zinc-300">
                  {userInfo.sub}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Name</dt>
                <dd className="font-medium text-white">
                  {userInfo.name || userInfo.preferred_username || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Email</dt>
                <dd className="font-medium text-white">
                  {userInfo.email || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Email Verified</dt>
                <dd className="text-zinc-200">
                  {userInfo.email_verified ? "Yes" : "No"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Roles &amp; Permissions
            </h2>
            <div className="mt-4">
              <p className="text-xs text-zinc-400">Assigned Roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">No roles returned</span>
                )}
              </div>
            </div>

            {permissions.length > 0 && (
              <div className="mt-5">
                <p className="text-xs text-zinc-400">
                  Permissions ({permissions.length})
                </p>
                <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                  {permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-300"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {idClaims && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 md:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Decoded ID Token Claims
              </h2>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
                {JSON.stringify(idClaims, null, 2)}
              </pre>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
