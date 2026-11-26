"use client"

import { useEffect, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RiAddLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  RiFileCopyLine,
  RiKey2Line,
  RiLoader4Line,
  RiShieldCheckLine,
  RiFilter3Line,
  RiLockLine,
  RiTerminalBoxLine,
  RiAlertLine,
} from "@remixicon/react"
import { createApiKeyAction } from "../server/api-keys-actions"
import type {
  ApiKeyCreatedResponse,
  ResourceSchemaMeta,
} from "../types/api-keys.types"

interface CreateApiKeyDialogProps {
  schemaResources?: ResourceSchemaMeta[]
  onSuccess?: () => void
  defaultOpen?: boolean
}

const DEFAULT_SAMPLE_CUSTOMER = {
  id: "c8e6b3b2-7634-4bc1-9c8e-32f281204a11",
  customerCode: "PAT-0042",
  type: "PATIENT",
  fullName: "Alice Walker",
  gender: "FEMALE",
  status: "ACTIVE",
  dateOfBirth: "1992-05-15",
  phone: "+85512345678",
  email: "alice.walker@example.com",
  nationalId: "CAM-987654321",
  address: "Phnom Penh, Cambodia",
  createdAt: "2026-11-20T10:15:30.000Z",
}

const DEFAULT_SAMPLE_EMPLOYEE = {
  id: "e9f7a1b4-2345-4de2-8a9f-43e192315b22",
  employeeCode: "EMP-0018",
  fullName: "Dara Sok",
  gender: "MALE",
  employmentStatus: "ACTIVE",
  dateOfBirth: "1988-11-04",
  hireDate: "2023-01-15",
  phone: "+85598765432",
  nationalId: "CAM-123456789",
  address: "Siem Reap, Cambodia",
  createdAt: "2026-11-15T08:00:00.000Z",
}

