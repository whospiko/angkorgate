"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AngkorGateError,
  loginWithEmail,
  registerCustomer,
} from "@/lib/angkorgate";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("1998-01-01");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await registerCustomer({
        fullName: fullName.trim(),
        email: email.trim(),
        dateOfBirth,
        password,
      });

      const loginRes = await loginWithEmail({
        email: email.trim(),
        password,
      });

      if ("mfaRequired" in loginRes && loginRes.mfaRequired) {
        router.replace("/login");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof AngkorGateError) {
        setError(err.message);
      } else {
        setError("Unable to register right now. Is AngkorGate Core running?");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
        <div className="mb-6">
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200">
            ← Back to home
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-white">Create an account</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Registers a customer account via <code>POST /auth/register</code>.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-xs font-medium text-zinc-300">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sokha Dara"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>

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
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="dob" className="block text-xs font-medium text-zinc-300">
              Date of Birth
            </label>
            <input
              id="dob"
              type="date"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Str0ngPass!2026"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Min 8 chars, uppercase, lowercase, digit, and special character.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
