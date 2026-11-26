"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AngkorGateError, exchangeCodeForTokens } from "@/lib/angkorgate";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const oidcError = searchParams.get("error");
    const oidcErrorDesc = searchParams.get("error_description");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (oidcError) {
      Promise.resolve().then(() =>
        setError(oidcErrorDesc || `AngkorGate returned error: ${oidcError}`)
      );
      return;
    }

    if (!code) {
      Promise.resolve().then(() =>
        setError("Missing authorization code in callback URL.")
      );
      return;
    }

    exchangeCodeForTokens(code, state)
      .then(({ redirectTo }) => {
        router.replace(redirectTo);
        router.refresh();
      })
      .catch((err) => {
        setError(
          err instanceof AngkorGateError
            ? err.message
            : "Failed to exchange authorization code for tokens."
        );
      });
  }, [router, searchParams]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-xl">
      {error ? (
        <>
          <h1 className="text-xl font-bold text-white">Authentication Failed</h1>
          <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
            {error}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Home
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold text-white">Completing Sign-In...</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Exchanging authorization code with AngkorGate via <code>fetch</code>.
          </p>
        </>
      )}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-sm text-zinc-400">Loading...</div>}>
        <CallbackHandler />
      </Suspense>
    </main>
  );
}
