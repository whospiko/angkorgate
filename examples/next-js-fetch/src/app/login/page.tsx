"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ANGKORGATE_URL, buildAuthorizationUrl } from "@/lib/angkorgate";

function LoginRedirect() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const callbackError = searchParams.get("error");
  const [error, setError] = useState<string | null>(callbackError);

  const startSsoLogin = useCallback(async () => {
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
  }, [redirectTo]);

  useEffect(() => {
    if (callbackError) return;
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
  }, [callbackError, redirectTo]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-xl">
      <h1 className="text-xl font-bold text-white">
        {error ? "Sign-in Error" : "Redirecting to AngkorGate SSO..."}
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        {error
          ? error
          : `Routing you to ${ANGKORGATE_URL}/oidc/auth to sign in.`}
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void startSsoLogin()}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Continue to AngkorGate Login
        </button>
        <Link
          href="/"
          className="text-xs text-zinc-400 transition hover:text-zinc-200"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-sm text-zinc-400">Loading...</div>}>
        <LoginRedirect />
      </Suspense>
    </main>
  );
}
