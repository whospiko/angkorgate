export async function completeOidcInteractionWithToken(
  interactionUid: string,
  accessToken: string
): Promise<string> {
  const coreUrl = (
    process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:8080"
  ).replace(/\/+$/, "")

  const res = await fetch(
    `${coreUrl}/oidc/interaction/${encodeURIComponent(interactionUid)}/token-login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    }
  )

  const data = (await res.json().catch(() => ({}))) as {
    redirectTo?: string
    message?: string
    error?: string
  }

  if (!res.ok) {
    throw new Error(
      data.message || data.error || "Failed to complete OIDC interaction."
    )
  }

  if (data.redirectTo) {
    return data.redirectTo.startsWith("http")
      ? data.redirectTo
      : `${coreUrl}${data.redirectTo}`
  }

  return `${coreUrl}/oidc/auth/${interactionUid}`
}
