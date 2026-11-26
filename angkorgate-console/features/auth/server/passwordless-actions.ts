"use server"

import { apiClient, ApiError } from "@/lib/api-client"
import type { AuthSuccessData } from "../types/auth.schemas"
import {
  MagicLinkRequestSchema,
  MagicLinkVerifySchema,
  OtpRequestSchema,
  OtpVerifySchema,
  type OtpRequestInput,
  type OtpVerifyInput,
  type PasswordlessRequestResponse,
} from "../types/passwordless.schemas"
import { establishAuthSession } from "./session-cookies"

export async function requestMagicLinkAction(
  email: string,
  redirectUrl?: string
): Promise<{
  success: boolean
  message: string
  expiresInSeconds?: number
}> {
  const parsed = MagicLinkRequestSchema.safeParse({ email, redirectUrl })
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid email address.",
    }
  }

  try {
    const res = await apiClient.post<PasswordlessRequestResponse>(
      "/auth/passwordless/magic-link/request",
      parsed.data
    )
    return {
      success: true,
      message: res.message,
      expiresInSeconds: res.expiresInSeconds,
    }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to send magic link. Please try again."
    return { success: false, message }
  }
}

export async function verifyMagicLinkAction(
  token: string,
  redirectUrl = "/dashboard"
): Promise<{
  success: boolean
  message?: string
  redirectUrl?: string
}> {
  const parsed = MagicLinkVerifySchema.safeParse({ token })
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Missing magic link token.",
    }
  }

  let authData: AuthSuccessData & { redirectUrl?: string | null }
  try {
    authData = await apiClient.post<
      AuthSuccessData & { redirectUrl?: string | null }
    >("/auth/passwordless/magic-link/verify", { token: parsed.data.token })
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to verify magic link. It may have expired or already been used."
    return { success: false, message }
  }

  if (!authData || !authData.accessToken) {
    return {
      success: false,
      message: "Authentication response did not contain an access token.",
    }
  }

  const targetPath = await establishAuthSession(
    authData,
    authData.redirectUrl || redirectUrl
  )

  return { success: true, redirectUrl: targetPath }
}

export async function requestOtpAction(
  input: OtpRequestInput
): Promise<{
  success: boolean
  message: string
  expiresInSeconds?: number
}> {
  const parsed = OtpRequestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid contact details.",
    }
  }

  try {
    const res = await apiClient.post<PasswordlessRequestResponse>(
      "/auth/passwordless/otp/request",
      parsed.data
    )
    return {
      success: true,
      message: res.message,
      expiresInSeconds: res.expiresInSeconds,
    }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to send verification code. Please try again."
    return { success: false, message }
  }
}

export async function verifyOtpAction(
  input: OtpVerifyInput,
  redirectUrl = "/dashboard"
): Promise<{
  success: boolean
  message?: string
  redirectUrl?: string
}> {
  const parsed = OtpVerifySchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid verification code.",
    }
  }

  let authData: AuthSuccessData
  try {
    authData = await apiClient.post<AuthSuccessData>(
      "/auth/passwordless/otp/verify",
      parsed.data
    )
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Invalid or expired verification code."
    return { success: false, message }
  }

  if (!authData || !authData.accessToken) {
    return {
      success: false,
      message: "Authentication response did not contain an access token.",
    }
  }

  const targetPath = await establishAuthSession(authData, redirectUrl)
  return { success: true, redirectUrl: targetPath }
}
