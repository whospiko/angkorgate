"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiLoader4Line,
} from "@remixicon/react"
import { getStepUpStatusAction } from "@/features/auth/server/step-up-actions"
import { StepUpVerificationDialog } from "@/features/auth/components/step-up-dialog"

export interface RevealActionResult {
  success: boolean
  value?: string | null
  stepUpRequired?: boolean
  message?: string
}

interface SecretDisplayFieldProps {
  value?: string | null
  maskedDots?: number
  requireStepUp?: boolean
  onReveal?: () => Promise<RevealActionResult>
  onRevealedChange?: (revealedValue: string | null) => void
  copyable?: boolean
  className?: string
}

export function SecretDisplayField({
  value,
  maskedDots = 32,
  requireStepUp = true,
  onReveal,
  onRevealedChange,
  copyable = true,
  className = "",
}: SecretDisplayFieldProps) {
  const [revealed, setRevealed] = useState(false)
  const [resolvedValue, setResolvedValue] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stepUpOpen, setStepUpOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<"reveal" | "copy" | null>(
    null
  )

  const performReveal = useCallback(async (): Promise<string | null> => {
    setError(null)
    if (onReveal) {
      setLoading(true)
      const res = await onReveal()
      setLoading(false)
      if (res.stepUpRequired) {
        return null
      }
      if (!res.success) {
        setError(res.message || "Unable to reveal secret.")
        return null
      }
      const nextVal = res.value ?? ""
      setResolvedValue(nextVal)
      onRevealedChange?.(nextVal)
      return nextVal
    }

    if (requireStepUp) {
      setLoading(true)
      const status = await getStepUpStatusAction()
      setLoading(false)
      if (!status.success || !status.data?.verified) {
        return null
      }
    }

    const nextVal = value ?? ""
    setResolvedValue(nextVal)
    onRevealedChange?.(nextVal)
    return nextVal
  }, [onReveal, onRevealedChange, requireStepUp, value])

  const handleToggleReveal = async () => {
    if (revealed) {
      setRevealed(false)
      onRevealedChange?.(null)
      return
    }

    if (resolvedValue !== null && !onReveal) {
      setRevealed(true)
      onRevealedChange?.(resolvedValue)
      return
    }

    if (requireStepUp) {
      const status = await getStepUpStatusAction()
      if (!status.success || !status.data?.verified) {
        setPendingAction("reveal")
        setStepUpOpen(true)
        return
      }
    }

    const val = await performReveal()
    if (val !== null) {
      setRevealed(true)
    } else if (requireStepUp) {
      setPendingAction("reveal")
      setStepUpOpen(true)
    }
  }

  const handleCopy = async () => {
    setError(null)
    let textToCopy = revealed ? (resolvedValue ?? value ?? "") : null

    if (textToCopy === null) {
      if (requireStepUp) {
        const status = await getStepUpStatusAction()
        if (!status.success || !status.data?.verified) {
          setPendingAction("copy")
          setStepUpOpen(true)
          return
        }
      }
      textToCopy = await performReveal()
      if (textToCopy === null) {
        setPendingAction("copy")
        setStepUpOpen(true)
        return
      }
    }

    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStepUpVerified = () => {
    const action = pendingAction
    setPendingAction(null)
    void performReveal().then(async (val) => {
      if (val === null) return
      if (action === "reveal") {
        setRevealed(true)
      } else if (action === "copy") {
        await navigator.clipboard.writeText(val)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    })
  }

  const displayedText = revealed
    ? resolvedValue ?? value ?? ""
    : "•".repeat(maskedDots)

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div
          className={`flex-1 bg-black/40 border border-border/60 rounded-md px-3.5 py-2 font-mono text-xs truncate ${
            revealed ? "text-primary select-all" : "text-muted-foreground tracking-wider"
          }`}
        >
          {displayedText}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            disabled={loading}
            title={revealed ? "Hide secret" : "Reveal secret"}
            onClick={() => void handleToggleReveal()}
          >
            {loading ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : revealed ? (
              <RiEyeOffLine className="size-4" />
            ) : (
              <RiEyeLine className="size-4" />
            )}
          </Button>
          {copyable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-1.5 font-mono text-xs shrink-0"
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <RiCheckLine className="size-3.5 text-emerald-500" />
              ) : (
                <RiFileCopyLine className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy Secret"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="font-mono text-[11px] text-destructive">{error}</p>
      )}

      <StepUpVerificationDialog
        open={stepUpOpen}
        onOpenChange={(next) => {
          setStepUpOpen(next)
          if (!next) setPendingAction(null)
        }}
        onVerified={handleStepUpVerified}
      />
    </div>
  )
}

interface SecretInputFieldProps {
  id?: string
  value: string
  onChange: (nextValue: string) => void
  placeholder?: string
  required?: boolean
  hasStoredSecret?: boolean
  onRevealStored?: () => Promise<RevealActionResult>
  className?: string
}

const MASK_PLACEHOLDER = "••••••••"

export function SecretInputField({
  id,
  value,
  onChange,
  placeholder,
  required = false,
  hasStoredSecret = false,
  onRevealStored,
  className = "",
}: SecretInputFieldProps) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stepUpOpen, setStepUpOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsStoredReveal =
    Boolean(onRevealStored) &&
    hasStoredSecret &&
    (value === "" || value === MASK_PLACEHOLDER)

  const fetchStoredAndShow = async () => {
    if (!onRevealStored) {
      setVisible(true)
      return
    }
    setLoading(true)
    setError(null)
    const res = await onRevealStored()
    setLoading(false)
    if (res.stepUpRequired) {
      setStepUpOpen(true)
      return
    }
    if (!res.success) {
      setError(res.message || "Unable to load stored secret.")
      return
    }
    onChange(res.value ?? "")
    setVisible(true)
  }

  const handleToggle = async () => {
    if (visible) {
      setVisible(false)
      return
    }

    if (needsStoredReveal) {
      const status = await getStepUpStatusAction()
      if (!status.success || !status.data?.verified) {
        setStepUpOpen(true)
        return
      }
      await fetchStoredAndShow()
      return
    }

    setVisible(true)
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`pr-10 font-mono text-sm ${className}`}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleToggle()}
          title={visible ? "Hide value" : "Show value"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {loading ? (
            <RiLoader4Line className="size-4 animate-spin" />
          ) : visible ? (
            <RiEyeOffLine className="size-4" />
          ) : (
            <RiEyeLine className="size-4" />
          )}
        </button>
      </div>
      {error && (
        <p className="font-mono text-[11px] text-destructive">{error}</p>
      )}
      <StepUpVerificationDialog
        open={stepUpOpen}
        onOpenChange={setStepUpOpen}
        onVerified={() => void fetchStoredAndShow()}
      />
    </div>
  )
}
