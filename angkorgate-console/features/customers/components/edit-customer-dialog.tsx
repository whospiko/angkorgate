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
import { updateCustomerAction } from "../server/customers-actions"
import type { Customer, CustomerGender } from "../types/customers.types"

interface EditCustomerDialogProps {
  customer: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
}: EditCustomerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState(customer.fullName || "")
  const [gender, setGender] = useState<CustomerGender>(customer.gender || "MALE")
  const [dateOfBirth, setDateOfBirth] = useState(
    customer.dateOfBirth ? customer.dateOfBirth.split("T")[0] : ""
  )
  const [phone, setPhone] = useState(customer.phone || "")
  const [email, setEmail] = useState(customer.email || "")
  const [address, setAddress] = useState(customer.address || "")
  const [nationalId, setNationalId] = useState(customer.nationalId || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await updateCustomerAction(customer.id, {
      fullName,
      gender,
      dateOfBirth: dateOfBirth || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      nationalId: nationalId || undefined,
    })

    setLoading(false)
    if (res.success) {
      onOpenChange(false)
    } else {
      setError(res.message || "Failed to update customer")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Edit Customer Profile</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Update details for customer code {customer.code || customer.id.slice(0, 8)}.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-3.5 py-4 font-mono text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-cust-name">Full Legal / Display Name</Label>
              <Input
                id="edit-cust-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-cust-gender">Gender</Label>
                <select
                  id="edit-cust-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as CustomerGender)}
                  className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-cust-dob">Date of Birth</Label>
                <Input
                  id="edit-cust-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-cust-phone">Phone</Label>
                <Input
                  id="edit-cust-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-cust-email">Email</Label>
                <Input
                  id="edit-cust-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-cust-nid">National ID / Passport</Label>
              <Input
                id="edit-cust-nid"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-cust-address">Address</Label>
              <Input
                id="edit-cust-address"
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
