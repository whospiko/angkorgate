import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { DEFAULT_LOGO_URL, resolveLogoUrl } from "./brand-logo"

describe("resolveLogoUrl", () => {
  it("falls back to /logo.jpeg when logoUrl is null, undefined, or empty", () => {
    assert.equal(DEFAULT_LOGO_URL, "/logo.jpeg")
    assert.equal(resolveLogoUrl(null), "/logo.jpeg")
    assert.equal(resolveLogoUrl(undefined), "/logo.jpeg")
    assert.equal(resolveLogoUrl(""), "/logo.jpeg")
    assert.equal(resolveLogoUrl("   "), "/logo.jpeg")
  })

  it("returns the CMS-configured logoUrl when provided", () => {
    assert.equal(
      resolveLogoUrl("https://cdn.example.com/custom-logo.png"),
      "https://cdn.example.com/custom-logo.png"
    )
    assert.equal(
      resolveLogoUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="),
      "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="
    )
  })
})
