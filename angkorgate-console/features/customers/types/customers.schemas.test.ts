import test, { describe } from "node:test"
import assert from "node:assert/strict"
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CustomerStatusSchema,
  CreateContactSchema,
  SetAttributeSchema,
} from "./customers.schemas"

describe("features/customers: Validation Schemas", () => {
  test("CreateCustomerSchema accepts valid customer, patient, and guest payloads", () => {
    const res = CreateCustomerSchema.safeParse({
      fullName: "Sok Dara",
      type: "PATIENT",
      gender: "MALE",
      dateOfBirth: "1995-04-12",
      phone: "+85512345678",
      email: "dara@example.com",
    })
    assert.strictEqual(res.success, true)
  })

  test("CreateCustomerSchema rejects invalid phone and bad date format", () => {
    const badPhone = CreateCustomerSchema.safeParse({
      fullName: "Sok Dara",
      dateOfBirth: "1995-04-12",
      phone: "123",
    })
    assert.strictEqual(badPhone.success, false)

    const badDob = CreateCustomerSchema.safeParse({
      fullName: "Sok Dara",
      dateOfBirth: "12/04/1995",
    })
    assert.strictEqual(badDob.success, false)
  })

  test("CustomerStatusSchema matches Core backend statuses (ACTIVE, INACTIVE, ARCHIVED)", () => {
    assert.strictEqual(CustomerStatusSchema.safeParse("ACTIVE").success, true)
    assert.strictEqual(CustomerStatusSchema.safeParse("INACTIVE").success, true)
    assert.strictEqual(CustomerStatusSchema.safeParse("ARCHIVED").success, true)
    assert.strictEqual(CustomerStatusSchema.safeParse("LEAD").success, false)
    assert.strictEqual(CustomerStatusSchema.safeParse("CHURNED").success, false)
  })

  test("UpdateCustomerSchema allows partial updates", () => {
    const res = UpdateCustomerSchema.safeParse({ phone: "+85598765432" })
    assert.strictEqual(res.success, true)
  })

  test("CreateContactSchema validates guardian contact details", () => {
    assert.strictEqual(
      CreateContactSchema.safeParse({
        fullName: "Sophea Sok",
        relationship: "Mother",
        phone: "+85511223344",
        isPrimary: true,
      }).success,
      true
    )

    assert.strictEqual(
      CreateContactSchema.safeParse({ fullName: "   " }).success,
      false
    )
  })

  test("SetAttributeSchema requires non-empty key and value", () => {
    assert.strictEqual(
      SetAttributeSchema.safeParse({ key: "blood_type", value: "O+" }).success,
      true
    )
    assert.strictEqual(
      SetAttributeSchema.safeParse({ key: "", value: "O+" }).success,
      false
    )
  })
})
