"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  RiShieldKeyholeLine,
  RiGlobalLine,
  RiRefreshLine,
  RiFileCopyLine,
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiCodeSSlashLine,
  RiDownloadLine,
  RiSparklingLine,
  RiTimeLine,
  RiLoader4Line,
  RiSettings4Line,
  RiKey2Line,
  RiShieldCheckLine,
  RiSearchLine,
  RiLockPasswordLine,
  RiCpuLine,
  RiExternalLinkLine,
  RiCheckboxCircleFill,
} from "@remixicon/react"
import type { AppSetting, KeycloakClientExport } from "../types/apps.types"
import type { Scope } from "@/features/scopes"
import {
  updateAppAction,
  regenerateSecretAction,
  updateAppScopesAction,
} from "../server/apps-actions"

interface ClientDetailSheetProps {
  app: AppSetting | null
  open: boolean
  onOpenChange: (open: boolean) => void
  availableScopes?: Scope[]
}

export function ClientDetailSheet({
  app,
  open,
  onOpenChange,
  availableScopes = [],
}: ClientDetailSheetProps) {
  if (!app) return null

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>("settings")

  // Tab 1: Settings Form State
  const [name, setName] = useState(app.name)
  const [description, setDescription] = useState(app.description || "")
  const [rootUrl, setRootUrl] = useState(app.rootUrl || "")
  const [homeUrl, setHomeUrl] = useState(app.homeUrl || "")
  const [redirectUris, setRedirectUris] = useState(
    (app.validRedirectUris || app.allowedRedirectUrls || []).join("\n")
  )
  const [postLogoutUris, setPostLogoutUris] = useState(
    (app.validPostLogoutRedirectUris || []).join("\n")
  )
  const [webOrigins, setWebOrigins] = useState((app.webOrigins || []).join("\n"))
  const [standardFlowEnabled, setStandardFlowEnabled] = useState(app.standardFlowEnabled)
  const [directAccessGrantsEnabled, setDirectAccessGrantsEnabled] = useState(app.directAccessGrantsEnabled)
  const [serviceAccountsEnabled, setServiceAccountsEnabled] = useState(app.serviceAccountsEnabled)
  const [requirePkce, setRequirePkce] = useState(app.requirePkce)
  const [isPublicClient, setIsPublicClient] = useState(app.isPublicClient)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState(false)

  // Tab 2: Credentials State
  const [currentSecret, setCurrentSecret] = useState(app.clientSecret || "")
  const [secondarySecret, setSecondarySecret] = useState(app.secondaryClientSecret || "")
  const [secondaryExpires, setSecondaryExpires] = useState(app.secondarySecretExpiresAt || null)
  const [showSecret, setShowSecret] = useState(false)
  const [secretCopied, setSecretCopied] = useState(false)
  const [graceHours, setGraceHours] = useState(24)
  const [regenerating, setRegenerating] = useState(false)

  // Tab 3: Scopes State
  const [assignedScopeIds, setAssignedScopeIds] = useState<string[]>(
    app.allowedScopes?.map((s) => s.id) || []
  )
  const [savingScopes, setSavingScopes] = useState(false)
  const [scopesSuccess, setScopesSuccess] = useState(false)
  const [scopeSearch, setScopeSearch] = useState("")

  // Tab 4: Quickstart SDK selection
  const [sdkType, setSdkType] = useState<"nextauth" | "nestjs" | "react" | "curl">("nextauth")
  const [codeCopied, setCodeCopied] = useState(false)

  // Tab 5: Redirect Simulator
  const [simUrl, setSimUrl] = useState("")
  const [simResult, setSimResult] = useState<{ match: boolean; pattern?: string } | null>(null)

  // Tab 6: Export Keycloak JSON
  const [exportCopied, setExportCopied] = useState(false)

  // Sync state whenever selected app changes
  useEffect(() => {
    if (!app) return
    setName(app.name)
    setDescription(app.description || "")
    setRootUrl(app.rootUrl || "")
    setHomeUrl(app.homeUrl || "")
    setRedirectUris((app.validRedirectUris || app.allowedRedirectUrls || []).join("\n"))
    setPostLogoutUris((app.validPostLogoutRedirectUris || []).join("\n"))
    setWebOrigins((app.webOrigins || []).join("\n"))
    setStandardFlowEnabled(app.standardFlowEnabled)
    setDirectAccessGrantsEnabled(app.directAccessGrantsEnabled)
    setServiceAccountsEnabled(app.serviceAccountsEnabled)
    setRequirePkce(app.requirePkce)
    setIsPublicClient(app.isPublicClient)
    setCurrentSecret(app.clientSecret || "")
    setSecondarySecret(app.secondaryClientSecret || "")
    setSecondaryExpires(app.secondarySecretExpiresAt || null)
    setAssignedScopeIds(app.allowedScopes?.map((s) => s.id) || [])
    setShowSecret(false)
    setSimResult(null)
  }, [app])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    setSettingsSuccess(false)
    const parseList = (text: string) =>
      text
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)

    const res = await updateAppAction(app.appCode, {
      name,
      description: description || undefined,
      rootUrl: rootUrl || undefined,
      homeUrl: homeUrl || undefined,
      validRedirectUris: parseList(redirectUris),
      validPostLogoutRedirectUris: parseList(postLogoutUris),
      webOrigins: parseList(webOrigins),
      standardFlowEnabled,
      directAccessGrantsEnabled,
      serviceAccountsEnabled,
      requirePkce,
      isPublicClient,
    })

    setSavingSettings(false)
    if (res.success) {
      setSettingsSuccess(true)
      setTimeout(() => setSettingsSuccess(false), 2500)
    }
  }

  const handleRegenerate = async () => {
    if (
      !confirm(
        `Regenerate secret with a ${graceHours}-hour grace period? Existing services can use the old secret during the grace period.`
      )
    )
      return

    setRegenerating(true)
    const res = await regenerateSecretAction(app.appCode, graceHours)
    setRegenerating(false)
    if (res.success && res.clientSecret) {
      setCurrentSecret(res.clientSecret)
      setSecondarySecret(res.secondaryClientSecret || "")
      setSecondaryExpires(res.secondarySecretExpiresAt || null)
      setShowSecret(true)
    }
  }

  const toggleScope = (scopeId: string) => {
    setAssignedScopeIds((prev) =>
      prev.includes(scopeId) ? prev.filter((id) => id !== scopeId) : [...prev, scopeId]
    )
  }

  const handleSaveScopes = async () => {
    setSavingScopes(true)
    setScopesSuccess(false)
    const res = await updateAppScopesAction(app.appCode, assignedScopeIds)
    setSavingScopes(false)
    if (res.success) {
      setScopesSuccess(true)
      setTimeout(() => setScopesSuccess(false), 2500)
    }
  }

  const handleSimulateRedirect = () => {
    if (!simUrl.trim()) return
    const activeUris = redirectUris
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)

    const match = activeUris.find((pattern) => {
      if (pattern === simUrl) return true
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2)
        return simUrl.startsWith(prefix)
      }
      return false
    })

    setSimResult({
      match: Boolean(match),
      pattern: match,
    })
  }

  const keycloakExportJson: KeycloakClientExport = {
    clientId: app.appCode,
    name,
    description: description || undefined,
    rootUrl: rootUrl || undefined,
    baseUrl: homeUrl || undefined,
    redirectUris: redirectUris.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
    webOrigins: webOrigins.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
    publicClient: isPublicClient,
    standardFlowEnabled,
    directAccessGrantsEnabled,
    serviceAccountsEnabled,
  }

  const getSnippets = () => {
    const issuer = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080"
    const secretStr = currentSecret || "YOUR_CLIENT_SECRET"

    switch (sdkType) {
      case "nextauth":
        return `// NextAuth.js / Auth.js v5 Provider Setup
import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "angkorgate",
      name: "AngkorGate",
      type: "oidc",
      issuer: "${issuer}/oidc",
      clientId: "${app.appCode}",
      clientSecret: "${secretStr}",
      authorization: {
        params: {
          scope: "openid profile email roles",
        },
      },
    },
  ],
});`
      case "nestjs":
        return `// NestJS Passport OIDC Strategy
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Issuer } from 'openid-client';

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  constructor() {
    const issuer = new Issuer({
      issuer: '${issuer}/oidc',
      authorization_endpoint: '${issuer}/oidc/auth',
      token_endpoint: '${issuer}/oidc/token',
      userinfo_endpoint: '${issuer}/oidc/me',
      jwks_uri: '${issuer}/oidc/jwks',
    });

    super({
      client: new issuer.Client({
        client_id: '${app.appCode}',
        client_secret: '${secretStr}',
        redirect_uris: ['${(app.validRedirectUris || [])[0] || "http://localhost:4000/callback"}'],
        response_types: ['code'],
      }),
      params: {
        scope: 'openid profile email roles',
      },
    });
  }
}`
      case "react":
        return `// React SPA Setup (oidc-client-ts)
import { UserManager } from "oidc-client-ts";

export const userManager = new UserManager({
  authority: "${issuer}/oidc",
  client_id: "${app.appCode}",
  redirect_uri: "${(app.validRedirectUris || [])[0] || "http://localhost:5173/callback"}",
  response_type: "code",
  scope: "openid profile email roles",
  post_logout_redirect_uri: "${(app.validPostLogoutRedirectUris || [])[0] || "http://localhost:5173"}",
});`
      case "curl":
        return `# Token Endpoint Exchange (Resource Owner or Client Credentials)
curl -X POST "${issuer}/oidc/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -u "${app.appCode}:${secretStr}" \\
  -d "grant_type=client_credentials&scope=openid roles"`
    }
  }

  const filteredScopes = availableScopes.filter((s) => {
    if (!scopeSearch) return true
    const q = scopeSearch.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.displayName && s.displayName.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      s.claims?.some((c) => c.toLowerCase().includes(q))
    )
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl p-0 flex flex-col font-mono text-xs overflow-hidden h-full">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-border/40 bg-card shrink-0 pr-14">
          <SheetHeader>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-muted/80 border border-border/60 font-bold text-foreground">
                {app.appCode}
              </span>
              <Badge
                variant={isPublicClient ? "secondary" : "outline"}
                className={`font-mono text-[10px] gap-1 px-2 py-0.5 ${
                  isPublicClient
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-primary/40 bg-primary/10 text-primary"
                }`}
              >
                {isPublicClient ? (
                  <>
                    <RiGlobalLine className="size-3 text-emerald-400" /> Public SPA
                  </>
                ) : (
                  <>
                    <RiShieldKeyholeLine className="size-3 text-primary" /> Confidential
                  </>
                )}
              </Badge>
              {requirePkce && (
                <Badge variant="outline" className="font-mono text-[10px] border-border/60 text-muted-foreground">
                  PKCE S256
                </Badge>
              )}
              {standardFlowEnabled && (
                <Badge variant="outline" className="font-mono text-[10px] border-border/60 text-muted-foreground">
                  Auth Code
                </Badge>
              )}
              {serviceAccountsEnabled && (
                <Badge variant="outline" className="font-mono text-[10px] border-border/60 text-muted-foreground">
                  M2M
                </Badge>
              )}
            </div>
            <SheetTitle className="font-heading text-lg sm:text-xl font-bold mt-2 text-foreground tracking-tight">
              {name || app.name}
            </SheetTitle>
            <SheetDescription className="font-sans text-xs text-muted-foreground line-clamp-1">
              {description || "OIDC Client Configuration & Security Policy"}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 border-b border-border/40 bg-muted/20 overflow-x-auto scrollbar-none shrink-0">
            <TabsList className="bg-transparent h-11 p-0 gap-1 sm:gap-1.5 border-none inline-flex min-w-full sm:min-w-0">
              <TabsTrigger
                value="settings"
                className="font-mono text-xs px-2.5 sm:px-3 py-1.5 rounded-md data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <RiSettings4Line className="size-3.5" />
                <span>Settings</span>
              </TabsTrigger>
              <TabsTrigger
                value="credentials"
                className="font-mono text-xs px-2.5 sm:px-3 py-1.5 rounded-md data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <RiKey2Line className="size-3.5" />
                <span>Credentials</span>
              </TabsTrigger>
              <TabsTrigger
                value="scopes"
                className="font-mono text-xs px-2.5 sm:px-3 py-1.5 rounded-md data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <RiShieldCheckLine className="size-3.5" />
                <span>Client Scopes</span>
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-muted border border-border/40 text-[10px]">
                  {assignedScopeIds.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="quickstart"
                className="font-mono text-xs px-2.5 sm:px-3 py-1.5 rounded-md data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <RiCodeSSlashLine className="size-3.5" />
                <span>SDK Snippets</span>
              </TabsTrigger>
              <TabsTrigger
                value="simulator"
                className="font-mono text-xs px-2.5 sm:px-3 py-1.5 rounded-md data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <RiSparklingLine className="size-3.5" />
                <span>Simulator</span>
              </TabsTrigger>
              <TabsTrigger
                value="export"
                className="font-mono text-xs px-2.5 sm:px-3 py-1.5 rounded-md data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <RiDownloadLine className="size-3.5" />
                <span>JSON Export</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* TAB 1: SETTINGS */}
            <TabsContent value="settings" className="m-0 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-heading text-sm font-semibold text-foreground">General Settings</h4>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name" className="text-xs text-muted-foreground">
                      Client Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="edit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Frontend Web App"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-desc" className="text-xs text-muted-foreground">
                      Description
                    </Label>
                    <Input
                      id="edit-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief summary of what this client application does"
                    />
                  </div>
                </div>
              </div>

              {/* Endpoints & URIs */}
              <div className="space-y-4 border-t border-border/40 pt-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading text-sm font-semibold text-foreground">Endpoints & Redirect Routing</h4>
                  <span className="text-[11px] text-muted-foreground font-sans">RFC 6749 compliant</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-root" className="text-xs text-muted-foreground">Root URL</Label>
                    <Input
                      id="edit-root"
                      value={rootUrl}
                      onChange={(e) => setRootUrl(e.target.value)}
                      placeholder="https://app.example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-home" className="text-xs text-muted-foreground">Home URL</Label>
                    <Input
                      id="edit-home"
                      value={homeUrl}
                      onChange={(e) => setHomeUrl(e.target.value)}
                      placeholder="https://app.example.com/dashboard"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-redirect" className="text-xs text-muted-foreground">
                      Valid Redirect URIs
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-sans">One URI per line</span>
                  </div>
                  <Textarea
                    id="edit-redirect"
                    rows={3}
                    value={redirectUris}
                    onChange={(e) => setRedirectUris(e.target.value)}
                    placeholder={"https://app.example.com/api/auth/callback\nhttp://localhost:5173/callback"}
                  />
                  <p className="text-[11px] text-muted-foreground/80 font-sans">
                    Callback endpoints authorized for authorization code exchange. Wildcards allowed for dev (e.g. <code>http://localhost:*</code>).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-logout" className="text-xs text-muted-foreground">
                      Valid Post-Logout Redirect URIs
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-sans">One URI per line</span>
                  </div>
                  <Textarea
                    id="edit-logout"
                    rows={2}
                    value={postLogoutUris}
                    onChange={(e) => setPostLogoutUris(e.target.value)}
                    placeholder={"https://app.example.com/login\nhttp://localhost:5173"}
                  />
                  <p className="text-[11px] text-muted-foreground/80 font-sans">
                    Destination addresses where users may be navigated after initiating OpenID RP-Logout.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-origins" className="text-xs text-muted-foreground">
                    Web Origins (CORS)
                  </Label>
                  <Input
                    id="edit-origins"
                    value={webOrigins}
                    onChange={(e) => setWebOrigins(e.target.value)}
                    placeholder="https://app.example.com, or + to inherit redirect URIs"
                  />
                  <p className="text-[11px] text-muted-foreground/80 font-sans">
                    Allowed CORS origins for cross-domain browser token requests. Use <code>+</code> to auto-derive from valid redirect URIs.
                  </p>
                </div>
              </div>

              {/* Capabilities & Flows */}
              <div className="space-y-4 border-t border-border/40 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground">OAuth 2.0 & OIDC Flows</h4>
                    <p className="text-[11px] text-muted-foreground font-sans">
                      Toggle granted grant types and cryptographic enforcement protocols.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/60 bg-card/60 gap-3 hover:border-border transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                        <RiShieldKeyholeLine className="size-3.5 text-primary" />
                        <span>Client Authentication (Confidential)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                        Requires <code>client_secret</code> when exchanging codes. Disable for browser SPAs or mobile apps.
                      </p>
                    </div>
                    <Switch
                      checked={!isPublicClient}
                      onCheckedChange={(c) => setIsPublicClient(!c)}
                    />
                  </div>

                  <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/60 bg-card/60 gap-3 hover:border-border transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                        <RiGlobalLine className="size-3.5 text-primary" />
                        <span>Standard Flow (Authorization Code)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                        OAuth 2.0 authorization code flow for browser redirect logins.
                      </p>
                    </div>
                    <Switch
                      checked={standardFlowEnabled}
                      onCheckedChange={setStandardFlowEnabled}
                    />
                  </div>

                  <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/60 bg-card/60 gap-3 hover:border-border transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                        <RiLockPasswordLine className="size-3.5 text-primary" />
                        <span>Direct Access Grants</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                        Direct username/password token exchange. Restricted to first-party apps.
                      </p>
                    </div>
                    <Switch
                      checked={directAccessGrantsEnabled}
                      onCheckedChange={setDirectAccessGrantsEnabled}
                    />
                  </div>

                  <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/60 bg-card/60 gap-3 hover:border-border transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                        <RiCpuLine className="size-3.5 text-primary" />
                        <span>Service Accounts (M2M)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                        Client credentials grant for backend daemons and automated microservices.
                      </p>
                    </div>
                    <Switch
                      checked={serviceAccountsEnabled}
                      onCheckedChange={setServiceAccountsEnabled}
                    />
                  </div>

                  <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/60 bg-card/60 gap-3 hover:border-border transition-colors col-span-1 md:col-span-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                        <RiShieldCheckLine className="size-3.5 text-emerald-500" />
                        <span>Enforce PKCE (Proof Key for Code Exchange)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                        Enforces RFC 7636 <code>code_challenge</code> and S256 verification on all authorization code exchanges. Strongly recommended.
                      </p>
                    </div>
                    <Switch
                      checked={requirePkce}
                      onCheckedChange={setRequirePkce}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: CREDENTIALS */}
            <TabsContent value="credentials" className="m-0 space-y-5">
              <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card/60 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground">Active Client Secret</h4>
                    <p className="text-[11px] text-muted-foreground font-sans">
                      Cryptographic secret used for HTTP Basic Authentication and token exchange.
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    HS256 / Basic Auth
                  </Badge>
                </div>

                {isPublicClient ? (
                  <div className="p-4 rounded-lg bg-muted/40 border border-border/50 text-muted-foreground font-sans text-xs space-y-2">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <RiGlobalLine className="size-4 text-emerald-500" />
                      Public SPA Security Model
                    </div>
                    <p className="leading-relaxed">
                      This application is marked as a <strong>Public Client</strong> (Single Page Application or Mobile Client). Public clients cannot securely store credentials in browser or mobile binaries; thus client secrets are disabled and PKCE (RFC 7636) is enforced instead.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 bg-black/40 border border-border/60 rounded-md px-3.5 py-2 font-mono text-xs text-primary truncate select-all">
                      {showSecret ? currentSecret : "•".repeat(32)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9 shrink-0"
                        title={showSecret ? "Hide secret" : "Reveal secret"}
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 font-mono text-xs shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(currentSecret)
                          setSecretCopied(true)
                          setTimeout(() => setSecretCopied(false), 2000)
                        }}
                      >
                        {secretCopied ? <RiCheckLine className="size-3.5 text-emerald-500" /> : <RiFileCopyLine className="size-3.5" />}
                        {secretCopied ? "Copied" : "Copy Secret"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Secondary Secret Grace Window */}
              {secondarySecret && (
                <div className="p-4 sm:p-5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                      <RiTimeLine className="size-4" /> Expiring Secondary Secret (Grace Period)
                    </div>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                      Active until {secondaryExpires ? new Date(secondaryExpires).toLocaleTimeString() : "24h"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                    Existing microservices and active tokens using this key will continue to authenticate uninterrupted until the grace window elapses.
                  </p>
                  <div className="bg-black/30 border border-border/50 rounded-md px-3 py-1.5 font-mono text-xs text-muted-foreground truncate select-all">
                    {secondarySecret}
                  </div>
                </div>
              )}

              {/* Secret Regeneration Panel */}
              {!isPublicClient && (
                <div className="p-4 sm:p-5 rounded-lg border border-border/50 bg-muted/20 space-y-3.5">
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground">Zero-Downtime Secret Rotation</h4>
                    <p className="text-[11px] text-muted-foreground font-sans mt-0.5 leading-relaxed">
                      Rotate your client secret seamlessly without interrupting live traffic. The current key transitions into an expiring secondary secret for your selected grace period.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="grace-select" className="text-xs shrink-0 text-muted-foreground">
                        Grace Window:
                      </Label>
                      <select
                        id="grace-select"
                        value={graceHours}
                        onChange={(e) => setGraceHours(Number(e.target.value))}
                        className="bg-card border border-border/60 rounded-md px-3 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary"
                      >
                        <option value={1}>1 hour</option>
                        <option value={12}>12 hours</option>
                        <option value={24}>24 hours (Recommended)</option>
                        <option value={48}>48 hours</option>
                      </select>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="font-mono text-xs gap-1.5"
                      onClick={handleRegenerate}
                      disabled={regenerating}
                    >
                      {regenerating ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiRefreshLine className="size-3.5" />}
                      Rotate Secret
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: CLIENT SCOPES */}
            <TabsContent value="scopes" className="m-0 space-y-4">
              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 text-[11px] font-sans text-muted-foreground leading-relaxed">
                Assigned scopes control which user claims and RBAC permissions are minted into Access and ID tokens issued for this client application.
              </div>

              {/* Search filter */}
              <div className="relative">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
                <Input
                  value={scopeSearch}
                  onChange={(e) => setScopeSearch(e.target.value)}
                  placeholder="Filter scopes by name, description, or claims..."
                  className="pl-9"
                />
              </div>

              {/* Scopes list */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredScopes.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground font-sans text-xs border border-dashed border-border/60 rounded-lg">
                    No scopes match your search filter.
                  </div>
                ) : (
                  filteredScopes.map((scope) => {
                    const isAssigned = assignedScopeIds.includes(scope.id)
                    return (
                      <div
                        key={scope.id}
                        onClick={() => toggleScope(scope.id)}
                        className={`flex items-start justify-between p-3.5 rounded-lg border cursor-pointer select-none transition-all ${
                          isAssigned
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/50 hover:bg-muted/30"
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 pr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground font-mono text-xs">{scope.name}</span>
                            {scope.displayName && scope.displayName !== scope.name && (
                              <span className="text-muted-foreground text-[11px] font-sans">
                                ({scope.displayName})
                              </span>
                            )}
                            {scope.isDefault && (
                              <Badge variant="outline" className="text-[10px] font-mono py-0 border-border/60">
                                System Default
                              </Badge>
                            )}
                          </div>
                          {scope.description && (
                            <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                              {scope.description}
                            </p>
                          )}
                          {scope.claims && scope.claims.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap pt-0.5">
                              {scope.claims.map((claim) => (
                                <span
                                  key={claim}
                                  className="text-[10px] bg-muted/80 text-muted-foreground px-2 py-0.5 rounded border border-border/40 font-mono"
                                >
                                  {claim}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div
                          className={`size-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isAssigned
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40 bg-background"
                          }`}
                        >
                          {isAssigned && <RiCheckLine className="size-3" />}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </TabsContent>

            {/* TAB 4: QUICKSTART SDK SNIPPETS */}
            <TabsContent value="quickstart" className="m-0 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1 bg-muted/40 p-1 rounded-lg border border-border/40 font-mono text-xs">
                  <button
                    onClick={() => setSdkType("nextauth")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      sdkType === "nextauth" ? "bg-card shadow-sm font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    NextAuth v5
                  </button>
                  <button
                    onClick={() => setSdkType("nestjs")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      sdkType === "nestjs" ? "bg-card shadow-sm font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    NestJS
                  </button>
                  <button
                    onClick={() => setSdkType("react")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      sdkType === "react" ? "bg-card shadow-sm font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    React SPA
                  </button>
                  <button
                    onClick={() => setSdkType("curl")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      sdkType === "curl" ? "bg-card shadow-sm font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    cURL
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(getSnippets())
                    setCodeCopied(true)
                    setTimeout(() => setCodeCopied(false), 2000)
                  }}
                >
                  {codeCopied ? <RiCheckLine className="size-3.5 text-emerald-500" /> : <RiFileCopyLine className="size-3.5" />}
                  {codeCopied ? "Copied" : "Copy Code"}
                </Button>
              </div>

              <div className="rounded-lg border border-border/50 bg-black/40 p-4 overflow-x-auto">
                <pre className="text-[11px] leading-relaxed text-foreground font-mono">
                  {getSnippets()}
                </pre>
              </div>
            </TabsContent>

            {/* TAB 5: REDIRECT URI SIMULATOR */}
            <TabsContent value="simulator" className="m-0 space-y-4">
              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 text-[11px] font-sans text-muted-foreground leading-relaxed">
                Test and debug your application callback URLs against this client&apos;s configured redirect URI patterns and wildcards before testing in a live browser.
              </div>

              <div className="space-y-2">
                <Label htmlFor="sim-input" className="text-xs text-muted-foreground">Test Callback URL</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="sim-input"
                    placeholder="http://localhost:5173/callback"
                    value={simUrl}
                    onChange={(e) => setSimUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSimulateRedirect()
                    }}
                  />
                  <Button
                    size="sm"
                    className="font-mono text-xs gap-1.5 shrink-0"
                    onClick={handleSimulateRedirect}
                  >
                    <RiSparklingLine className="size-3.5" /> Test URI
                  </Button>
                </div>
              </div>

              {simResult !== null && (
                <div
                  className={`p-4 rounded-lg border text-xs font-mono flex items-start gap-3 ${
                    simResult.match
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {simResult.match ? (
                    <>
                      <RiCheckboxCircleFill className="size-4 shrink-0 mt-0.5 text-emerald-400" />
                      <div className="space-y-1">
                        <strong>MATCH VALIDATED:</strong> The test URI matches an authorized redirect URI pattern:
                        <div className="mt-1 font-mono text-[11px] bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 text-emerald-300">
                          {simResult.pattern}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <strong>REJECTED:</strong> The test URI does not match any configured redirect URI pattern. Authorization code requests specifying this callback URL will be rejected by the OIDC server with <code>invalid_redirect_uri</code>.
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* TAB 6: KEYCLOAK EXPORT */}
            <TabsContent value="export" className="m-0 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-heading text-sm font-semibold text-foreground">Keycloak Client JSON</h4>
                  <p className="text-[11px] text-muted-foreground font-sans">
                    Export standard Keycloak-compatible JSON representation for import into other clusters.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(keycloakExportJson, null, 2))
                      setExportCopied(true)
                      setTimeout(() => setExportCopied(false), 2000)
                    }}
                  >
                    {exportCopied ? <RiCheckLine className="size-3.5 text-emerald-500" /> : <RiFileCopyLine className="size-3.5" />}
                    {exportCopied ? "Copied" : "Copy JSON"}
                  </Button>
                  <Button
                    size="sm"
                    className="font-mono text-xs gap-1.5"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(keycloakExportJson, null, 2)], {
                        type: "application/json",
                      })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = `${app.appCode}-keycloak.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <RiDownloadLine className="size-3.5" /> Download
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-black/40 p-4 max-h-[360px] overflow-auto">
                <pre className="text-[11px] text-foreground font-mono">
                  {JSON.stringify(keycloakExportJson, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </div>

          {/* Sticky Sheet Action Footer */}
          <div className="border-t border-border/50 bg-card/95 backdrop-blur px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {settingsSuccess && (
                <span className="text-emerald-500 font-sans text-xs flex items-center gap-1.5">
                  <RiCheckLine className="size-4" /> Client settings updated!
                </span>
              )}
              {scopesSuccess && (
                <span className="text-emerald-500 font-sans text-xs flex items-center gap-1.5">
                  <RiCheckLine className="size-4" /> Scopes updated successfully!
                </span>
              )}
              {!settingsSuccess && !scopesSuccess && (
                <span className="text-muted-foreground/70 font-sans text-xs hidden sm:inline">
                  {activeTab === "settings" && "Configure client endpoints and OAuth 2.0 flows."}
                  {activeTab === "credentials" && "Manage client secrets and zero-downtime rotation."}
                  {activeTab === "scopes" && `${assignedScopeIds.length} scope${assignedScopeIds.length === 1 ? "" : "s"} assigned.`}
                  {activeTab === "quickstart" && "Ready-to-use SDK snippets for frameworks."}
                  {activeTab === "simulator" && "Simulate and test redirect URI matching rules."}
                  {activeTab === "export" && "Export standard Keycloak JSON configuration."}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {activeTab === "settings" && (
                <Button
                  size="sm"
                  className="font-mono text-xs gap-1.5"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings && <RiLoader4Line className="size-3.5 animate-spin" />}
                  Save Changes
                </Button>
              )}
              {activeTab === "scopes" && (
                <Button
                  size="sm"
                  className="font-mono text-xs gap-1.5"
                  onClick={handleSaveScopes}
                  disabled={savingScopes}
                >
                  {savingScopes && <RiLoader4Line className="size-3.5 animate-spin" />}
                  Save Scopes
                </Button>
              )}
            </div>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
