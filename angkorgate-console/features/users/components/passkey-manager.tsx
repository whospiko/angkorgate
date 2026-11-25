"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  RiFingerprintLine,
  RiAddLine,
  RiShieldCheckLine,
  RiMacbookLine,
  RiSmartphoneLine,
  RiKeyLine,
  RiDeleteBinLine,
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiTimeLine,
  RiCloudLine,
} from "@remixicon/react"
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser"
import type { Passkey } from "@/features/auth/types/passkey.types"
import {
  getPasskeyRegistrationOptionsAction,
  verifyPasskeyRegistrationAction,
  getMyPasskeysAction,
  renamePasskeyAction,
  deletePasskeyAction,
  getAdminUserPasskeysAction,
  adminRevokeUserPasskeyAction,
} from "@/features/auth/server/passkey-actions"

interface PasskeyManagerProps {
  userId?: string
  isAdminView?: boolean
  userEmail?: string | null
}

export function PasskeyManager({
  userId,
  isAdminView = false,
  userEmail,
}: PasskeyManagerProps) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [supported, setSupported] = useState(true)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Rename Dialog State
  const [renameTarget, setRenameTarget] = useState<Passkey | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renaming, setRenaming] = useState(false)

  // Custom Friendly Name on Registration
  const [namePromptOpen, setNamePromptOpen] = useState(false)
  const [pendingRegistrationResponse, setPendingRegistrationResponse] = useState<any>(null)
  const [newKeyName, setNewKeyName] = useState("")

  useEffect(() => {
    setSupported(browserSupportsWebAuthn())
  }, [])

  const loadPasskeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = isAdminView && userId
        ? await getAdminUserPasskeysAction(userId)
        : await getMyPasskeysAction()

      if (res.success && res.passkeys) {
        setPasskeys(res.passkeys)
      } else if (res.message) {
        setFeedback({ type: "error", text: res.message })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load passkeys." })
    } finally {
      setLoading(false)
    }
  }, [isAdminView, userId])

  useEffect(() => {
    loadPasskeys()
  }, [loadPasskeys])

  // Handle Starting Registration with Browser WebAuthn
  const handleStartRegistration = async () => {
    setRegistering(true)
    setFeedback(null)

    try {
      if (!browserSupportsWebAuthn()) {
        setFeedback({
          type: "error",
          text: "Your current browser or device does not support WebAuthn / Passkeys.",
        })
        setRegistering(false)
        return
      }

      // 1. Get options from server
      const optRes = await getPasskeyRegistrationOptionsAction(userEmail || undefined, userId)
      if (!optRes.success || !optRes.options) {
        setFeedback({
          type: "error",
          text: optRes.message || "Failed to initiate passkey registration.",
        })
        setRegistering(false)
        return
      }

      // 2. Browser prompts user for TouchID/FaceID/YubiKey
      let attestationResponse: any
      try {
        attestationResponse = await startRegistration({ optionsJSON: optRes.options })
      } catch (clientErr: any) {
        if (clientErr.name === "NotAllowedError") {
          setFeedback({
            type: "error",
            text: "Passkey registration was cancelled or timed out.",
          })
        } else {
          setFeedback({
            type: "error",
            text: clientErr.message || "Failed to complete device biometric registration.",
          })
        }
        setRegistering(false)
        return
      }

      // 3. Prompt user for friendly name or use default based on device
      const defaultName = navigator.userAgent.includes("Mac")
        ? "MacBook Touch ID / Passkey"
        : navigator.userAgent.includes("iPhone")
          ? "iPhone Face ID Passkey"
          : navigator.userAgent.includes("Windows")
            ? "Windows Hello Passkey"
            : "Biometric Passkey"

      setPendingRegistrationResponse(attestationResponse)
      setNewKeyName(defaultName)
      setNamePromptOpen(true)
      setRegistering(false)
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "An unexpected error occurred." })
      setRegistering(false)
    }
  }

  // Finalize Registration after Friendly Name Confirmation
  const handleFinalizeRegistration = async () => {
    if (!pendingRegistrationResponse) return
    setRegistering(true)
    setNamePromptOpen(false)

    try {
      const res = await verifyPasskeyRegistrationAction(
        pendingRegistrationResponse,
        newKeyName || "Biometric Passkey",
        userId
      )

      if (res.success) {
        setFeedback({
          type: "success",
          text: `Passkey "${res.passkey?.friendlyName || newKeyName}" registered successfully! You can now use it for instant biometric sign-in.`,
        })
        loadPasskeys()
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to verify passkey with server.",
        })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Verification request failed." })
    } finally {
      setRegistering(false)
      setPendingRegistrationResponse(null)
    }
  }

  // Handle Delete / Revoke
  const handleDeletePasskey = async (passkey: Passkey) => {
    if (!confirm(`Are you sure you want to revoke passkey "${passkey.friendlyName}"? It will no longer be able to authenticate.`)) {
      return
    }

    try {
      const res = isAdminView && userId
        ? await adminRevokeUserPasskeyAction(userId, passkey.id)
        : await deletePasskeyAction(passkey.id)

      if (res.success) {
        setFeedback({ type: "success", text: `Passkey "${passkey.friendlyName}" revoked.` })
        setPasskeys((prev) => prev.filter((p) => p.id !== passkey.id))
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to revoke passkey." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error revoking passkey." })
    }
  }

  // Handle Rename Submit
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renameTarget || !renameValue.trim()) return

    setRenaming(true)
    try {
      const res = await renamePasskeyAction(renameTarget.id, renameValue.trim())
      if (res.success && res.passkey) {
        setPasskeys((prev) =>
          prev.map((p) => (p.id === renameTarget.id ? { ...p, friendlyName: res.passkey!.friendlyName } : p))
        )
        setRenameTarget(null)
        setFeedback({ type: "success", text: "Passkey name updated." })
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to rename passkey." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error updating name." })
    } finally {
      setRenaming(false)
    }
  }

  const getDeviceIcon = (deviceType: string, friendlyName: string) => {
    const lower = friendlyName.toLowerCase()
    if (lower.includes("phone") || lower.includes("android") || lower.includes("ios")) {
      return <RiSmartphoneLine className="size-5 text-primary" />
    }
    if (lower.includes("mac") || lower.includes("laptop") || lower.includes("pc") || lower.includes("windows")) {
      return <RiMacbookLine className="size-5 text-primary" />
    }
    if (lower.includes("yubi") || lower.includes("key") || lower.includes("fido")) {
      return <RiKeyLine className="size-5 text-amber-500" />
    }
    return <RiFingerprintLine className="size-5 text-primary" />
  }

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <RiFingerprintLine className="size-5" />
            </div>
            <div>
              <CardTitle className="font-heading text-base font-semibold">
                Passkeys & FIDO2 Biometrics
              </CardTitle>
              <CardDescription className="text-xs font-mono">
                Zero-phishing cryptographic credentials using Touch ID, Face ID, Windows Hello, or YubiKeys.
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleStartRegistration}
            disabled={registering || !supported}
            className="gap-2 font-mono text-xs shrink-0"
          >
            {registering ? (
              <>
                <RiLoader4Line className="size-4 animate-spin" />
                <span>Prompting Device...</span>
              </>
            ) : (
              <>
                <RiAddLine className="size-4" />
                <span>Register New Passkey</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {feedback && (
          <div
            className={`p-3 rounded-md font-mono text-xs flex items-center justify-between gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-destructive/10 text-destructive border border-destructive/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <RiCheckLine className="size-4 shrink-0" />
              ) : (
                <RiCloseLine className="size-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="hover:opacity-75"
            >
              <RiCloseLine className="size-3.5" />
            </button>
          </div>
        )}

        {!supported && (
          <div className="p-3 rounded-md font-mono text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-2">
            <RiKeyLine className="size-4 shrink-0" />
            <span>WebAuthn is not supported in this browser environment. Use a modern browser supporting FIDO2.</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground font-mono text-xs">
            <RiLoader4Line className="size-5 animate-spin text-primary" />
            <span>Querying registered credentials...</span>
          </div>
        ) : passkeys.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-border/60 bg-muted/20">
            <div className="mx-auto size-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
              <RiFingerprintLine className="size-5" />
            </div>
            <h4 className="font-heading text-sm font-semibold text-foreground mb-1">
              No Passkeys Registered
            </h4>
            <p className="font-mono text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Register your device&apos;s fingerprint, Face ID, or hardware security key to sign in instantly without typing passwords.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartRegistration}
              disabled={registering || !supported}
              className="gap-2 font-mono text-xs"
            >
              <RiAddLine className="size-4" />
              <span>Add Your First Passkey</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40 rounded-md border border-border/50 overflow-hidden bg-card/40">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 rounded-md bg-muted/60 shrink-0">
                    {getDeviceIcon(passkey.deviceType, passkey.friendlyName)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {passkey.friendlyName}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] px-1.5 py-0 h-4 border-border/60"
                      >
                        {passkey.deviceType === "multiDevice" ? "Synced Passkey" : "Single Device"}
                      </Badge>
                      {passkey.backedUp && (
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px] px-1.5 py-0 h-4 gap-1 text-emerald-500"
                        >
                          <RiCloudLine className="size-3" />
                          Backed Up
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <RiTimeLine className="size-3" />
                        Created: {new Date(passkey.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>
                        Last used:{" "}
                        {passkey.lastUsedAt
                          ? new Date(passkey.lastUsedAt).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setRenameTarget(passkey)
                      setRenameValue(passkey.friendlyName)
                    }}
                    className="size-8 text-muted-foreground hover:text-foreground"
                    title="Rename Passkey"
                  >
                    <RiEditLine className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePasskey(passkey)}
                    className="size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                    title={isAdminView ? "Admin Revoke Passkey" : "Delete Passkey"}
                  >
                    <RiDeleteBinLine className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Friendly Name Dialog on Creation */}
      <Dialog open={namePromptOpen} onOpenChange={setNamePromptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-base flex items-center gap-2">
              <RiShieldCheckLine className="size-5 text-primary" />
              Name Your Passkey
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              Biometric verification succeeded! Give this credential a recognizable label.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="key-name" className="font-mono text-xs">
              Passkey Label
            </Label>
            <Input
              id="key-name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. MacBook Pro Touch ID, YubiKey 5C"
              className="font-mono text-xs"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNamePromptOpen(false)
                setPendingRegistrationResponse(null)
              }}
              className="font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleFinalizeRegistration}
              disabled={!newKeyName.trim() || registering}
              className="font-mono text-xs gap-1.5"
            >
              {registering ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiCheckLine className="size-4" />
              )}
              Save Passkey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle className="font-heading text-base flex items-center gap-2">
                <RiEditLine className="size-5 text-primary" />
                Rename Passkey
              </DialogTitle>
              <DialogDescription className="text-xs font-mono">
                Update the friendly name for credential {renameTarget?.credentialId.slice(0, 16)}...
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <Label htmlFor="rename-input" className="font-mono text-xs">
                Passkey Label
              </Label>
              <Input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="font-mono text-xs"
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRenameTarget(null)}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!renameValue.trim() || renaming}
                className="font-mono text-xs gap-1.5"
              >
                {renaming ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiCheckLine className="size-4" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
