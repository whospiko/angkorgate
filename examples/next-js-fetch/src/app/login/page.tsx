"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AngkorGateError,
  completeMfaLogin,
  loginWithEmail,
} from "@/lib/angkorgate";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLoginSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginWithEmail({ email: email.trim(), password });
      if ("mfaRequired" in res && res.mfaRequired) {
        setMfaToken(res.mfaToken);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      if (err instanceof AngkorGateError) {
        setError(err.message);
      } else {
        setError("Unable to reach AngkorGate Core. Is it running?");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setLoading(true);

    try {
      await completeMfaLogin(mfaToken, mfaCode.trim());
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      if (err instanceof AngkorGateError) {
        setError(err.message);
      } else {
        setError("MFA verification failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
      <div className="mb-6">
        <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200">
          ← Back to home
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-white">
          {mfaToken ? "Two-Factor Verification" : "Sign in to AngkorGate"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {mfaToken
            ? "Enter the 6-digit authenticator code or backup code."
            : "Authenticate with your AngkorGate account to access /dashboard."}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      {!mfaToken ? (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="piko@angkorgate.com"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-zinc-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMfaSubmit} className="space-y-4">
          <div>
            <label htmlFor="mfaCode" className="block text-xs font-medium text-zinc-300">
              Verification Code
            </label>
            <input
              id="mfaCode"
              type="text"
              required
              inputMode="numeric"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="123456"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMfaToken(null);
              setMfaCode("");
              setError(null);
            }}
            className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Back to email & password
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-indigo-400 hover:text-indigo-300">
          Register
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-sm text-zinc-400">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
