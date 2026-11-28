"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import {
  RiGitMergeLine,
  RiLoader4Line,
  RiCheckLine,
  RiArrowLeftRightLine,
} from "@remixicon/react"
import { getCustomers, mergeCustomersAction } from "../server/customers-actions"
import type { Customer, MergeCustomersResult } from "../types/customers.types"

interface MergeCustomersDialogProps {
  customers: Customer[]
}

export function MergeCustomersDialog({ customers }: MergeCustomersDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Customer[]>(customers)
  const [searchText, setSearchText] = useState("")
  const [searching, setSearching] = useState(false)

  const [primaryId, setPrimaryId] = useState("")
  const [duplicateId, setDuplicateId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MergeCustomersResult | null>(null)

  const activeOptions = options.filter((c) => c.status !== "ARCHIVED")

  const handleSearch = async () => {
    setSearching(true)
    const res = await getCustomers({ search: searchText.trim() || undefined, page: 1, limit: 30 })
    setSearching(false)
    if (res.items.length > 0) {
      setOptions((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]))
        for (const item of res.items) map.set(item.id, item)
        return Array.from(map.values())
      })
    }
  }

  const handleSwap = () => {
    setPrimaryId(duplicateId)
    setDuplicateId(primaryId)
  }

  const handleMerge = async () => {
    setError(null)
    setResult(null)
    if (!primaryId || !duplicateId) {
      setError("Select both a primary customer and a duplicate customer.")
      return
    }
    if (primaryId === duplicateId) {
      setError("Primary and duplicate customer must be different.")
      return
    }
    setLoading(true)
    const res = await mergeCustomersAction(primaryId, duplicateId)
    setLoading(false)
    if (res.success && res.data) {
      setResult(res.data)
      setDuplicateId("")
      router.refresh()
    } else {
      setError(res.message || "Failed to merge customers")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setOptions(customers)
          setError(null)
          setResult(null)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="font-mono text-xs">
            <RiGitMergeLine className="mr-1.5 size-4" /> Merge Duplicates
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Merge Duplicate Customers</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Keep the primary customer code, move non-colliding contacts, attributes, and user link, then archive the duplicate.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
            {error}
          </div>
        )}

        {result && (
          <div className="font-mono text-xs bg-emerald-500/10 text-emerald-500 p-3 rounded-md border border-emerald-500/20 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <RiCheckLine className="size-4" />
              Merged into {result.primary.customerCode}
            </div>
            <div>
              Archived: {result.archivedDuplicateCode} · Moved contacts: {result.movedContacts} · Moved attributes:{" "}
              {result.movedAttributes}
              {result.transferredUserId ? " · Transferred login link" : ""}
            </div>
          </div>
        )}

        <div className="grid gap-3.5 py-2 font-mono text-xs">
          <div className="flex gap-2">
            <Input
              placeholder="Search customers by name, code, or phone..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={searching}
              className="h-8 font-mono text-xs"
            >
              {searching ? "..." : "Find"}
            </Button>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="merge-primary">Primary Customer (Keep) *</Label>
            <select
              id="merge-primary"
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground outline-none"
            >
              <option value="">Select primary customer...</option>
              {activeOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerCode} · {c.fullName}
                  {c.phone ? ` (${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSwap}
              className="h-7 px-2 font-mono text-[11px] text-muted-foreground"
            >
              <RiArrowLeftRightLine className="mr-1 size-3.5" />
              Swap Primary / Duplicate
            </Button>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="merge-duplicate">Duplicate Customer (Archive) *</Label>
            <select
              id="merge-duplicate"
              value={duplicateId}
              onChange={(e) => setDuplicateId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground outline-none"
            >
              <option value="">Select duplicate customer...</option>
              {activeOptions
                .filter((c) => c.id !== primaryId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} · {c.fullName}
                    {c.phone ? ` (${c.phone})` : ""}
                  </option>
                ))}
            </select>
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
            Close
          </Button>
          <Button
            type="button"
            onClick={handleMerge}
            disabled={loading || !primaryId || !duplicateId}
            className="font-mono text-xs"
          >
            {loading ? (
              <>
                <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                Merging...
              </>
            ) : (
              "Merge & Archive Duplicate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
