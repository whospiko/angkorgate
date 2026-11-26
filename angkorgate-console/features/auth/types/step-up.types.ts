export type StepUpVerificationMethod =
  | "password"
  | "totp"
  | "email_otp"
  | "passkey"

export interface StepUpStatus {
  verified: boolean
  expiresAt: string | null
  method: StepUpVerificationMethod | null
  availableMethods: {
    password: boolean
    passkey: boolean
    totp: boolean
    emailOtp: boolean
  }
  oauthProviders: string[]
  email: string | null
}

export interface StepUpActionResult<T = unknown> {
  success: boolean
  message?: string
  data?: T
}
