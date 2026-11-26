import {
  RiAppleFill,
  RiDiscordFill,
  RiGithubFill,
  RiGoogleFill,
  RiMicrosoftFill,
  RiShieldUserLine,
  RiTelegramFill,
} from "@remixicon/react"

interface OAuthProviderIconProps {
  code: string
  className?: string
}

export function OAuthProviderIcon({
  code,
  className = "size-4",
}: OAuthProviderIconProps) {
  switch (code.toLowerCase()) {
    case "google":
      return <RiGoogleFill className={className} />
    case "github":
      return <RiGithubFill className={className} />
    case "discord":
      return <RiDiscordFill className={className} />
    case "microsoft":
      return <RiMicrosoftFill className={className} />
    case "telegram":
      return <RiTelegramFill className={className} />
    case "apple":
      return <RiAppleFill className={className} />
    default:
      return <RiShieldUserLine className={className} />
  }
}
