"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
import {
  RiUserLine,
  RiPhoneLine,
  RiMailLine,
  RiMapPinLine,
  RiIdCardLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiLink,
  RiLinkUnlink,
  RiAlertLine,
} from "@remixicon/react"
import {
  updateCustomerStatusAction,
  linkCustomerUserAction,
  getCustomerAttributes,
  getCustomerAttributeSchemas,
  setCustomerAttributeAction,
  deleteCustomerAttributeAction,
  getCustomerContacts,
  createCustomerContactAction,
  updateCustomerContactAction,
  deleteCustomerContactAction,
} from "../server/customers-actions"
import type { Customer, CustomerContact, CustomerStatus } from "../types/customers.types"

interface CustomerDetailsDialogProps {
  customer: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parseAttributeInput(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return raw
    }
  }
  return raw
}

export function CustomerDetailsDialog({
  customer,
  open,
  onOpenChange,
}: CustomerDetailsDialogProps) {
  const [status, setStatus] = useState<CustomerStatus>(customer.status || "ACTIVE")
  const [statusLoading, setStatusLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  // User linking
  const [linkedUserId, setLinkedUserId] = useState<string | null>(customer.userId ?? null)
  const [userIdInput, setUserIdInput] = useState(customer.userId ?? "")
  const [userLinkLoading, setUserLinkLoading] = useState(false)

  // Contacts
  const [contacts, setContacts] = useState<CustomerContact[]>([])
  const [contactName, setContactName] = useState("")
  const [contactRel, setContactRel] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactLoading, setContactLoading] = useState(false)

  // Inline contact edit
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editContactName, setEditContactName] = useState("")
  const [editContactRel, setEditContactRel] = useState("")
  const [editContactPhone, setEditContactPhone] = useState("")
  const [editContactPrimary, setEditContactPrimary] = useState(false)

  // Attributes
  const [attributes, setAttributes] = useState<Record<string, unknown>>({})
  const [schemaMap, setSchemaMap] = useState<Record<string, Record<string, string>>>({})
  const [attrKey, setAttrKey] = useState("")
  const [attrValue, setAttrValue] = useState("")
  const [attrLoading, setAttrLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    Promise.all([
      getCustomerContacts(customer.id),
      getCustomerAttributes(customer.id),
      getCustomerAttributeSchemas(),
    ]).then(([c, a, s]) => {
      if (cancelled) return
      setContacts(c)
      setAttributes(a)
      setSchemaMap(s)
    })
    return () => {
      cancelled = true
    }
  }, [open, customer.id])

  const suggestedSchema = schemaMap[customer.type] || {}

  const handleStatusChange = async (newStatus: CustomerStatus) => {
    setFeedbackError(null)
    setStatusLoading(true)
    const res = await updateCustomerStatusAction(customer.id, newStatus)
    setStatusLoading(false)
    if (res.success) {
      setStatus(newStatus)
    } else {
      setFeedbackError(res.message || "Failed to update status")
    }
  }

  const handleLinkUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userIdInput.trim()) return
    setFeedbackError(null)
    setUserLinkLoading(true)
    const res = await linkCustomerUserAction(customer.id, userIdInput.trim())
    setUserLinkLoading(false)
    if (res.success) {
      setLinkedUserId(userIdInput.trim())
    } else {
      setFeedbackError(res.message || "Failed to link user account")
    }
  }

  const handleUnlinkUser = async () => {
    setFeedbackError(null)
    setUserLinkLoading(true)
    const res = await linkCustomerUserAction(customer.id, null)
    setUserLinkLoading(false)
    if (res.success) {
      setLinkedUserId(null)
      setUserIdInput("")
    } else {
      setFeedbackError(res.message || "Failed to unlink user account")
    }
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactName.trim()) return
    setFeedbackError(null)
    setContactLoading(true)
    const res = await createCustomerContactAction(customer.id, {
      fullName: contactName.trim(),
      relationship: contactRel.trim() || undefined,
      phone: contactPhone.trim() || undefined,
      email: contactEmail.trim() || undefined,
      isPrimary: contacts.length === 0,
    })
    setContactLoading(false)
    if (res.success && res.data) {
      setContacts((prev) => [...prev, res.data!])
      setContactName("")
      setContactRel("")
      setContactPhone("")
      setContactEmail("")
    } else {
      setFeedbackError(res.message || "Failed to add contact")
    }
  }

  const startEditContact = (c: CustomerContact) => {
    setEditingContactId(c.id)
    setEditContactName(c.fullName)
    setEditContactRel(c.relationship || "")
    setEditContactPhone(c.phone || "")
    setEditContactPrimary(Boolean(c.isPrimary))
  }

  const handleSaveContact = async (contactId: string) => {
    setFeedbackError(null)
    const res = await updateCustomerContactAction(customer.id, contactId, {
      fullName: editContactName.trim(),
      relationship: editContactRel.trim() || undefined,
      phone: editContactPhone.trim() || undefined,
      isPrimary: editContactPrimary,
    })
    if (res.success) {
      const refreshed = await getCustomerContacts(customer.id)
      setContacts(refreshed)
      setEditingContactId(null)
    } else {
      setFeedbackError(res.message || "Failed to update contact")
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    setFeedbackError(null)
    const res = await deleteCustomerContactAction(customer.id, contactId)
    if (res.success) {
      const refreshed = await getCustomerContacts(customer.id)
      setContacts(refreshed)
    } else {
      setFeedbackError(res.message || "Failed to remove contact")
    }
  }

  const handleSetAttribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attrKey.trim()) return
    setFeedbackError(null)
    setAttrLoading(true)
    const parsedVal = parseAttributeInput(attrValue)
    const res = await setCustomerAttributeAction(customer.id, attrKey.trim(), parsedVal)
    setAttrLoading(false)
    if (res.success) {
      setAttributes((prev) => ({ ...prev, [attrKey.trim()]: parsedVal }))
      setAttrKey("")
      setAttrValue("")
    } else {
      setFeedbackError(res.message || "Failed to set attribute")
    }
  }

  const handleDeleteAttribute = async (key: string) => {
    setFeedbackError(null)
    const res = await deleteCustomerAttributeAction(customer.id, key)
    if (res.success) {
      setAttributes((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } else {
      setFeedbackError(res.message || "Failed to delete attribute")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              <RiUserLine className="size-5 text-primary" />
              {customer.fullName}
              {customer.isMinor && (
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                >
                  Minor (&lt;18)
                </Badge>
              )}
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs uppercase">
              {customer.type || "CUSTOMER"}
            </Badge>
          </div>
          <DialogDescription className="font-mono text-xs">
            Code: <span className="text-primary font-semibold">{customer.customerCode || "N/A"}</span>{" "}
            &bull; ID: {customer.id}
          </DialogDescription>
        </DialogHeader>

        {feedbackError && (
          <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
            {feedbackError}
          </div>
        )}

        {customer.isMinor && contacts.length === 0 && (
          <div className="flex items-center gap-2 font-mono text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-md border border-amber-500/30">
            <RiAlertLine className="size-4 shrink-0" />
            <span>Minor profile: add at least one guardian / emergency contact below.</span>
          </div>
        )}

        <div className="space-y-5 py-2 font-mono text-xs">
          {/* Status & User Link Bar */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
              <span className="text-muted-foreground">Status:</span>
              <div className="flex items-center gap-2">
                <select
                  value={status}
                  disabled={statusLoading}
                  onChange={(e) => handleStatusChange(e.target.value as CustomerStatus)}
                  className="h-7 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono text-foreground focus-visible:border-primary outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
                {statusLoading && <RiLoader4Line className="size-4 animate-spin text-primary" />}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border/50 bg-muted/20">
              {linkedUserId ? (
                <>
                  <div className="truncate">
                    <span className="text-muted-foreground">User: </span>
                    <Link
                      href={`/users/${linkedUserId}`}
                      className="text-primary hover:underline font-semibold"
                    >
                      {linkedUserId.slice(0, 8)}...
                    </Link>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={userLinkLoading}
                    onClick={handleUnlinkUser}
                    className="h-7 font-mono text-[11px] shrink-0"
                  >
                    <RiLinkUnlink className="mr-1 size-3.5" /> Unlink
                  </Button>
                </>
              ) : (
                <form onSubmit={handleLinkUser} className="flex w-full items-center gap-1.5">
                  <Input
                    placeholder="Link User UUID..."
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    className="h-7 text-[11px] font-mono flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={userLinkLoading || !userIdInput.trim()}
                    className="h-7 font-mono text-[11px] shrink-0"
                  >
                    <RiLink className="mr-1 size-3.5" /> Link
                  </Button>
                </form>
              )}
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
            <h4 className="font-heading font-semibold text-sm">
              Authorized Contacts & Guardians ({contacts.length})
            </h4>

            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No contacts added yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-2 rounded-md border border-border/40 bg-muted/10 text-xs"
                  >
                    {editingContactId === contact.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={editContactName}
                          onChange={(e) => setEditContactName(e.target.value)}
                          placeholder="Full Name"
                          className="h-7 text-xs font-mono flex-1 min-w-[120px]"
                        />
                        <Input
                          value={editContactRel}
                          onChange={(e) => setEditContactRel(e.target.value)}
                          placeholder="Relationship"
                          className="h-7 text-xs font-mono w-28"
                        />
                        <Input
                          value={editContactPhone}
                          onChange={(e) => setEditContactPhone(e.target.value)}
                          placeholder="Phone"
                          className="h-7 text-xs font-mono w-32"
                        />
                        <label className="flex items-center gap-1 text-[11px]">
                          <input
                            type="checkbox"
                            checked={editContactPrimary}
                            onChange={(e) => setEditContactPrimary(e.target.checked)}
                          />
                          Primary
                        </label>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleSaveContact(contact.id)}
                          className="text-emerald-600"
                        >
                          <RiCheckLine className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => setEditingContactId(null)}
                        >
                          <RiCloseLine className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-foreground">{contact.fullName}</span>
                          {contact.isPrimary && (
                            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                              Primary
                            </Badge>
                          )}
                          {contact.relationship && (
                            <span className="text-muted-foreground">({contact.relationship})</span>
                          )}
                          {contact.phone && (
                            <span className="text-muted-foreground">&bull; {contact.phone}</span>
                          )}
                          {contact.email && (
                            <span className="text-muted-foreground">&bull; {contact.email}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => startEditContact(contact)}
                          >
                            <RiEditLine className="size-3.5" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleDeleteContact(contact.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <RiDeleteBinLine className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddContact} className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <Input
                placeholder="Contact Name *"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="h-7 text-xs font-mono sm:col-span-4"
                required
              />
              <Input
                placeholder="Relationship"
                value={contactRel}
                onChange={(e) => setContactRel(e.target.value)}
                className="h-7 text-xs font-mono sm:col-span-2"
              />
              <Input
                placeholder="Phone (+855...)"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="h-7 text-xs font-mono sm:col-span-3"
              />
              <Input
                placeholder="Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="h-7 text-xs font-mono sm:col-span-2"
              />
              <Button
                type="submit"
                size="sm"
                disabled={contactLoading}
                className="h-7 font-mono text-xs sm:col-span-1"
              >
                {contactLoading ? <RiLoader4Line className="size-3 animate-spin" /> : <RiAddLine className="size-3.5" />}
              </Button>
            </form>
          </div>

          {/* Dynamic Attributes */}
          <div className="space-y-2">
            <h4 className="font-heading font-semibold text-sm">Dynamic Attributes</h4>
            {Object.keys(suggestedSchema).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Suggested for {customer.type}:</span>
                {Object.entries(suggestedSchema).map(([k, typeHint]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAttrKey(k)}
                    className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/30 hover:border-primary hover:text-primary transition-colors"
                    title={`Type: ${typeHint}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}

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
                placeholder="Key (e.g. blood_type)"
                value={attrKey}
                onChange={(e) => setAttrKey(e.target.value)}
                className="h-7 text-xs font-mono flex-1"
                required
              />
              <Input
                placeholder='Value (e.g. O+ or ["peanuts"])'
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
