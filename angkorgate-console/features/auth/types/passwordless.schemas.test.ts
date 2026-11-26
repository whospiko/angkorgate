import test, { describe } from "node:test"
import assert from "node:assert/strict"
import {
  MagicLinkRequestSchema,
  OtpRequestSchema,
  OtpVerifySchema,
} from "./passwordless.schemas"

describe("features/auth: Passwordless schemas validation", () => {
  test("MagicLinkRequestSchema validates email and optional redirectUrl", () => {
    const ok = MagicLinkRequestSchema.safeParse({
      email: "user@angkorgate.local",
      redirectUrl: "/account",
    })
    assert.strictEqual(ok.success, true)

    const bad = MagicLinkRequestSchema.safeParse({ email: "not-an-email" })
    assert.strictEqual(bad.success, false)
  })

  test("OtpRequestSchema requires email for email channel and E.164 phone for sms channel", () => {
    assert.strictEqual(
      OtpRequestSchema.safeParse({ channel: "email", email: "a@b.com" }).success,
      true
    )
    assert.strictEqual(
      OtpRequestSchema.safeParse({ channel: "email", email: "bad" }).success,
      false
    )
    assert.strictEqual(
      OtpRequestSchema.safeParse({ channel: "sms", phone: "+85512345678" }).success,
      true
    )
    assert.strictEqual(
      OtpRequestSchema.safeParse({ channel: "sms", phone: "123" }).success,
      false
    )
  })

  test("OtpVerifySchema enforces 6-digit numeric code", () => {
    assert.strictEqual(
      OtpVerifySchema.safeParse({
        channel: "email",
        email: "a@b.com",
        code: "482910",
      }).success,
      true
    )
    assert.strictEqual(
      OtpVerifySchema.safeParse({
        channel: "email",
        email: "a@b.com",
        code: "12345",
      }).success,
      false
    )
    assert.strictEqual(
      OtpVerifySchema.safeParse({
        channel: "sms",
        phone: "+85512345678",
        code: "abcdef",
      }).success,
      false
    )
  })
})
