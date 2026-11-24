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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  RiLoader4Line,
  RiSaveLine,
  RiSettingsLine,
  RiAlertLine,
} from "@remixicon/react"
import { updateApiKeyAction } from "../server/api-keys-actions"
import type { ApiKey, ResourceSchemaMeta } from "../types/api-keys.types"

interface EditApiKeyDialogProps {
  apiKey: ApiKey | null
  schemaResources?: ResourceSchemaMeta[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditApiKeyDialog({
  apiKey,
  schemaResources = [],
  open,
  onOpenChange,
  onSuccess,
}: EditApiKeyDialogProps) {
  if (!apiKey) return null

  const [name, setName] = useState(apiKey.name)
  const [rateLimit, setRateLimit] = useState(apiKey.rateLimit || 120)
  const [allowedResources, setAllowedResources] = useState<string[]>(
    apiKey.allowedResources || ["customers", "employees"]
  )
  const [allowedMethods, setAllowedMethods] = useState<Record<string, string[]>>(
    apiKey.allowedMethods || { customers: ["GET"], employees: ["GET"] }
  )
  const [fieldProjections, setFieldProjections] = useState<
    Record<string, string[]>
  >(apiKey.fieldProjections || {})
  const [activeTab, setActiveTab] = useState<string>(
    allowedResources[0] || "customers"
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleMethod = (res: string, method: string) => {
    setAllowedMethods((prev) => {
      const current = prev[res] || []
      const next = current.includes(method)
        ? current.filter((m) => m !== method)
        : [...current, method]
      return { ...prev, [res]: next }
    })
  }

  const handleToggleField = (res: string, fieldName: string) => {
    setFieldProjections((prev) => {
      const current = prev[res] || []
      const next = current.includes(fieldName)
        ? current.filter((f) => f !== fieldName)
        : [...current, fieldName]
      return { ...prev, [res]: next }
    })
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    // Build permissions list
    const permissions: string[] = []
    if (allowedMethods.customers?.includes("GET")) permissions.push("customer:read")
    if (
      allowedMethods.customers?.some((m) => ["POST", "PATCH", "PUT", "DELETE"].includes(m))
    ) {
      permissions.push("customer:write")
    }
    if (allowedMethods.employees?.includes("GET")) permissions.push("employee:read")
    if (
      allowedMethods.employees?.some((m) => ["POST", "PATCH", "PUT", "DELETE"].includes(m))
    ) {
      permissions.push("employee:write")
    }

    const res = await updateApiKeyAction(apiKey.id, {
      name: name.trim(),
      rateLimit,
      allowedResources,
      allowedMethods,
      permissions,
      fieldProjections,
    })

    setLoading(false)

    if (res.success) {
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } else {
      setError(res.message || "Failed to update API key policy")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <RiSettingsLine className="size-4" />
            </div>
            <div>
              <DialogTitle className="font-heading text-lg">
                Edit API Key Policy: {apiKey.name}
              </DialogTitle>
              <DialogDescription className="text-xs font-mono">
                Key Prefix: {apiKey.keyPrefix}••••{apiKey.lastFour}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs font-mono flex items-center gap-2">
            <RiAlertLine className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Key Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Rate Limit (req/min)</Label>
              <Input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-xs font-medium">Granular Method Access</Label>
            {["customers", "employees"].map((res) => {
              const methods = allowedMethods[res] || []
              return (
                <div
                  key={res}
                  className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-between"
                >
                  <span className="font-mono text-xs font-semibold capitalize">
                    {res} API
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(["GET", "POST", "PATCH", "DELETE"] as const).map((m) => {
                      const isAllowed = methods.includes(m)
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleToggleMethod(res, m)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                            isAllowed
                              ? "bg-primary/20 text-primary border-primary/50 font-semibold"
                              : "bg-muted text-muted-foreground border-transparent"
                          }`}
                        >
                          {m} {isAllowed ? "✓" : "+"}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Field Projections</Label>
              <div className="flex gap-1.5">
                {["customers", "employees"].map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="xs"
                    variant={activeTab === r ? "default" : "outline"}
                    className="text-[11px] font-mono uppercase h-6"
                    onClick={() => setActiveTab(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border border-border/50 rounded-lg p-3 max-h-[160px] overflow-y-auto grid grid-cols-2 gap-2 bg-card">
              {schemaResources
                .find((r) => r.resource === activeTab)
                ?.fields.map((f) => {
                  const isChecked = (fieldProjections[activeTab] || []).includes(
                    f.name
                  )
                  return (
                    <label
                      key={f.name}
                      className="flex items-center gap-2 p-1 rounded hover:bg-muted/40 cursor-pointer text-xs"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleField(activeTab, f.name)}
                      />
                      <span className="font-mono text-[11px]">{f.name}</span>
                    </label>
                  )
                })}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="font-mono text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={handleSave}
            className="font-mono text-xs gap-1.5"
          >
            {loading ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : (
              <RiSaveLine className="size-4" />
            )}
            Save Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
