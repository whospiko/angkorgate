import test, { describe } from "node:test"
import assert from "node:assert/strict"
import {
  EmploymentStatusSchema,
  CreateDepartmentSchema,
  CreateJobTitleSchema,
  CreateEmployeeSchema,
  AssignPositionSchema,
  CreateScheduleSchema,
} from "./employees.schemas"

describe("features/employees: Validation Schemas", () => {
  test("EmploymentStatusSchema matches Core backend statuses", () => {
    assert.strictEqual(EmploymentStatusSchema.safeParse("ACTIVE").success, true)
    assert.strictEqual(EmploymentStatusSchema.safeParse("ON_LEAVE").success, true)
    assert.strictEqual(EmploymentStatusSchema.safeParse("RESIGNED").success, true)
    assert.strictEqual(EmploymentStatusSchema.safeParse("TERMINATED").success, true)
    assert.strictEqual(EmploymentStatusSchema.safeParse("PROBATION").success, false)
    assert.strictEqual(EmploymentStatusSchema.safeParse("SUSPENDED").success, false)
  })

  test("CreateDepartmentSchema and CreateJobTitleSchema enforce UPPER_SNAKE_CASE code", () => {
    const dept = CreateDepartmentSchema.safeParse({
      code: "oral_surgery",
      name: "Oral Surgery",
    })
    assert.strictEqual(dept.success, true)
    if (dept.success) {
      assert.strictEqual(dept.data.code, "ORAL_SURGERY")
    }

    assert.strictEqual(
      CreateJobTitleSchema.safeParse({ code: "1INVALID", name: "Bad" }).success,
      false
    )
  })

  test("CreateEmployeeSchema allows auto-generated employeeCode and optional user provisioning", () => {
    const unlinked = CreateEmployeeSchema.safeParse({
      fullName: "Dr. Sokha",
      hireDate: "2026-01-15",
    })
    assert.strictEqual(unlinked.success, true)

    const provisioned = CreateEmployeeSchema.safeParse({
      employeeCode: "EMP-009",
      fullName: "Nurse Lina",
      provisionUser: {
        email: "lina@clinic.local",
        password: "TempPassword1!",
        roles: ["ASSISTANT"],
      },
    })
    assert.strictEqual(provisioned.success, true)
  })

  test("AssignPositionSchema rejects startDate after endDate", () => {
    const bad = AssignPositionSchema.safeParse({
      jobTitleCode: "DOCTOR",
      departmentCode: "ORTHO",
      startDate: "2026-06-01",
      endDate: "2026-01-01",
    })
    assert.strictEqual(bad.success, false)
  })

  test("CreateScheduleSchema validates isActive and rejects startTime >= endTime", () => {
    const valid = CreateScheduleSchema.safeParse({
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "17:00",
      isActive: true,
    })
    assert.strictEqual(valid.success, true)

    const invalid = CreateScheduleSchema.safeParse({
      dayOfWeek: 1,
      startTime: "17:00",
      endTime: "08:00",
      isActive: true,
    })
    assert.strictEqual(invalid.success, false)
  })
})
