import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { InitialSetupSchema, UpdateBrandingSchema } from "./branding.schemas"

describe("InitialSetupSchema validation", () => {
  it("validates valid initial setup data", () => {
    const validData = {
      adminEmail: "admin@angkorgate.local",
      adminPassword: "Password123!",
      confirmPassword: "Password123!",
      adminName: "Super Admin",
      appName: "AngkorGate Custom",
      logoUrl: "https://example.com/logo.png",
      organizationName: "OpenSource Team",
    }

    const result = InitialSetupSchema.safeParse(validData)
    assert.equal(result.success, true)
    if (result.success) {
      assert.equal(result.data.appName, "AngkorGate Custom")
      assert.equal(result.data.adminEmail, "admin@angkorgate.local")
    }
  })

  it("fails when password and confirmPassword do not match", () => {
    const invalidData = {
      adminEmail: "admin@angkorgate.local",
      adminPassword: "Password123!",
      confirmPassword: "DifferentPassword456!",
      appName: "AngkorGate",
    }

    const result = InitialSetupSchema.safeParse(invalidData)
    assert.equal(result.success, false)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      assert.ok(fieldErrors.confirmPassword)
      assert.match(fieldErrors.confirmPassword[0], /Passwords do not match/)
    }
  })

  it("fails when password is too short", () => {
    const shortPassword = {
      adminEmail: "admin@angkorgate.local",
      adminPassword: "short",
      confirmPassword: "short",
      appName: "AngkorGate",
    }

    const result = InitialSetupSchema.safeParse(shortPassword)
    assert.equal(result.success, false)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      assert.ok(fieldErrors.adminPassword)
    }
  })

  it("fails when appName is empty or too short", () => {
    const shortApp = {
      adminEmail: "admin@angkorgate.local",
      adminPassword: "Password123!",
      confirmPassword: "Password123!",
      appName: "A",
    }

    const result = InitialSetupSchema.safeParse(shortApp)
    assert.equal(result.success, false)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      assert.ok(fieldErrors.appName)
    }
  })
})

describe("UpdateBrandingSchema validation", () => {
  it("validates valid branding update", () => {
    const result = UpdateBrandingSchema.safeParse({
      appName: "Acme Identity",
      appDescription: "Fast IAM Gateway",
      logoUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      supportEmail: "support@acme.com",
    })

    assert.equal(result.success, true)
  })

  it("accepts empty optional email", () => {
    const result = UpdateBrandingSchema.safeParse({
      appName: "Acme Identity",
      supportEmail: "",
    })

    assert.equal(result.success, true)
  })

  it("rejects invalid support email format", () => {
    const result = UpdateBrandingSchema.safeParse({
      appName: "Acme Identity",
      supportEmail: "not-an-email",
    })

    assert.equal(result.success, false)
  })
})
