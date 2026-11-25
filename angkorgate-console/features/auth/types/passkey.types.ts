import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser"

export interface Passkey {
  id: string
  credentialId: string
  friendlyName: string
  deviceType: string
  backedUp: boolean
  lastUsedAt: string | null
  createdAt: string
}

export type PasskeyAuthOptionsResponse = PublicKeyCredentialRequestOptionsJSON & {
  challengeId: string
}
