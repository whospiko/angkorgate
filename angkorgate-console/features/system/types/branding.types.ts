export interface SetupStatus {
  isInitialized: boolean
  requiresAdmin: boolean
  appName: string
  logoUrl?: string | null
}

export interface BrandingConfig {
  appName: string
  appDescription?: string | null
  logoUrl?: string | null
  faviconUrl?: string | null
  organizationName?: string | null
  supportEmail?: string | null
  footerText?: string | null
  allowedDashboardRoles?: string[]
}

export interface SetupActionResult {
  success: boolean
  message: string
  errors?: Record<string, string[] | undefined>
  user?: {
    id: string
    email: string | null
    roles: string[]
  }
}

export interface BrandingActionResult {
  success: boolean
  message: string
  errors?: Record<string, string[] | undefined>
  data?: BrandingConfig
}
