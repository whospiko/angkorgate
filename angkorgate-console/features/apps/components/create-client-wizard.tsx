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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  RiAddLine,
  RiLoader4Line,
  RiShieldKeyholeLine,
  RiGlobalLine,
  RiCheckLine,
  RiFileCopyLine,
  RiUploadCloudLine,
  RiInformationLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
} from "@remixicon/react"
import { createAppAction } from "../server/apps-actions"
import type { Scope } from "@/features/scopes"
import type { KeycloakClientExport } from "../types/apps.types"

interface CreateClientWizardProps {
  availableScopes?: Scope[]
}

export function CreateClientWizard({ availableScopes = [] }: CreateClientWizardProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: General Settings
  const [appCode, setAppCode] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  // Step 2: Capability Config
  const [isPublicClient, setIsPublicClient] = useState(false) // Client authentication (false = Confidential)
  const [standardFlowEnabled, setStandardFlowEnabled] = useState(true) // Auth code
  const [directAccessGrantsEnabled, setDirectAccessGrantsEnabled] = useState(false) // Password
  const [serviceAccountsEnabled, setServiceAccountsEnabled] = useState(false) // M2M client_credentials
  const [requirePkce, setRequirePkce] = useState(true)

  // Step 3: Login Settings
  const [rootUrl, setRootUrl] = useState("")
  const [homeUrl, setHomeUrl] = useState("")
  const [redirectUris, setRedirectUris] = useState("http://localhost:5173/callback")
  const [postLogoutUris, setPostLogoutUris] = useState("")
  const [webOrigins, setWebOrigins] = useState("")

  // Step 4: Scopes
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>(
    availableScopes.filter((s) => s.isDefault).map((s) => s.id)
  )

  // JSON Import Dialog
  const [importOpen, setImportOpen] = useState(false)
  const [importJson, setImportJson] = useState("")
  const [importError, setImportError] = useState<string | null>(null)

  // Success Screen
  const [createdData, setCreatedData] = useState<{
    appCode: string
    name: string
    clientSecret?: string | null
    isPublic: boolean
  } | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const handleImportJson = () => {
    try {
      setImportError(null)
      const parsed: KeycloakClientExport = JSON.parse(importJson)
      if (!parsed.clientId) {
        throw new Error("Missing 'clientId' property in JSON")
      }
      setAppCode(parsed.clientId.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
      setName(parsed.name || parsed.clientId)
      setDescription(parsed.description || "")
      if (parsed.rootUrl) setRootUrl(parsed.rootUrl)
      if (parsed.baseUrl) setHomeUrl(parsed.baseUrl)
      if (parsed.redirectUris && parsed.redirectUris.length > 0) {
        setRedirectUris(parsed.redirectUris.join("\n"))
      }
      if (parsed.webOrigins && parsed.webOrigins.length > 0) {
        setWebOrigins(parsed.webOrigins.join("\n"))
      }
      if (parsed.publicClient !== undefined) {
        setIsPublicClient(parsed.publicClient)
      }
      if (parsed.standardFlowEnabled !== undefined) {
        setStandardFlowEnabled(parsed.standardFlowEnabled)
      }
      if (parsed.directAccessGrantsEnabled !== undefined) {
        setDirectAccessGrantsEnabled(parsed.directAccessGrantsEnabled)
      }
      if (parsed.serviceAccountsEnabled !== undefined) {
        setServiceAccountsEnabled(parsed.serviceAccountsEnabled)
      }
      setImportOpen(false)
      setImportJson("")
    } catch (err: any) {
      setImportError(err.message || "Invalid JSON format")
    }
  }

  const toggleScope = (scopeId: string) => {
    setSelectedScopeIds((prev) =>
      prev.includes(scopeId) ? prev.filter((id) => id !== scopeId) : [...prev, scopeId]
    )
  }

  const handleNext = () => {
    setError(null)
    if (step === 1) {
      if (!appCode.trim()) {
        setError("Client ID (appCode) is required")
        return
      }
      if (!name.trim()) {
        setError("Name is required")
        return
      }
      const regex = /^[a-z][a-z0-9-]{1,49}$/
      if (!regex.test(appCode)) {
        setError("Client ID must be lowercase kebab-case (2-50 chars, e.g. 'clinic-app')")
        return
      }
    }
    setStep((s) => Math.min(s + 1, 4))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    const parseList = (text: string) =>
      text
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)

    const res = await createAppAction({
      appCode: appCode.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      rootUrl: rootUrl.trim() || undefined,
      homeUrl: homeUrl.trim() || undefined,
      validRedirectUris: parseList(redirectUris),
      validPostLogoutRedirectUris: parseList(postLogoutUris),
      webOrigins: parseList(webOrigins),
      isPublicClient,
      standardFlowEnabled,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled,
      serviceAccountsEnabled,
      requirePkce,
      scopeIds: selectedScopeIds,
      oauthEnabled: true,
      enabledProviders: ["google", "apple"],
      passwordLoginEnabled: true,
      registrationEnabled: true,
      emailVerificationRequired: true,
    })

    setLoading(false)
    if (res.success && res.data) {
      setCreatedData({
        appCode: res.data.appCode,
        name: res.data.name,
        clientSecret: res.data.clientSecret,
        isPublic: res.data.isPublicClient,
      })
    } else {
      setError(res.message || "Failed to register client application")
    }
  }

  const resetForm = () => {
    setStep(1)
    setAppCode("")
    setName("")
    setDescription("")
    setIsPublicClient(false)
    setStandardFlowEnabled(true)
    setDirectAccessGrantsEnabled(false)
    setServiceAccountsEnabled(false)
    setRequirePkce(true)
    setRootUrl("")
    setHomeUrl("")
    setRedirectUris("http://localhost:5173/callback")
    setPostLogoutUris("")
    setWebOrigins("")
    setSelectedScopeIds(availableScopes.filter((s) => s.isDefault).map((s) => s.id))
    setCreatedData(null)
    setError(null)
  }

  const copySecret = () => {
    if (createdData?.clientSecret) {
      navigator.clipboard.writeText(createdData.clientSecret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) resetForm()
        }}
      >
        <DialogTrigger
          render={
            <Button size="sm" className="font-mono gap-1.5 shadow-sm">
              <RiAddLine className="size-4" /> Register Client
            </Button>
          }
        />
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {createdData ? (
            // Success Screen
            <div className="space-y-4 py-2 font-mono text-xs">
              <DialogHeader>
                <div className="flex items-center gap-2 text-emerald-500 mb-1">
                  <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <RiCheckLine className="size-5" />
                  </div>
                  <DialogTitle className="font-heading text-lg text-foreground">
                    Client Registered Successfully
                  </DialogTitle>
                </div>
                <DialogDescription className="font-mono text-xs text-muted-foreground">
                  The client application <strong>{createdData.name}</strong> is now live in AngkorGate OIDC Provider.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Client ID</span>
                  <span className="font-bold text-foreground text-sm">{createdData.appCode}</span>
                </div>

                {!createdData.isPublic && (
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">
                      Client Secret (Confidential)
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-background border border-border/60 rounded px-2.5 py-1.5 font-mono text-xs text-primary truncate select-all">
                        {showSecret ? createdData.clientSecret : "•".repeat(32)}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => setShowSecret(!showSecret)}
                        title={showSecret ? "Hide secret" : "Reveal secret"}
                      >
                        {showSecret ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 font-mono text-xs shrink-0"
                        onClick={copySecret}
                      >
                        {secretCopied ? (
                          <>
                            <RiCheckLine className="size-3.5 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <RiFileCopyLine className="size-3.5" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="rounded border border-amber-500/20 bg-amber-500/10 p-2.5 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400 font-sans">
                  <RiInformationLine className="size-4 shrink-0 mt-0.5" />
                  <span>
                    Store this client secret securely in your backend environment variables. It will not be shown in plain text again unless regenerated.
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  className="w-full font-mono text-xs"
                  onClick={() => {
                    setOpen(false)
                    resetForm()
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            // Wizard Flow
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="font-heading text-lg">Register Client Application</DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-mono text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setImportOpen(true)}
                  >
                    <RiUploadCloudLine className="size-3.5" /> Import JSON
                  </Button>
                </div>
                <DialogDescription className="font-mono text-xs">
                  Create an OpenID Connect & OAuth 2.0 client configuration.
                </DialogDescription>
              </DialogHeader>

              {/* Step indicator */}
              <div className="grid grid-cols-4 gap-2 py-4 border-b border-border/40 my-3 font-mono text-[11px]">
                <div
                  className={`pb-1 border-b-2 transition-colors ${
                    step >= 1 ? "border-primary text-foreground font-semibold" : "border-muted text-muted-foreground"
                  }`}
                >
                  1. General
                </div>
                <div
                  className={`pb-1 border-b-2 transition-colors ${
                    step >= 2 ? "border-primary text-foreground font-semibold" : "border-muted text-muted-foreground"
                  }`}
                >
                  2. Capability
                </div>
                <div
                  className={`pb-1 border-b-2 transition-colors ${
                    step >= 3 ? "border-primary text-foreground font-semibold" : "border-muted text-muted-foreground"
                  }`}
                >
                  3. URLs
                </div>
                <div
                  className={`pb-1 border-b-2 transition-colors ${
                    step >= 4 ? "border-primary text-foreground font-semibold" : "border-muted text-muted-foreground"
                  }`}
                >
                  4. Scopes
                </div>
              </div>

              {error && (
                <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
                  {error}
                </div>
              )}

              {/* Step 1: General Settings */}
              {step === 1 && (
                <div className="space-y-4 py-2 font-mono text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="appCode">
                      Client ID (appCode) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="appCode"
                      placeholder="e.g. clinic-portal, pos-terminal"
                      value={appCode}
                      onChange={(e) => setAppCode(e.target.value.toLowerCase().trim())}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground font-sans">
                      Unique identifier passed as <code className="text-primary font-mono">client_id</code> in OAuth authorization requests.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="name">
                      Client Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g. Clinic Production Web App"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Optional notes or team ownership"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Capability Config */}
              {step === 2 && (
                <div className="space-y-4 py-2 font-mono text-xs">
                  <div className="rounded-lg border border-border/60 bg-card p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          {isPublicClient ? (
                            <RiGlobalLine className="size-4 text-emerald-500" />
                          ) : (
                            <RiShieldKeyholeLine className="size-4 text-primary" />
                          )}
                          Client Authentication
                        </Label>
                        <p className="text-[11px] text-muted-foreground font-sans">
                          {isPublicClient
                            ? "OFF (Public Client) — For Single Page Apps (React/Vue) or Mobile. No secret required."
                            : "ON (Confidential Client) — For secure backends (NestJS, Node, Python). Generates client_secret."}
                        </p>
                      </div>
                      <Switch
                        checked={!isPublicClient}
                        onCheckedChange={(checked) => setIsPublicClient(!checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold">Standard Flow (Authorization Code)</Label>
                        <p className="text-[11px] text-muted-foreground font-sans">
                          Recommended standard OIDC redirect login flow with code exchange.
                        </p>
                      </div>
                      <Switch checked={standardFlowEnabled} onCheckedChange={setStandardFlowEnabled} />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold">Direct Access Grants (Resource Owner Password)</Label>
                        <p className="text-[11px] text-muted-foreground font-sans">
                          Exchanges username and password directly for tokens at the token endpoint.
                        </p>
                      </div>
                      <Switch
                        checked={directAccessGrantsEnabled}
                        onCheckedChange={setDirectAccessGrantsEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold">Service Accounts (Client Credentials)</Label>
                        <p className="text-[11px] text-muted-foreground font-sans">
                          Allows machine-to-machine cron jobs and microservices to authenticate without user login.
                        </p>
                      </div>
                      <Switch
                        checked={serviceAccountsEnabled}
                        onCheckedChange={setServiceAccountsEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold">Require PKCE</Label>
                        <p className="text-[11px] text-muted-foreground font-sans">
                          Mandates Proof Key for Code Exchange (RFC 7636) to prevent authorization code interception.
                        </p>
                      </div>
                      <Switch checked={requirePkce} onCheckedChange={setRequirePkce} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Login Settings & URLs */}
              {step === 3 && (
                <div className="space-y-4 py-2 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="rootUrl">Root URL</Label>
                      <Input
                        id="rootUrl"
                        placeholder="https://app.example.com"
                        value={rootUrl}
                        onChange={(e) => setRootUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="homeUrl">Home URL</Label>
                      <Input
                        id="homeUrl"
                        placeholder="https://app.example.com/home"
                        value={homeUrl}
                        onChange={(e) => setHomeUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="redirectUris">
                      Valid Redirect URIs <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="redirectUris"
                      rows={3}
                      placeholder="http://localhost:5173/callback&#10;https://app.example.com/auth/callback"
                      value={redirectUris}
                      onChange={(e) => setRedirectUris(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground font-sans">
                      One URI per line. Wildcards are supported (e.g. <code className="text-primary font-mono">http://localhost:5173/*</code>).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="postLogoutUris">Valid Post-Logout Redirect URIs</Label>
                    <Input
                      id="postLogoutUris"
                      placeholder="http://localhost:5173/logged-out"
                      value={postLogoutUris}
                      onChange={(e) => setPostLogoutUris(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="webOrigins">Web Origins (CORS)</Label>
                    <Input
                      id="webOrigins"
                      placeholder="http://localhost:5173, https://app.example.com"
                      value={webOrigins}
                      onChange={(e) => setWebOrigins(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Client Scopes */}
              {step === 4 && (
                <div className="space-y-3 py-2 font-mono text-xs">
                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/40 font-sans text-xs text-muted-foreground">
                    Select the scopes this client is authorized to request. Scopes filter which user claims and RBAC roles are embedded in the access and ID tokens.
                  </div>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {availableScopes.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center">No custom scopes found. Default system scopes will apply.</p>
                    ) : (
                      availableScopes.map((scope) => {
                        const isSelected = selectedScopeIds.includes(scope.id)
                        return (
                          <div
                            key={scope.id}
                            onClick={() => toggleScope(scope.id)}
                            className={`flex items-start justify-between p-2.5 rounded-lg border cursor-pointer select-none transition-colors ${
                              isSelected
                                ? "border-primary/50 bg-primary/5"
                                : "border-border/50 hover:bg-muted/30"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{scope.name}</span>
                                {scope.isDefault && (
                                  <Badge variant="outline" className="text-[10px] font-mono py-0">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground font-sans line-clamp-1">
                                {scope.description || scope.displayName}
                              </p>
                              {scope.claims && scope.claims.length > 0 && (
                                <div className="flex gap-1 flex-wrap pt-0.5">
                                  {scope.claims.map((claim) => (
                                    <span
                                      key={claim}
                                      className="text-[10px] bg-muted px-1.5 py-0.2 rounded border border-border/40"
                                    >
                                      {claim}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div
                              className={`size-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {isSelected && <RiCheckLine className="size-3" />}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Footer */}
              <DialogFooter className="flex justify-between items-center sm:justify-between pt-4 border-t border-border/40 mt-4">
                <div>
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs gap-1"
                      onClick={() => setStep((s) => Math.max(s - 1, 1))}
                      disabled={loading}
                    >
                      <RiArrowLeftLine className="size-3.5" /> Back
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => {
                      setOpen(false)
                      resetForm()
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>

                  {step < 4 ? (
                    <Button
                      type="button"
                      size="sm"
                      className="font-mono text-xs gap-1"
                      onClick={handleNext}
                    >
                      Next <RiArrowRightLine className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="font-mono text-xs gap-1.5"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <RiLoader4Line className="size-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        "Create Client"
                      )}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Keycloak JSON Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">Import Keycloak Client JSON</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Paste the exported Keycloak client JSON representation below to prefill all configuration fields.
            </DialogDescription>
          </DialogHeader>

          {importError && (
            <div className="text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 text-xs">
              {importError}
            </div>
          )}

          <Textarea
            rows={8}
            placeholder={`{\n  "clientId": "clinic-portal",\n  "name": "Clinic Portal",\n  "rootUrl": "https://clinic.example.com",\n  "redirectUris": ["https://clinic.example.com/*"]\n}`}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            className="font-mono text-xs"
          />

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleImportJson}>
              Prefill Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
