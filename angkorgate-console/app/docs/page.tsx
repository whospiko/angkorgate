import { Metadata } from "next"
import { DocsShell } from "@/features/docs"

export const metadata: Metadata = {
  title: "Documentation | AngkorGate IAM",
  description: "Complete architectural guide, OIDC testing instructions, and developer reference for AngkorGate.",
}

export default function DocsPage() {
  return <DocsShell />
}
