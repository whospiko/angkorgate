import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { LoginSchema } from "./auth.schemas"

describe("features/auth: LoginSchema validation", () => {
  test("accepts valid email and password credentials", () => {
    const validInputs = [
      { email: "admin@angkorgate.local", password: "PikoCore@1234" },
      { email: "hengkakada899@gmail.com", password: "SecretPassword99" },
      { email: "user.name+tag@sub.example.com", password: "a" },
    ]

    for (const input of validInputs) {
      const result = LoginSchema.safeParse(input)
      assert.strictEqual(result.success, true, `Expected ${input.email} to be valid`)
      if (result.success) {
        assert.strictEqual(result.data.email, input.email)
        assert.strictEqual(result.data.password, input.password)
      }
    }
  })

  test("rejects empty or whitespace-only email", () => {
    const result = LoginSchema.safeParse({ email: "", password: "password123" })
    assert.strictEqual(result.success, false)
    if (!result.success) {
      const issues = result.error.issues
      assert.ok(issues.some((issue) => issue.path.includes("email")))
    }
  })

  test("rejects malformed email strings", () => {
    const invalidEmails = [
      "not-an-email",
      "missing-at-sign.com",
      "@no-local-part.com",
      "spaces in@email.com",
    ]

    for (const email of invalidEmails) {
      const result = LoginSchema.safeParse({ email, password: "password123" })
      assert.strictEqual(result.success, false, `Expected ${email} to be invalid`)
    }
  })

  test("rejects missing or empty password", () => {
    const resultWithoutPassword = LoginSchema.safeParse({ email: "admin@angkorgate.local" })
    assert.strictEqual(resultWithoutPassword.success, false)
    if (!resultWithoutPassword.success) {
      const issues = resultWithoutPassword.error.issues
      assert.ok(issues.some((issue) => issue.path.includes("password")))
    }

    const resultWithEmptyPassword = LoginSchema.safeParse({
      email: "admin@angkorgate.local",
      password: "",
    })
    assert.strictEqual(resultWithEmptyPassword.success, false)
  })

  test("rejects missing properties entirely", () => {
    const result = LoginSchema.safeParse({})
    assert.strictEqual(result.success, false)
  })
})
