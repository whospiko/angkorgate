export type SessionDeviceType =
  | "desktop"
  | "mobile"
  | "tablet"
  | "cli"
  | "bot"
  | "unknown"

export interface SessionMetadataInput {
  userAgent?: string | null
  browser?: string | null
  os?: string | null
  deviceType?: SessionDeviceType | null
}

export interface ParsedSessionMetadata {
  browser: string
  os: string
  deviceType: SessionDeviceType
  label: string
}

function fallbackParseUserAgent(userAgent?: string | null): ParsedSessionMetadata {
  const ua = userAgent?.trim()
  if (!ua) {
    return {
      browser: "Unknown Browser",
      os: "Unknown OS",
      deviceType: "unknown",
      label: "Unknown Browser on Unknown OS",
    }
  }

  let browser = "Unknown Browser"
  const browserRules: Array<[string, RegExp]> = [
    ["Edge", /Edg(?:e|A|iOS)?\/(\d+(?:\.\d+)?)/i],
    ["Opera", /(?:OPR|Opera)\/(\d+(?:\.\d+)?)/i],
    ["Firefox", /(?:Firefox|FxiOS)\/(\d+(?:\.\d+)?)/i],
    ["Chrome", /(?:Chrome|CriOS)\/(\d+(?:\.\d+)?)/i],
    ["Safari", /Version\/(\d+(?:\.\d+)?).*Safari\//i],
    ["curl", /curl\/(\d+(?:\.\d+)?)/i],
    ["Postman", /PostmanRuntime\/(\d+(?:\.\d+)?)/i],
  ]
  for (const [name, regex] of browserRules) {
    const match = ua.match(regex)
    if (match) {
      const major = match[1]?.split(".")[0]
      browser = major ? `${name} ${major}` : name
      break
    }
  }

  let os = "Unknown OS"
  if (/iPad/i.test(ua)) os = "iPadOS"
  else if (/iPhone|iPod/i.test(ua)) os = "iOS"
  else if (/Android/i.test(ua)) os = "Android"
  else if (/CrOS/i.test(ua)) os = "ChromeOS"
  else if (/Windows/i.test(ua)) os = "Windows"
  else if (/Mac OS X|Macintosh|Darwin/i.test(ua)) os = "macOS"
  else if (/Linux/i.test(ua)) os = "Linux"

  let deviceType: SessionDeviceType = "unknown"
  if (/bot|crawler|spider|headless/i.test(ua)) deviceType = "bot"
  else if (/curl|PostmanRuntime|Insomnia|HTTPie/i.test(ua)) deviceType = "cli"
  else if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = "tablet"
  } else if (/iPhone|iPod|Mobile/i.test(ua)) deviceType = "mobile"
  else if (os !== "Unknown OS") deviceType = "desktop"

  const label =
    os !== "Unknown OS" ? `${browser} on ${os}` : browser

  return { browser, os, deviceType, label }
}

export function resolveSessionMetadata(
  input: SessionMetadataInput
): ParsedSessionMetadata {
  if (input.browser && input.os && input.deviceType) {
    const label =
      input.os !== "Unknown OS"
        ? `${input.browser} on ${input.os}`
        : input.browser
    return {
      browser: input.browser,
      os: input.os,
      deviceType: input.deviceType,
      label,
    }
  }

  const parsed = fallbackParseUserAgent(input.userAgent)
  const browser = input.browser || parsed.browser
  const os = input.os || parsed.os
  const deviceType = input.deviceType || parsed.deviceType
  return {
    browser,
    os,
    deviceType,
    label: os !== "Unknown OS" ? `${browser} on ${os}` : browser,
  }
}

export function formatRelativeTimestamp(iso?: string | null): string {
  if (!iso) return "Unknown"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Unknown"

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 45) return "Just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

export function formatExactTimestamp(iso?: string | null): string {
  if (!iso) return "Unknown"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleString()
}
