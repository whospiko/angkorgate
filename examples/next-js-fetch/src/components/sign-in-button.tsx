"use client";

import { useState } from "react";
import { buildAuthorizationUrl } from "@/lib/angkorgate";

export function SignInButton({
  redirectTo = "/dashboard",
  className = "",
  label = "Sign In with AngkorGate",
}: {
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      const authUrl = await buildAuthorizationUrl(redirectTo);
      window.location.replace(authUrl);
    } catch {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={pending}
      className={className}
    >
      {pending ? "Redirecting..." : label}
    </button>
  );
}
