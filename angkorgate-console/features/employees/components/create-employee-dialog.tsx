"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiUserAddLine, RiLoader4Line } from "@remixicon/react"
import { createEmployeeAction } from "../server/employees-actions"
import { CreateEmployeeSchema } from "../types/employees.schemas"
import type { Employee, EmployeeGender, EmploymentType } from "../types/employees.types"

type AccountMode = "none" | "existing" | "new"

export function CreateEmployeeDialog({ employees = [] }: { employees?: Employee[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [employeeCode, setEmployeeCode] = useState("")
  const [fullName, setFullName] = useState("")
  const [gender, setGender] = useState<EmployeeGender>("FEMALE")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [phone, setPhone] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [address, setAddress] = useState("")
  const [hireDate, setHireDate] = useState(new Date().toISOString().split("T")[0])
  const [employmentType, setEmploymentType] = useState<EmploymentType>("FULL_TIME")
  const [managerId, setManagerId] = useState("")

  const [accountMode, setAccountMode] = useState<AccountMode>("none")
  const [existingUserId, setExistingUserId] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserRole, setNewUserRole] = useState("ASSISTANT")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const payload = {
      employeeCode: employeeCode.trim() ? employeeCode.trim().toUpperCase() : undefined,
      fullName: fullName.trim(),
      gender,
      dateOfBirth: dateOfBirth || undefined,
      phone: phone.trim() || undefined,
      nationalId: nationalId.trim() || undefined,
      address: address.trim() || undefined,
      hireDate: hireDate || undefined,
      employmentType,
      managerId: managerId || null,
      userId: accountMode === "existing" ? existingUserId.trim() : undefined,
      provisionUser:
        accountMode === "new"
          ? {
              email: newUserEmail.trim(),
              password: newUserPassword,
              roles: [newUserRole],
            }
          : undefined,
    }

    const parsed = CreateEmployeeSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please check the form inputs")
      return
    }

    setLoading(true)
    const res = await createEmployeeAction(payload)
    setLoading(false)

    if (res.success) {
      setOpen(false)
      setEmployeeCode("")
      setFullName("")
      setDateOfBirth("")
      setPhone("")
      setNationalId("")
      setAddress("")
      setAccountMode("none")
      setExistingUserId("")
      setNewUserEmail("")
      setNewUserPassword("")
    } else {
      setError(res.message || "Failed to create employee profile")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="font-mono">
            <RiUserAddLine className="mr-1.5 size-4" /> Add Employee
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Register New Employee</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Provision a staff member profile in AngkorGate Organization & Staff.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-3.5 py-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="emp-code">Employee Code</Label>
                <Input
                  id="emp-code"
                  placeholder="Auto (EMP-0001)"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="emp-gender">Gender</Label>
                <select
                  id="emp-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as EmployeeGender)}
                  className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="emp-name">Full Legal / Display Name *</Label>
              <Input
                id="emp-name"
                placeholder="e.g. Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="emp-account-mode">Login Account Linking</Label>
              <select
                id="emp-account-mode"
                value={accountMode}
                onChange={(e) => setAccountMode(e.target.value as AccountMode)}
                className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
              >
                <option value="none">No login account (link later)</option>
                <option value="existing">Link existing user UUID</option>
                <option value="new">Provision new user account</option>
              </select>
            </div>

            {accountMode === "existing" && (
              <div className="grid gap-1.5">
                <Label htmlFor="emp-user-id">Existing User UUID *</Label>
                <Input
                  id="emp-user-id"
                  placeholder="123e4567-e89b-12d3-a456-426614174000"
                  value={existingUserId}
                  onChange={(e) => setExistingUserId(e.target.value)}
                  required
                />
              </div>
            )}

            {accountMode === "new" && (
              <div className="space-y-2.5 p-2.5 rounded-md border border-border/60 bg-muted/20">
                <div className="grid gap-1.5">
                  <Label htmlFor="emp-email">Login Email *</Label>
                  <Input
                    id="emp-email"
                    type="email"
                    placeholder="staff@angkorgate.local"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="emp-pass">Temporary Password *</Label>
                    <Input
                      id="emp-pass"
                      type="password"
                      placeholder="Min 8 chars"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="emp-role">RBAC Role</Label>
                    <select
                      id="emp-role"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2.5 py-1.5 text-xs font-mono text-foreground outline-none"
                    >
                      <option value="ASSISTANT">ASSISTANT</option>
                      <option value="DOCTOR">DOCTOR</option>
                      <option value="RECEPTIONIST">RECEPTIONIST</option>
                      <option value="ACCOUNTANT">ACCOUNTANT</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  User will be required to change their temporary password on first login.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="emp-dob">Date of Birth</Label>
                <Input
                  id="emp-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="emp-hire">Hire Date</Label>
                <Input
                  id="emp-hire"
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="emp-phone">Phone</Label>
                <Input
                  id="emp-phone"
                  placeholder="+85512345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="emp-nid">National ID / Passport</Label>
                <Input
                  id="emp-nid"
                  placeholder="NID987654"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="emp-type">Contract Type</Label>
                <select
                  id="emp-type"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground outline-none"
                >
                  <option value="FULL_TIME">FULL_TIME</option>
                  <option value="PART_TIME">PART_TIME</option>
                  <option value="CONTRACTOR">CONTRACTOR</option>
                  <option value="INTERN">INTERN</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="emp-manager">Reports To (Manager)</Label>
                <select
                  id="emp-manager"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground outline-none"
                >
                  <option value="">None (Top-level)</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="emp-addr">Residential Address</Label>
              <Input
                id="emp-addr"
                placeholder="Street address, City, Country"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="font-mono text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="font-mono text-xs">
              {loading ? (
                <>
                  <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register Employee"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
