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
import type { EmployeeGender } from "../types/employees.types"

export function CreateEmployeeDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [employeeCode, setEmployeeCode] = useState("")
  const [fullName, setFullName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [gender, setGender] = useState<EmployeeGender>("FEMALE")
  const [dateOfBirth, setDateOfBirth] = useState("1994-01-01")
  const [phone, setPhone] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [address, setAddress] = useState("")
  const [hireDate, setHireDate] = useState(new Date().toISOString().split("T")[0])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await createEmployeeAction({
      employeeCode: employeeCode.trim().toUpperCase(),
      fullName: fullName.trim(),
      userEmail: userEmail.trim() || undefined,
      gender,
      dateOfBirth: dateOfBirth || undefined,
      phone: phone.trim() || undefined,
      nationalId: nationalId.trim() || undefined,
      address: address.trim() || undefined,
      hireDate: hireDate || undefined,
    })

    setLoading(false)
    if (res.success) {
      setOpen(false)
      setEmployeeCode("")
      setFullName("")
      setUserEmail("")
      setPhone("")
      setNationalId("")
      setAddress("")
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
                <Label htmlFor="emp-code">Employee Code *</Label>
                <Input
                  id="emp-code"
                  placeholder="e.g. EMP-001"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  required
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
              <Label htmlFor="emp-email">Login Email Address</Label>
              <Input
                id="emp-email"
                type="email"
                placeholder="staff@angkorgate.local"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
              <span className="text-[10px] text-muted-foreground">
                If omitted, an account will be created automatically.
              </span>
            </div>

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
