export interface ApiResponse<T> {
  success?: boolean
  statusCode?: number
  message?: string
  data?: T
  meta?: {
    timestamp?: string
    path?: string
    requestId?: string
    durationMs?: number
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const CORE_API_BASE =
  process.env.CORE_API_URL ||
  process.env.NEXT_PUBLIC_CORE_API_URL ||
  "http://localhost:8080"

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const url = `${CORE_API_BASE}${path.startsWith("/") ? path : `/${path}`}`

  const headers = new Headers(options.headers || {})
  headers.set("Content-Type", "application/json")
  headers.set("Accept", "application/json")

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`)
  } else if (typeof window !== "undefined") {
    const storedToken =
      localStorage.getItem("angkorgate_token") ||
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("angkorgate_token="))
        ?.split("=")[1]
    if (storedToken) {
      headers.set("Authorization", `Bearer ${storedToken}`)
    }
  } else {
    try {
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      const token = cookieStore.get("angkorgate_token")?.value
      if (token) {
        headers.set("Authorization", `Bearer ${token}`)
      }
    } catch {
      // Build-time or non-request context
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  })

  let json: unknown = null
  try {
    const text = await res.text()
    if (text) {
      json = JSON.parse(text)
    }
  } catch {
    json = null
  }

  if (!res.ok) {
    const errorMsg =
      (json as { message?: string; error?: string })?.message ||
      (json as { error?: string })?.error ||
      `API request failed with status ${res.status}`
    throw new ApiError(errorMsg, res.status, json)
  }

  const envelope = json as ApiResponse<T>
  if (
    envelope &&
    typeof envelope === "object" &&
    "data" in envelope &&
    envelope.data !== undefined
  ) {
    return envelope.data
  }

  return json as T
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit & { token?: string }) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestInit & { token?: string }) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit & { token?: string }) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit & { token?: string }) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestInit & { token?: string }) =>
    request<T>(path, { ...options, method: "DELETE" }),
}
