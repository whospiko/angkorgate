import Link from "next/link";
import { ANGKORGATE_URL, OIDC_CLIENT_ID } from "@/lib/angkorgate";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
          Next.js + TypeScript • OIDC / SSO • Pure Fetch • No Backend
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">
          AngkorGate OIDC / SSO Example
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Clicking <strong>Sign In with AngkorGate</strong> or visiting{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            /login
          </code>{" "}
          redirects you to AngkorGate&apos;s OIDC Authorization endpoint (
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            {ANGKORGATE_URL}/oidc/auth
          </code>
          ) using client{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            {OIDC_CLIENT_ID}
          </code>{" "}
          with PKCE, then exchanges the code via native{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            fetch
          </code>{" "}
          at{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            /callback
          </code>
          .
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
            Sign In with AngkorGate
          </Link>
        </div>

        <div className="mt-8 grid gap-3 border-t border-zinc-800 pt-6 text-xs text-zinc-400 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-zinc-200">1. SSO Redirect (/login)</p>
            <p className="mt-1">
              Generates PKCE <code>code_challenge</code> and routes to{" "}
              <code>/oidc/auth</code>.
            </p>
          </div>
          <div>
            <p className="font-semibold text-zinc-200">2. Token Exchange (/callback)</p>
            <p className="mt-1">
              Exchanges <code>code</code> + <code>code_verifier</code> via{" "}
              <code>POST /oidc/token</code>.
            </p>
          </div>
          <div>
            <p className="font-semibold text-zinc-200">3. Protected /dashboard</p>
            <p className="mt-1">
              Guarded by <code>src/middleware.ts</code> and verified via{" "}
              <code>GET /oidc/me</code>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