export function CreateApiKeyDialog({
  schemaResources = [],
  onSuccess,
  defaultOpen = false,
}: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    const handleOpen = () => setOpen(true)
    window.addEventListener("angkorgate:open-create-api-key", handleOpen)
    return () => {
      window.removeEventListener("angkorgate:open-create-api-key", handleOpen)
    }
  }, [])
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Details
  const [name, setName] = useState("")
  const [environment, setEnvironment] = useState<"live" | "test">("live")
  const [expirationDays, setExpirationDays] = useState<number>(90)

  // Step 2: Method & Resource Matrix
  const [selectedResources, setSelectedResources] = useState<string[]>([
    "customers",
    "employees",
  ])
  const [allowedMethods, setAllowedMethods] = useState<Record<string, string[]>>({
    customers: ["GET"],
    employees: ["GET"],
  })

  // Step 3: Field Projections
  const [activeResourceTab, setActiveResourceTab] = useState<string>("customers")
  const [fieldProjections, setFieldProjections] = useState<Record<string, string[]>>({
    customers: ["id", "customerCode", "fullName", "gender", "status"],
    employees: ["id", "employeeCode", "fullName", "gender", "employmentStatus"],
  })

  // Step 4: Success / Secret Key Reveal
  const [createdKey, setCreatedKey] = useState<ApiKeyCreatedResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [codeTab, setCodeTab] = useState<"curl" | "ts" | "python">("curl")

  // Fallback resources if backend did not supply
  const effectiveResources = schemaResources.length > 0 ? schemaResources : [
    {
      resource: "customers",
      title: "Customers & CRM",
      description: "Patient, Guest, and Customer profiles",
      basePath: "/customers",
      supportedMethods: ["GET", "POST", "PATCH", "DELETE"] as any,
      fields: [
        { name: "id", label: "UUID", type: "uuid", isPii: false, isDefault: true },
        { name: "customerCode", label: "Customer Code", type: "string", isPii: false, isDefault: true },
        { name: "type", label: "Type", type: "string", isPii: false, isDefault: true },
        { name: "fullName", label: "Full Name", type: "string", isPii: false, isDefault: true },
        { name: "gender", label: "Gender", type: "string", isPii: false, isDefault: true },
        { name: "status", label: "Status", type: "string", isPii: false, isDefault: true },
        { name: "dateOfBirth", label: "Date of Birth", type: "date", isPii: true, isDefault: false },
        { name: "phone", label: "Phone", type: "string", isPii: true, isDefault: false },
        { name: "email", label: "Email", type: "string", isPii: true, isDefault: false },
        { name: "nationalId", label: "National ID", type: "string", isPii: true, isDefault: false },
        { name: "address", label: "Address", type: "string", isPii: true, isDefault: false },
      ],
    },
    {
      resource: "employees",
      title: "Employees & Organization",
      description: "Staff directory and records",
      basePath: "/employees",
      supportedMethods: ["GET", "POST", "PATCH", "DELETE"] as any,
      fields: [
        { name: "id", label: "UUID", type: "uuid", isPii: false, isDefault: true },
        { name: "employeeCode", label: "Employee Code", type: "string", isPii: false, isDefault: true },
        { name: "fullName", label: "Full Name", type: "string", isPii: false, isDefault: true },
        { name: "gender", label: "Gender", type: "string", isPii: false, isDefault: true },
        { name: "employmentStatus", label: "Employment Status", type: "string", isPii: false, isDefault: true },
        { name: "dateOfBirth", label: "Date of Birth", type: "date", isPii: true, isDefault: false },
        { name: "hireDate", label: "Hire Date", type: "date", isPii: false, isDefault: false },
        { name: "phone", label: "Phone", type: "string", isPii: true, isDefault: false },
        { name: "nationalId", label: "National ID", type: "string", isPii: true, isDefault: false },
        { name: "address", label: "Address", type: "string", isPii: true, isDefault: false },
      ],
    },
  ]

  const handleToggleResource = (res: string) => {
    setSelectedResources((prev) =>
      prev.includes(res) ? prev.filter((r) => r !== res) : [...prev, res]
    )
  }

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

  const handleSelectAllFields = (res: string) => {
    const meta = effectiveResources.find((r) => r.resource === res)
    if (!meta) return
    setFieldProjections((prev) => ({
      ...prev,
      [res]: meta.fields.map((f) => f.name),
    }))
  }

  const handleClearAllFields = (res: string) => {
    setFieldProjections((prev) => ({
      ...prev,
      [res]: [],
    }))
  }

  const handleSetSafePiiPreset = (res: string) => {
    const meta = effectiveResources.find((r) => r.resource === res)
    if (!meta) return
    setFieldProjections((prev) => ({
      ...prev,
      [res]: meta.fields.filter((f) => !f.isPii).map((f) => f.name),
    }))
  }

  // Generate mock JSON for live preview terminal
  const currentPreviewData = () => {
    const sample =
      activeResourceTab === "customers"
        ? DEFAULT_SAMPLE_CUSTOMER
        : DEFAULT_SAMPLE_EMPLOYEE
    const allowed = fieldProjections[activeResourceTab] || []
    if (allowed.length === 0) {
      return JSON.stringify(sample, null, 2)
    }
    const filtered: Record<string, any> = {}
    for (const key of Object.keys(sample)) {
      if (allowed.includes(key)) {
        filtered[key] = (sample as any)[key]
      }
    }
    return JSON.stringify(filtered, null, 2)
  }

  const handleGenerate = async () => {
    if (!name.trim()) {
      setError("Please specify a name for this API key.")
      setStep(1)
      return
    }

    setLoading(true)
    setError(null)

    // Build permissions list based on enabled methods
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

    const res = await createApiKeyAction({
      name: name.trim(),
      environment,
      expirationDays,
      allowedResources: selectedResources,
      allowedMethods,
      permissions,
      fieldProjections,
    })

    setLoading(false)

    if (res.success && res.data) {
      setCreatedKey(res.data)
      setStep(4)
      if (onSuccess) onSuccess()
    } else {
      setError(res.message || "Failed to generate API key.")
    }
  }

  const handleCopy = () => {
    if (createdKey?.secretKey) {
      navigator.clipboard.writeText(createdKey.secretKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset wizard
    setTimeout(() => {
      setStep(1)
      setName("")
      setCreatedKey(null)
      setError(null)
      setCopied(false)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger
        render={
          <Button className="font-sans font-medium gap-2">
            <RiAddLine className="size-4" />
            Generate API Key
          </Button>
        }
      />

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <RiKey2Line className="size-4" />
            </div>
            <div>
              <DialogTitle className="font-heading text-lg">
                {step === 4
                  ? "API Key Handshake Ready"
                  : "Generate Developer API Key"}
              </DialogTitle>
              <DialogDescription className="text-xs font-mono">
                {step === 1 && "Step 1 of 3: Key Identity & Expiration Policy"}
                {step === 2 && "Step 2 of 3: Granular HTTP Method & Route Control"}
                {step === 3 && "Step 3 of 3: Dynamic Field Projection & Live Preview"}
                {step === 4 && "Zero-Trust Secret Reveal — Copy before closing"}
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

        {/* STEP 1: Details */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Key Name</Label>
              <Input
                placeholder="e.g. Mobile App CRM Integration, Front-Desk Sync"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground font-mono">
                Give your API key an identifiable name describing its purpose.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Environment</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={environment === "live" ? "default" : "outline"}
                    className="flex-1 font-mono text-xs gap-1.5"
                    onClick={() => setEnvironment("live")}
                  >
                    <Badge variant="secondary" className="px-1 text-[10px] font-mono">
                      ag_live_
                    </Badge>
                    Production
                  </Button>
                  <Button
                    type="button"
                    variant={environment === "test" ? "default" : "outline"}
                    className="flex-1 font-mono text-xs gap-1.5"
                    onClick={() => setEnvironment("test")}
                  >
                    <Badge variant="secondary" className="px-1 text-[10px] font-mono">
                      ag_test_
                    </Badge>
                    Sandbox
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Expiration Period</Label>
                <select
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-mono shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={30}>30 Days (Recommended)</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={365}>1 Year</option>
                  <option value={0}>Never Expires</option>
                </select>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Expired keys are automatically refused at the gateway.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Granular Method & Route Control */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground font-mono">
              Configure which HTTP operations this API key is permitted to execute.
              Any unselected method will be blocked with a 403 Forbidden status.
            </p>

            <div className="grid gap-3">
              {effectiveResources.map((res) => {
                const isSelected = selectedResources.includes(res.resource)
                const methods = allowedMethods[res.resource] || []

                return (
                  <div
                    key={res.resource}
                    className={`p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/40 bg-card/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleResource(res.resource)}
                        />
                        <div>
                          <h4 className="font-heading text-sm font-semibold text-foreground">
                            {res.title}
                          </h4>
                          <p className="text-xs text-muted-foreground font-mono">
                            Base Route: {res.basePath}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {methods.length} methods active
                      </Badge>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-2 border-t border-border/40 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono mr-2">
                          Allowed Methods:
                        </span>
                        {(["GET", "POST", "PATCH", "DELETE"] as const).map(
                          (m) => {
                            const isAllowed = methods.includes(m)
                            let badgeStyle = "bg-muted text-muted-foreground hover:bg-muted/80"
                            if (isAllowed) {
                              if (m === "GET") badgeStyle = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              else if (m === "POST") badgeStyle = "bg-primary/20 text-primary border-primary/40"
                              else if (m === "PATCH") badgeStyle = "bg-amber-500/20 text-amber-400 border-amber-500/40"
                              else if (m === "DELETE") badgeStyle = "bg-rose-500/20 text-rose-400 border-rose-500/40"
                            }

                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => handleToggleMethod(res.resource, m)}
                                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-all cursor-pointer ${badgeStyle}`}
                              >
                                {m} {isAllowed ? "✓" : "+"}
                              </button>
                            )
                          }
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Dynamic Field Projection & Live Preview */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-mono">
                Select allowed fields for endpoint responses. Unchecked fields are
                automatically stripped, eliminating PII data leaks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Field Selectors */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {selectedResources.map((r) => (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant={activeResourceTab === r ? "default" : "outline"}
                      className="font-mono text-xs uppercase"
                      onClick={() => setActiveResourceTab(r)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="text-[11px] font-mono h-7"
                    onClick={() => handleSelectAllFields(activeResourceTab)}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="text-[11px] font-mono h-7"
                    onClick={() => handleSetSafePiiPreset(activeResourceTab)}
                  >
                    Safe Non-PII
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="text-[11px] font-mono h-7 text-muted-foreground"
                    onClick={() => handleClearAllFields(activeResourceTab)}
                  >
                    Clear All
                  </Button>
                </div>

                <div className="border border-border/50 rounded-lg p-3 max-h-[260px] overflow-y-auto space-y-2 bg-card">
                  {effectiveResources
                    .find((r) => r.resource === activeResourceTab)
                    ?.fields.map((f) => {
                      const isChecked = (
                        fieldProjections[activeResourceTab] || []
                      ).includes(f.name)

                      return (
                        <label
                          key={f.name}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-muted/40 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() =>
                                handleToggleField(activeResourceTab, f.name)
                              }
                            />
                            <span className="font-mono text-foreground">
                              {f.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {f.isPii && (
                              <Badge
                                variant="destructive"
                                className="px-1 text-[9px] font-mono"
                              >
                                PII
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {f.type}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                </div>
              </div>

              {/* Right Column: Live JSON Preview Terminal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                    <RiTerminalBoxLine className="size-3.5 text-primary" />
                    <span>Live Response Shape Preview</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {(fieldProjections[activeResourceTab] || []).length} fields exposed
                  </Badge>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-xs overflow-x-auto max-h-[290px] text-emerald-400">
                  <pre className="text-[11px] leading-relaxed">
                    {currentPreviewData()}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Secret Key Handshake Reveal Screen */}
        {step === 4 && createdKey && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-heading font-semibold text-sm">
                <RiLockLine className="size-4" />
                Zero-Trust Secret Key Generated
              </div>
              <p className="text-xs font-mono">
                This secret key will <strong>never be shown again</strong>. Please copy
                it now and store it in your environment variables (<code className="text-foreground">ANGKORGATE_API_KEY</code>).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground">
                Your Secret API Key
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdKey.secretKey}
                  className="font-mono text-xs bg-muted/50 text-foreground tracking-wide font-semibold"
                />
                <Button
                  type="button"
                  onClick={handleCopy}
                  className="font-mono text-xs gap-1.5 shrink-0"
                >
                  {copied ? (
                    <>
                      <RiCheckLine className="size-4 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <RiFileCopyLine className="size-4" />
                      Copy Key
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Quick Start Integration Code Snippets */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label className="text-xs font-mono text-muted-foreground">
                Quick Integration Examples
              </Label>
              <Tabs
                value={codeTab}
                onValueChange={(v) => setCodeTab(v as any)}
                className="w-full"
              >
                <TabsList className="h-8">
                  <TabsTrigger value="curl" className="text-xs font-mono">
                    cURL
                  </TabsTrigger>
                  <TabsTrigger value="ts" className="text-xs font-mono">
                    TypeScript / Fetch
                  </TabsTrigger>
                  <TabsTrigger value="python" className="text-xs font-mono">
                    Python Requests
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="curl" className="mt-2">
                  <pre className="p-3 rounded-lg border border-border/50 bg-muted/40 font-mono text-xs text-foreground overflow-x-auto">
                    {`curl -X GET "http://localhost:8080/customers" \\
  -H "x-api-key: ${createdKey.secretKey}" \\
  -H "Accept: application/json"`}
                  </pre>
                </TabsContent>

                <TabsContent value="ts" className="mt-2">
                  <pre className="p-3 rounded-lg border border-border/50 bg-muted/40 font-mono text-xs text-foreground overflow-x-auto">
                    {`const response = await fetch("http://localhost:8080/customers", {
  headers: {
    "x-api-key": "${createdKey.secretKey}",
    "Accept": "application/json"
  }
});
const data = await response.json();`}
                  </pre>
                </TabsContent>

                <TabsContent value="python" className="mt-2">
                  <pre className="p-3 rounded-lg border border-border/50 bg-muted/40 font-mono text-xs text-foreground overflow-x-auto">
                    {`import requests

headers = {
    "x-api-key": "${createdKey.secretKey}",
    "Accept": "application/json"
}
response = requests.get("http://localhost:8080/customers", headers=headers)
print(response.json())`}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-border/40">
          {step === 4 ? (
            <Button
              type="button"
              onClick={handleClose}
              className="w-full font-mono text-xs"
            >
              Done & Close
            </Button>
          ) : (
            <>
              <div>
                {step > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep((s) => s - 1)}
                    className="font-mono text-xs gap-1.5"
                  >
                    <RiArrowLeftLine className="size-4" /> Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>

                {step < 3 ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setStep((s) => s + 1)}
                    className="font-mono text-xs gap-1.5"
                  >
                    Next <RiArrowRightLine className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={loading}
                    onClick={handleGenerate}
                    className="font-mono text-xs gap-1.5"
                  >
                    {loading ? (
                      <RiLoader4Line className="size-4 animate-spin" />
                    ) : (
                      <RiShieldCheckLine className="size-4" />
                    )}
                    Generate Secret Key
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
