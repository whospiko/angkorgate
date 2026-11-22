import { redirect } from "next/navigation"
import { getSetupStatus, SetupWizard } from "@/features/system"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Initial Setup | AngkorGate",
  description: "First-time installation and onboarding wizard for AngkorGate IAM",
}

export default async function SetupPage() {
  const status = await getSetupStatus()

  // If already initialized, setup is locked down
  if (status.isInitialized) {
    redirect("/login")
  }

  return <SetupWizard />
}
