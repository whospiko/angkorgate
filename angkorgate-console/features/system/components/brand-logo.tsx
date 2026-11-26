import * as React from "react"

export const DEFAULT_LOGO_URL = "/logo.jpeg"

export function resolveLogoUrl(logoUrl?: string | null): string {
  return logoUrl && logoUrl.trim().length > 0 ? logoUrl : DEFAULT_LOGO_URL
}

export interface BrandLogoProps {
  logoUrl?: string | null
  alt?: string
  customClassName?: string
  defaultClassName?: string
  onError?: React.ReactEventHandler<HTMLImageElement>
}

/**
 * Renders the CMS-configured logo if present, or falls back to the default
 * `/logo.jpeg` asset on fresh installs.
 */
export function BrandLogo({
  logoUrl,
  alt = "AngkorGate",
  customClassName = "size-5 object-contain",
  defaultClassName = "size-full object-cover",
  onError,
}: BrandLogoProps) {
  const hasCustomLogo = Boolean(logoUrl && logoUrl.trim().length > 0)
  const src = resolveLogoUrl(logoUrl)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={hasCustomLogo ? customClassName : defaultClassName}
      onError={onError}
    />
  )
}
