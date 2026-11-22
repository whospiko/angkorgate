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
import { createCustomerAction } from "../server/customers-actions"
import type { CustomerType, CustomerGender } from "../types/customers.types"

export function CreateCustomerDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState("")
  const [type, setType] = useState<CustomerType>("CUSTOMER")
  const [gender, setGender] = useState<CustomerGender>("MALE")
  const [dateOfBirth, setDateOfBirth] = useState("1995-01-01")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [nationalId, setNationalId] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await createCustomerAction({
      fullName,
      type,
      gender,
      dateOfBirth,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      nationalId: nationalId || undefined,
    })

    setLoading(false)
    if (res.success) {
      setOpen(false)
      setFullName("")
      setPhone("")
      setEmail("")
      setAddress("")
      setNationalId("")
    } else {
      setError(res.message || "Failed to create customer")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="font-mono">
            <RiUserAddLine className="mr-1.5 size-4" /> Add Customer
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Create Customer Profile</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Register a new patient, guest, or CRM customer in AngkorGate.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-3.5 py-4 font-mono text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="cust-fullname">Full Legal / Display Name *</Label>
              <Input
                id="cust-fullname"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cust-type">Customer Type</Label>
                <select
                  id="cust-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as CustomerType)}
                  className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="PATIENT">Patient (Clinic)</option>
                  <option value="GUEST">Guest (Hotel)</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cust-gender">Gender</Label>
                <select
                  id="cust-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as CustomerGender)}
                  className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cust-dob">Date of Birth *</Label>
                <Input
                  id="cust-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cust-national-id">National ID / Passport</Label>
                <Input
                  id="cust-national-id"
                  placeholder="ID12345678"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cust-phone">Phone Number</Label>
                <Input
                  id="cust-phone"
                  placeholder="+85512345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cust-email">Email Address</Label>
                <Input
                  id="cust-email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cust-address">Residential / Physical Address</Label>
              <Input
                id="cust-address"
                placeholder="Street address, City, Province"
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
                  Creating...
                </>
              ) : (
                "Create Customer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
