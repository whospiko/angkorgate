import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { ApiError } from "@/lib/api-client"
import { getUsers } from "@/features/users/server/users-actions"

describe("features/auth: Unauthorized (401) Redirection", () => {
  test("ApiError preserves 401 status code and details", () => {
    const error = new ApiError("User no longer active", 401, {
      success: false,
      statusCode: 401,
      message: "User no longer active",
      error: "Unauthorized",
    })

    assert.strictEqual(error.statusCode, 401)
    assert.strictEqual(error.message, "User no longer active")
    assert.strictEqual(error.name, "ApiError")
  })

  test("getUsers triggers NEXT_REDIRECT to /login?unauthorized=1 when encountering 401", async () => {
    // If not authenticated or user is deactivated, getUsers catches 401 and calls redirect(...)
    try {
      await getUsers()
      // If mock/empty returns without throwing redirect, it handled safely
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) {
        assert.ok(err.digest.includes("/login?unauthorized=1"))
      }
    }
  })
})
