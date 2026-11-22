"use client"

import * as React from "react"
import type { BrandingConfig } from "../types/branding.types"

interface BrandingContextValue {
  branding: BrandingConfig
  updateBranding: (newBranding: Partial<BrandingConfig>) => void
}

const defaultBranding: BrandingConfig = {
  appName: "AngkorGate",
  appDescription: "Open-source Identity & Access Management (IAM)",
  logoUrl: null,
  faviconUrl: null,
  organizationName: "AngkorGate Team",
  supportEmail: null,
  footerText: "© 2026 AngkorGate Open Source",
}

const BrandingContext = React.createContext<BrandingContextValue>({
  branding: defaultBranding,
  updateBranding: () => {},
})

export interface BrandingProviderProps {
  initialBranding?: BrandingConfig
  children: React.ReactNode
}

export function BrandingProvider({
  initialBranding,
  children,
}: BrandingProviderProps) {
  const [branding, setBranding] = React.useState<BrandingConfig>(
    initialBranding || defaultBranding
  )

  const updateBranding = React.useCallback(
    (newBranding: Partial<BrandingConfig>) => {
      setBranding((prev) => ({ ...prev, ...newBranding }))
    },
    []
  )

  return (
    <BrandingContext.Provider value={{ branding, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = React.useContext(BrandingContext)
  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider")
  }
  return context
}
