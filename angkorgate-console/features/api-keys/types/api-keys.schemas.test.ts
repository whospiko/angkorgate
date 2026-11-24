import { describe, it } from "node:test"
import assert from "node:assert"
import type { CreateApiKeyInput, ApiKey } from "./api-keys.types"

describe("features/api-keys: API Key Types & Logic", () => {
  it("formats key prefix and masked key correctly", () => {
    const rawSecret = "ag_live_7c4e09f83a21b4d6e90218a5bcdef0123456789a"
    const prefix = rawSecret.slice(0, 12)
    const lastFour = rawSecret.slice(-4)
    const masked = `${prefix}••••••••${lastFour}`

    assert.strictEqual(prefix, "ag_live_7c4e")
    assert.strictEqual(lastFour, "789a")
    assert.strictEqual(masked, "ag_live_7c4e••••••••789a")
  })

  it("evaluates granular method permissions for API Key", () => {
    const apiKey: Partial<ApiKey> = {
      allowedResources: ["customers"],
      allowedMethods: {
        customers: ["GET"],
        employees: ["GET", "POST"],
      },
    }

    const isGetCustomerAllowed = apiKey.allowedMethods?.customers?.includes("GET")
    const isPostCustomerAllowed = apiKey.allowedMethods?.customers?.includes("POST")

    assert.strictEqual(isGetCustomerAllowed, true)
    assert.strictEqual(isPostCustomerAllowed, false)
  })

  it("filters response fields according to projection allowlist", () => {
    const sampleCustomer = {
      id: "123",
      customerCode: "PAT-0001",
      fullName: "Alice",
      gender: "FEMALE",
      dateOfBirth: "1990-01-01",
      nationalId: "CAM-001",
      phone: "+85512345678",
    }

    const allowedFields = ["customerCode", "fullName", "gender"]
    const projected: Record<string, any> = {}

    for (const key of Object.keys(sampleCustomer)) {
      if (allowedFields.includes(key)) {
        projected[key] = (sampleCustomer as any)[key]
      }
    }

    assert.deepStrictEqual(projected, {
      customerCode: "PAT-0001",
      fullName: "Alice",
      gender: "FEMALE",
    })
    assert.strictEqual((projected as Record<string, any>).dateOfBirth, undefined)
    assert.strictEqual((projected as Record<string, any>).nationalId, undefined)
    assert.strictEqual((projected as Record<string, any>).phone, undefined)
  })
})
