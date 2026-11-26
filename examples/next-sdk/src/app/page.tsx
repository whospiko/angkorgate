"use client";

import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@angkorgate/nextjs";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
          Next.js + @angkorgate/nextjs SDK + better-sqlite3
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">
          AngkorGate Next.js SDK Example
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Zero raw OAuth/OIDC boilerplate. Powered by{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            &lt;AngkorGateProvider&gt;
          </code>
          ,{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            angkorgateMiddleware
          </code>
          ,{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            &lt;Protect&gt;
          </code>
          , and{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
            verifyAngkorGateRequest
          </code>
          .
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Open Protected /dashboard
          </Link>

          <SignedOut>
            <SignInButton
              redirectTo="/dashboard"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
            />
          </SignedOut>

          <SignedIn>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </div>
    </main>
  );
}
