"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiLoader4Line } from "@remixicon/react"
import { updateEmployeeAction } from "../server/employees-actions"
import type { Employee, EmployeeGender } from "../types/employees.types"

interface EditEmployeeDialogProps {
  employee: Employee
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
}: EditEmployeeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState(employee.fullName || "")
  const [gender, setGender] = useState<EmployeeGender>(employee.gender || "FEMALE")
  const [dateOfBirth, setDateOfBirth] = useState(
    employee.dateOfBirth ? employee.dateOfBirth.split("T")[0] : ""
  )
  const [phone, setPhone] = useState(employee.phone || "")
  const [nationalId, setNationalId] = useState(employee.nationalId || "")
  const [address, setAddress] = useState(employee.address || "")
  const [hireDate, setHireDate] = useState(
    employee.hireDate ? employee.hireDate.split("T")[0] : ""
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await updateEmployeeAction(employee.id, {
      fullName,
      gender,
      dateOfBirth: dateOfBirth || undefined,
      phone: phone || undefined,
      nationalId: nationalId || undefined,
      address: address || undefined,
      hireDate: hireDate || undefined,
    })

    setLoading(false)
    if (res.success) {
      onOpenChange(false)
    } else {
      setError(res.message || "Failed to update employee profile")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Edit Employee Profile</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Update staff details for {employee.employeeCode} ({employee.fullName}).
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-3.5 py-4 font-mono text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-emp-name">Full Legal / Display Name</Label>
              <Input
                id="edit-emp-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-emp-gender">Gender</Label>
                <select
                  id="edit-emp-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as EmployeeGender)}
                  className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-emp-hire">Hire Date</Label>
                <Input
                  id="edit-emp-hire"
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-emp-dob">Date of Birth</Label>
                <Input
                  id="edit-emp-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-emp-phone">Phone</Label>
                <Input
                  id="edit-emp-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-emp-nid">National ID / Passport</Label>
              <Input
                id="edit-emp-nid"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-emp-addr">Residential Address</Label>
              <Input
                id="edit-emp-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="font-mono text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="font-mono text-xs">
              {loading ? (
                <>
                  <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
