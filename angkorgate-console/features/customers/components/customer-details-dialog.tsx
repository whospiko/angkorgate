"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  RiUserLine,
  RiPhoneLine,
  RiMailLine,
  RiMapPinLine,
  RiIdCardLine,
  RiAddLine,
  RiDeleteBinLine,
  RiLoader4Line,
} from "@remixicon/react"
import {
  updateCustomerStatusAction,
  getCustomerAttributes,
  setCustomerAttributeAction,
  deleteCustomerAttributeAction,
  getCustomerContacts,
  createCustomerContactAction,
  deleteCustomerContactAction,
} from "../server/customers-actions"
import type { Customer, CustomerContact, CustomerStatus } from "../types/customers.types"

interface CustomerDetailsDialogProps {
  customer: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetailsDialog({
  customer,
  open,
  onOpenChange,
}: CustomerDetailsDialogProps) {
  const [status, setStatus] = useState<CustomerStatus>(customer.status || "ACTIVE")
  const [statusLoading, setStatusLoading] = useState(false)

  // Contacts
  const [contacts, setContacts] = useState<CustomerContact[]>([])
  const [contactName, setContactName] = useState("")
  const [contactRel, setContactRel] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactLoading, setContactLoading] = useState(false)

  // Attributes
  const [attributes, setAttributes] = useState<Record<string, any>>({})
  const [attrKey, setAttrKey] = useState("")
  const [attrValue, setAttrValue] = useState("")
  const [attrLoading, setAttrLoading] = useState(false)

  useEffect(() => {
    if (open) {
      getCustomerContacts(customer.id).then(setContacts)
      getCustomerAttributes(customer.id).then(setAttributes)
      setStatus(customer.status || "ACTIVE")
    }
  }, [open, customer.id, customer.status])

  const handleStatusChange = async (newStatus: CustomerStatus) => {
    setStatusLoading(true)
    const res = await updateCustomerStatusAction(customer.id, newStatus)
    setStatusLoading(false)
    if (res.success) {
      setStatus(newStatus)
    }
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactName.trim()) return
    setContactLoading(true)
    const res = await createCustomerContactAction(customer.id, {
      fullName: contactName,
      relationship: contactRel || undefined,
      phone: contactPhone || undefined,
      isPrimary: contacts.length === 0,
    })
    setContactLoading(false)
    if (res.success && res.data) {
      setContacts((prev) => [...prev, res.data!])
      setContactName("")
      setContactRel("")
      setContactPhone("")
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    const res = await deleteCustomerContactAction(customer.id, contactId)
    if (res.success) {
      setContacts((prev) => prev.filter((c) => c.id !== contactId))
    }
  }

  const handleSetAttribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attrKey.trim()) return
    setAttrLoading(true)
    const res = await setCustomerAttributeAction(customer.id, attrKey.trim(), attrValue)
    setAttrLoading(false)
    if (res.success) {
      setAttributes((prev) => ({ ...prev, [attrKey.trim()]: attrValue }))
      setAttrKey("")
      setAttrValue("")
    }
  }

  const handleDeleteAttribute = async (key: string) => {
    const res = await deleteCustomerAttributeAction(customer.id, key)
    if (res.success) {
      setAttributes((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              <RiUserLine className="size-5 text-primary" />
              {customer.fullName}
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs uppercase">
              {customer.type || "CUSTOMER"}
            </Badge>
          </div>
          <DialogDescription className="font-mono text-xs">
            Customer ID: {customer.id} &bull; Code: {customer.code || "N/A"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3 font-mono text-xs">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
            <span className="text-muted-foreground">Lifecycle Status:</span>
            <div className="flex items-center gap-2">
              <select
                value={status}
                disabled={statusLoading}
                onChange={(e) => handleStatusChange(e.target.value as CustomerStatus)}
                className="h-7 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono text-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 outline-none"
              >
                <option value="LEAD">LEAD</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="CHURNED">CHURNED</option>
              </select>
              {statusLoading && <RiLoader4Line className="size-4 animate-spin text-primary" />}
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/50 bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RiPhoneLine className="size-4 shrink-0 text-primary" />
              <span className="text-foreground">{customer.phone || "No phone registered"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <RiMailLine className="size-4 shrink-0 text-primary" />
              <span className="text-foreground truncate">{customer.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <RiIdCardLine className="size-4 shrink-0 text-primary" />
              <span className="text-foreground">{customer.nationalId || "No NID/Passport"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <RiMapPinLine className="size-4 shrink-0 text-primary" />
              <span className="text-foreground truncate">{customer.address || "No address"}</span>
            </div>
          </div>

          {/* Authorized Contacts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-semibold text-sm">Authorized Contacts ({contacts.length})</h4>
            </div>

            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No contacts added yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2 rounded-md border border-border/40 bg-muted/10 text-xs"
                  >
                    <div>
                      <span className="font-medium text-foreground">{contact.fullName || (contact as any).name}</span>
                      {contact.relationship && (
                        <span className="text-muted-foreground ml-2">({contact.relationship})</span>
                      )}
                      {contact.phone && (
                        <span className="text-muted-foreground ml-2">&bull; {contact.phone}</span>
                      )}
                    </div>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <RiDeleteBinLine className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddContact} className="flex gap-2 pt-1">
              <Input
                placeholder="Contact Name *"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="h-7 text-xs font-mono"
                required
              />
              <Input
                placeholder="Relationship"
                value={contactRel}
                onChange={(e) => setContactRel(e.target.value)}
                className="h-7 text-xs font-mono w-28"
              />
              <Input
                placeholder="Phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="h-7 text-xs font-mono w-32"
              />
              <Button type="submit" size="sm" disabled={contactLoading} className="h-7 font-mono text-xs">
                {contactLoading ? <RiLoader4Line className="size-3 animate-spin" /> : <RiAddLine className="size-3.5" />}
              </Button>
            </form>
          </div>

          {/* Dynamic Attributes */}
          <div className="space-y-2">
            <h4 className="font-heading font-semibold text-sm">Dynamic Attributes</h4>
            {Object.keys(attributes).length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No dynamic attributes configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(attributes).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="font-mono text-xs gap-1.5 py-1">
                    <span className="text-muted-foreground">{k}:</span>
                    <span className="font-medium">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttribute(k)}
                      className="text-muted-foreground hover:text-destructive ml-1"
                    >
                      &times;
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <form onSubmit={handleSetAttribute} className="flex gap-2 pt-1">
              <Input
                placeholder="Key (e.g. loyalty_tier)"
                value={attrKey}
                onChange={(e) => setAttrKey(e.target.value)}
                className="h-7 text-xs font-mono flex-1"
                required
              />
              <Input
                placeholder="Value (e.g. VIP_GOLD)"
                value={attrValue}
                onChange={(e) => setAttrValue(e.target.value)}
                className="h-7 text-xs font-mono flex-1"
                required
              />
              <Button type="submit" size="sm" disabled={attrLoading} className="h-7 font-mono text-xs">
                {attrLoading ? <RiLoader4Line className="size-3 animate-spin" /> : <RiAddLine className="size-3.5" />}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
