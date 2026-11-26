import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  CreateOAuthProviderSchema,
  UpdateOAuthProviderSchema,
  UpdateOAuthSettingsSchema,
  OAUTH_PROVIDER_CODES,
} from "./oauth-providers.types"

describe("features/oauth-providers: Validation Schemas", () => {
  it("supports google, github, discord, microsoft, telegram, and apple", () => {
    for (const code of ["google", "github", "discord", "microsoft", "telegram", "apple"]) {
      assert.ok((OAUTH_PROVIDER_CODES as readonly string[]).includes(code))
    }
  })

  it("validates Microsoft Entra ID provider with tenantId extraConfig", () => {
    const parsed = CreateOAuthProviderSchema.safeParse({
      code: "microsoft",
      name: "Microsoft Entra ID",
      clientId: "00000000-0000-0000-0000-000000000001",
      clientSecret: "ms-secret",
      scopes: "openid profile email User.Read",
      isActive: true,
      extraConfig: { tenantId: "organizations" },
    })
    assert.equal(parsed.success, true)
  })

  it("rejects unsupported provider codes and whitespace in clientId", () => {
    const badCode = CreateOAuthProviderSchema.safeParse({
      code: "myspace",
      name: "MySpace",
      clientId: "123",
    })
    assert.equal(badCode.success, false)

    const badClientId = CreateOAuthProviderSchema.safeParse({
      code: "github",
      name: "GitHub",
      clientId: "bad client id",
    })
    assert.equal(badClientId.success, false)
  })

  it("validates partial update payloads", () => {
    const parsed = UpdateOAuthProviderSchema.safeParse({
      name: "GitHub Enterprise",
      isActive: false,
    })
    assert.equal(parsed.success, true)
  })

  it("validates global OAuth settings payload", () => {
    const valid = UpdateOAuthSettingsSchema.safeParse({
      oauthEnabled: true,
      callbackBaseUrl: "https://auth.example.com",
      webUrl: "https://console.example.com",
    })
    assert.equal(valid.success, true)

    const invalidWebUrl = UpdateOAuthSettingsSchema.safeParse({
      webUrl: "not-a-url",
    })
    assert.equal(invalidWebUrl.success, false)
  })
})
