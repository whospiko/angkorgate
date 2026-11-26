import test, { describe } from "node:test"
import assert from "node:assert/strict"
import {
  TestMailSchema,
  TestSmsSchema,
  UpdateRuntimeConfigSchema,
} from "./runtime-config.schemas"

describe("features/system: RuntimeConfig schemas validation", () => {
  test("UpdateRuntimeConfigSchema accepts mixed string, number, boolean, and null values", () => {
    const res = UpdateRuntimeConfigSchema.safeParse({
      settings: {
        MAIL_PROVIDER: "smtp",
        MAIL_PORT: 587,
        PASSWORDLESS_AUTO_REGISTER: true,
        MAIL_HOST: null,
      },
    })
    assert.strictEqual(res.success, true)
  })

  test("TestMailSchema validates recipient email", () => {
    assert.strictEqual(
      TestMailSchema.safeParse({ to: "admin@angkorgate.local" }).success,
      true
    )
    assert.strictEqual(
      TestMailSchema.safeParse({ to: "bad-email" }).success,
      false
    )
  })

  test("TestSmsSchema validates E.164 phone number", () => {
    assert.strictEqual(
      TestSmsSchema.safeParse({ to: "+85512345678" }).success,
      true
    )
    assert.strictEqual(
      TestSmsSchema.safeParse({ to: "abc" }).success,
      false
    )
  })
})
