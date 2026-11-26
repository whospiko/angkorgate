"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AngkorGateError,
  fetchMe,
  fetchSessions,
  logoutSession,
  refreshSession,
} from "@/lib/angkorgate";
import { clearAuthTokens } from "@/lib/auth-storage";
import type { SessionInfo, UserProfile } from "@/types/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"refresh" | "logout" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    const [me, activeSessions] = await Promise.all([
      fetchMe(),
      fetchSessions().catch(() => [] as SessionInfo[]),
    ]);
    return { me, activeSessions };
  }, []);

  useEffect(() => {
    let active = true;

    fetchDashboardData()
      .then(({ me, activeSessions }) => {
        if (!active) return;
        setProfile(me);
        setSessions(activeSessions);
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
            : "Failed to load profile from AngkorGate Core."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router, fetchDashboardData]);

  async function handleRefreshToken() {
    setBusyAction("refresh");
    setStatusMessage(null);
    setError(null);
    try {
      const refreshed = await refreshSession();
      setStatusMessage(
        `Access token rotated (expires in ${refreshed.accessTokenExpiresIn}s).`
      );
      const { me, activeSessions } = await fetchDashboardData();
      setProfile(me);
      setSessions(activeSessions);
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

  async function handleLogout() {
    setBusyAction("logout");
    await logoutSession();
    router.replace("/login");
    router.refresh();
  }

  if (loading && !profile) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
        <div className="text-sm text-zinc-400">
          Verifying session with AngkorGate Core...
        </div>
      </main>
    );
  }

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
            <code>GET /auth/me</code>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
            {busyAction === "logout" ? "Signing out..." : "Sign Out"}
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

      {profile && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Identity Profile
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Full Name</dt>
                <dd className="font-medium text-white">
                  {profile.fullName || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Email</dt>
                <dd className="font-medium text-white">
                  {profile.email || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">User ID</dt>
                <dd className="truncate font-mono text-xs text-zinc-300">
                  {profile.id}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Email Verified</dt>
                <dd className="text-zinc-200">
                  {profile.isEmailVerified ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">MFA Enabled</dt>
                <dd className="text-zinc-200">
                  {profile.mfaEnabled ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Passkeys</dt>
                <dd className="text-zinc-200">{profile.passkeysCount}</dd>
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
                {profile.roles.length > 0 ? (
                  profile.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">No roles assigned</span>
                )}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs text-zinc-400">
                Effective Permissions ({profile.permissions.length})
              </p>
              <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                {profile.permissions.length > 0 ? (
                  profile.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-300"
                    >
                      {perm}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">None</span>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 md:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Active Sessions ({sessions.length})
            </h2>
            {sessions.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-500">
                No active session details returned.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-800 text-xs">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <span className="font-mono text-zinc-200">{session.id}</span>
                      {session.isCurrent && (
                        <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                          Current
                        </span>
                      )}
                      {session.userAgent && (
                        <p className="mt-0.5 text-zinc-400">{session.userAgent}</p>
                      )}
                    </div>
                    <div className="text-right text-zinc-400">
                      <div>{session.ipAddress || "Unknown IP"}</div>
                      <div>
                        Expires {new Date(session.expiresAt).toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
