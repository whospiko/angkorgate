"use server"

import { apiClient, ApiError } from "@/lib/api-client"
import type {
  StepUpActionResult,
  StepUpStatus,
  StepUpVerificationMethod,
} from "../types/step-up.types"

export async function getStepUpStatusAction(): Promise<
  StepUpActionResult<StepUpStatus>
> {
  try {
    const status = await apiClient.get<StepUpStatus>("/auth/step-up/status")
    return { success: true, data: status }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Unable to check verification status."
    return { success: false, message }
  }
}

export async function verifyStepUpAction(input: {
  method: "password" | "totp" | "email_otp"
  password?: string
  code?: string
}): Promise<
  StepUpActionResult<{
    verified: boolean
    expiresAt: string
    method: StepUpVerificationMethod
  }>
> {
  try {
    const res = await apiClient.post<{
      verified: boolean
      expiresAt: string
      method: StepUpVerificationMethod
    }>("/auth/step-up/verify", input)
    return { success: true, data: res }
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Verification failed."
    return { success: false, message }
  }
}

export async function requestStepUpEmailOtpAction(): Promise<
  StepUpActionResult<{ message: string; maskedEmail: string }>
> {
  try {
    const res = await apiClient.post<{ message: string; maskedEmail: string }>(
      "/auth/step-up/email-otp/request",
      {}
    )
    return { success: true, message: res.message, data: res }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to send verification code."
    return { success: false, message }
  }
}

export async function getStepUpPasskeyOptionsAction(): Promise<
  StepUpActionResult<Record<string, unknown>>
> {
  try {
    const res = await apiClient.post<Record<string, unknown>>(
      "/auth/step-up/passkey/options",
      {}
    )
    return { success: true, data: res }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to start passkey verification."
    return { success: false, message }
  }
}

export async function verifyStepUpPasskeyAction(
  challengeId: string,
  response: unknown
): Promise<
  StepUpActionResult<{
    verified: boolean
    expiresAt: string
    method: StepUpVerificationMethod
  }>
> {
  try {
    const res = await apiClient.post<{
      verified: boolean
      expiresAt: string
      method: StepUpVerificationMethod
    }>("/auth/step-up/passkey/verify", { challengeId, response })
    return { success: true, data: res }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Passkey verification failed."
    return { success: false, message }
  }
}

export async function lockStepUpAction(): Promise<StepUpActionResult> {
  try {
    await apiClient.delete("/auth/step-up")
    return { success: true, message: "Sensitive credentials locked." }
  } catch {
    return { success: false, message: "Failed to lock verification session." }
  }
}
