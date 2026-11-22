import { redirect } from "next/navigation"
import { getSetupStatus } from "@/features/system"

export const dynamic = "force-dynamic"

export default async function Page() {
  const status = await getSetupStatus()

  if (!status.isInitialized) {
    redirect("/setup")
  }

  redirect("/dashboard")
}
