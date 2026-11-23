import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { CreateAppSchema, UpdateAppSchema } from "./apps.types"

describe("features/apps: Apps Schemas & Redirect URI Simulation", () => {
  describe("CreateAppSchema", () => {
    test("accepts valid confidential client input", () => {
      const valid = {
        appCode: "demo-portal",
        name: "Demo Portal",
        description: "Customer portal application",
        rootUrl: "https://portal.example.com",
        homeUrl: "https://portal.example.com/home",
        validRedirectUris: ["https://portal.example.com/auth/callback"],
        validPostLogoutRedirectUris: ["https://portal.example.com/login"],
        webOrigins: ["https://portal.example.com"],
        standardFlowEnabled: true,
        directAccessGrantsEnabled: false,
        serviceAccountsEnabled: true,
        requirePkce: true,
        isPublicClient: false,
      }
      const parsed = CreateAppSchema.parse(valid)
      assert.strictEqual(parsed.appCode, "demo-portal")
      assert.strictEqual(parsed.isPublicClient, false)
      assert.strictEqual(parsed.requirePkce, true)
    })

    test("accepts public SPA client input", () => {
      const publicSpa = {
        appCode: "mobile-spa",
        name: "Mobile SPA Client",
        validRedirectUris: ["http://localhost:5173/callback"],
        isPublicClient: true,
        requirePkce: true,
      }
      const parsed = CreateAppSchema.parse(publicSpa)
      assert.strictEqual(parsed.isPublicClient, true)
      assert.strictEqual(parsed.requirePkce, true)
    })

    test("rejects invalid appCode with spaces or uppercase", () => {
      assert.throws(() => {
        CreateAppSchema.parse({
          appCode: "Demo App",
          name: "Demo",
        })
      })
      assert.throws(() => {
        CreateAppSchema.parse({
          appCode: "DEMO_APP",
          name: "Demo",
        })
      })
    })

    test("rejects invalid rootUrl format", () => {
      assert.throws(() => {
        CreateAppSchema.parse({
          appCode: "test-app",
          name: "Test App",
          rootUrl: "not-a-valid-url",
        })
      })
    })
  })

  describe("UpdateAppSchema", () => {
    test("accepts partial update payload", () => {
      const update = {
        name: "Updated App Name",
        description: "New updated description",
        standardFlowEnabled: false,
      }
      const parsed = UpdateAppSchema.parse(update)
      assert.strictEqual(parsed.name, "Updated App Name")
      assert.strictEqual(parsed.standardFlowEnabled, false)
    })

    test("allows empty object for partial update with defaults", () => {
      const parsed = UpdateAppSchema.parse({})
      assert.ok(parsed)
      assert.strictEqual(typeof parsed, "object")
    })
  })

  describe("Redirect URI Matcher Simulator Logic", () => {
    function matchesRedirectUri(patterns: string[], testUrl: string): { match: boolean; pattern?: string } {
      const matched = patterns.find((pattern) => {
        if (pattern === testUrl) return true
        if (pattern.endsWith("/*")) {
          const prefix = pattern.slice(0, -2)
          return testUrl.startsWith(prefix)
        }
        return false
      })
      return { match: Boolean(matched), pattern: matched }
    }

    test("validates exact callback match", () => {
      const patterns = ["https://app.example.com/callback", "https://app.example.com/renew"]
      const result = matchesRedirectUri(patterns, "https://app.example.com/callback")
      assert.strictEqual(result.match, true)
      assert.strictEqual(result.pattern, "https://app.example.com/callback")
    })

    test("validates wildcard pattern match", () => {
      const patterns = ["https://app.example.com/*"]
      const result = matchesRedirectUri(patterns, "https://app.example.com/auth/callback")
      assert.strictEqual(result.match, true)
      assert.strictEqual(result.pattern, "https://app.example.com/*")
    })

    test("rejects disallowed origins or paths", () => {
      const patterns = ["https://app.example.com/callback"]
      const result = matchesRedirectUri(patterns, "https://malicious-site.com/callback")
      assert.strictEqual(result.match, false)
      assert.strictEqual(result.pattern, undefined)
    })
  })
})
