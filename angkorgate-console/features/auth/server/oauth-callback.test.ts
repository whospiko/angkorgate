import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"
import { GET } from "@/app/auth/callback/route"
import { apiClient } from "@/lib/api-client"

describe("app/auth/callback/route: OAuth Ticket Callback Handler", () => {
  test("redirects to error if ticket is missing", async () => {
    const req = new NextRequest("http://localhost:4000/auth/callback")
    const res = await GET(req)
    assert.strictEqual(res.status, 307)
    assert.ok(res.headers.get("location")?.includes("/login?error=missing_ticket"))
  })

  test("handles ticket redemption, sets cookies, and redirects admin to /dashboard", async () => {
    const origPost = apiClient.post
    const origGet = apiClient.get

    try {
      // Mock ticket redemption
      apiClient.post = (async (path: string) => {
        if (path === "/auth/oauth/ticket") {
          return {
            accessToken: "mock.jwt.token",
            refreshToken: "mock-refresh-token",
            userId: "test-user-id",
            provider: "google",
          }
        }
        throw new Error(`Unexpected POST: ${path}`)
      }) as any

      // Mock user profile fetch
      apiClient.get = (async (path: string) => {
        if (path === "/auth/me") {
          return {
            id: "test-user-id",
            email: "admin@example.com",
            phone: null,
            roles: ["ADMIN"],
            mustChangePassword: false,
          }
        }
        if (path === "/system/branding") {
          return {
            appName: "AngkorGate",
            allowedDashboardRoles: ["ADMIN"],
          }
        }
        throw new Error(`Unexpected GET: ${path}`)
      }) as any

      const req = new NextRequest("http://localhost:4000/auth/callback?ticket=test-ticket&redirect=%2Fdashboard")
      const res = await GET(req)

      assert.strictEqual(res.status, 307)
      assert.ok(res.headers.get("location")?.includes("/dashboard"))

      // Verify cookies are set directly on the redirect response
      const setCookies = res.headers.getSetCookie()
      assert.ok(setCookies.some((c) => c.includes("angkorgate_token=mock.jwt.token")))
      assert.ok(setCookies.some((c) => c.includes("angkorgate_refresh_token=mock-refresh-token")))
      assert.ok(setCookies.some((c) => c.includes("angkorgate_user=")))
    } finally {
      apiClient.post = origPost
      apiClient.get = origGet
    }
  })

  test("redirects to unauthorized if user lacks dashboard role", async () => {
    const origPost = apiClient.post
    const origGet = apiClient.get

    try {
      apiClient.post = (async (path: string) => {
        if (path === "/auth/oauth/ticket") {
          return {
            accessToken: "mock.jwt.token",
            refreshToken: "mock-refresh-token",
            userId: "customer-user-id",
            provider: "google",
          }
        }
        throw new Error(`Unexpected POST: ${path}`)
      }) as any

      apiClient.get = (async (path: string) => {
        if (path === "/auth/me") {
          return {
            id: "customer-user-id",
            email: "user@example.com",
            phone: null,
            roles: ["CUSTOMER"],
            mustChangePassword: false,
          }
        }
        if (path === "/system/branding") {
          return {
            appName: "AngkorGate",
            allowedDashboardRoles: ["ADMIN"],
          }
        }
        throw new Error(`Unexpected GET: ${path}`)
      }) as any

      const req = new NextRequest("http://localhost:4000/auth/callback?ticket=test-ticket&redirect=%2Fdashboard")
      const res = await GET(req)

      assert.strictEqual(res.status, 307)
      assert.ok(res.headers.get("location")?.includes("/login?unauthorized=1"))

      // Verify NO auth token cookie is set
      const setCookies = res.headers.getSetCookie()
      assert.ok(!setCookies.some((c) => c.includes("angkorgate_token=")))
    } finally {
      apiClient.post = origPost
      apiClient.get = origGet
    }
  })
})
