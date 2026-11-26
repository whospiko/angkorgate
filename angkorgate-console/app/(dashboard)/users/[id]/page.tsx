import { notFound } from "next/navigation"
import {
  getUserById,
  getUserLinkedAccount,
  getAdminUserOAuthAccounts,
  UserDetailTabsView,
} from "@/features/users"
import { getRoles, getPermissions } from "@/features/rbac"

export const metadata = {
  title: "User Details | AngkorGate",
}

interface UserDetailPageProps {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    tab?: "information" | "assign" | "security"
  }>
}

export default async function UserDetailPage({
  params,
  searchParams,
}: UserDetailPageProps) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const defaultTab =
    resolvedSearchParams?.tab === "assign"
      ? "assign"
      : resolvedSearchParams?.tab === "security"
      ? "security"
      : "information"

  const [user, allRoles, allPermissions, linkedAccount, oauthAccounts] = await Promise.all([
    getUserById(id),
    getRoles(),
    getPermissions(),
    getUserLinkedAccount(id),
    getAdminUserOAuthAccounts(id),
  ])

  if (!user) {
    notFound()
  }

  return (
    <UserDetailTabsView
      user={user}
      allRoles={allRoles}
      allPermissions={allPermissions}
      linkedAccount={linkedAccount}
      oauthAccounts={oauthAccounts}
      defaultTab={defaultTab}
    />
  )
}
