"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAngkorGate } from "@angkorgate/nextjs";

export default function LoginPage() {
  const { signIn, error } = useAngkorGate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirect") || "/dashboard";
    if (!params.get("error")) {
      void signIn(redirectTo);
    }
  }, [signIn]);

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
            onClick={() => void signIn("/dashboard")}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Try Again
          </button>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
