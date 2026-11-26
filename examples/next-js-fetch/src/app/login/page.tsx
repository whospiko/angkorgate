"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { buildAuthorizationUrl } from "@/lib/angkorgate";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  const startSsoLogin = useCallback(async (redirectTo: string) => {
    setError(null);
    try {
      const authUrl = await buildAuthorizationUrl(redirectTo);
      window.location.replace(authUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start AngkorGate OIDC sign-in."
      );
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get("error");
    const redirectTo = params.get("redirect") || "/dashboard";

    if (callbackError) {
      Promise.resolve().then(() => setError(callbackError));
      return;
    }

    let active = true;
    buildAuthorizationUrl(redirectTo)
      .then((authUrl) => {
        if (active) window.location.replace(authUrl);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start AngkorGate OIDC sign-in."
        );
      });

    return () => {
      active = false;
    };
  }, []);

  if (!error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-400" />
          <span>Redirecting to AngkorGate...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-xl">
        <h1 className="text-xl font-bold text-white">Sign-in Error</h1>
        <p className="mt-2 text-sm text-red-300">{error}</p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              void startSsoLogin(params.get("redirect") || "/dashboard");
            }}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="text-xs text-zinc-400 transition hover:text-zinc-200"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
