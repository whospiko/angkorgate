import Link from "next/link";
import { ANGKORGATE_URL } from "@/lib/angkorgate";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
          Next.js + TypeScript • Pure Fetch • No Backend
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">
          AngkorGate Auth Example
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          This minimal Next.js App Router project authenticates directly against{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            {ANGKORGATE_URL}
          </code>{" "}
          using native <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">fetch</code>{" "}
          and protects{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">/dashboard</code>{" "}
          with Next.js middleware + live token verification.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Open Protected /dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
          >
            Create Account
          </Link>
        </div>

        <div className="mt-8 grid gap-3 border-t border-zinc-800 pt-6 text-xs text-zinc-400 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-zinc-200">1. Route Guard</p>
            <p className="mt-1">
              <code>src/middleware.ts</code> blocks unauthenticated access to{" "}
              <code>/dashboard</code>.
            </p>
          </div>
          <div>
            <p className="font-semibold text-zinc-200">2. Direct Fetch</p>
            <p className="mt-1">
              Calls <code>/auth/login</code>, <code>/auth/me</code>,{" "}
              <code>/auth/refresh</code>, and <code>/auth/logout</code>.
            </p>
          </div>
          <div>
            <p className="font-semibold text-zinc-200">3. Auto Refresh</p>
            <p className="mt-1">
              Expired access tokens automatically rotate via{" "}
              <code>/auth/refresh</code>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
