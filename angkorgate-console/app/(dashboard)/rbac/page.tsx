import { getRoles, getPermissions, RbacTabsView } from "@/features/rbac"

export const metadata = {
  title: "Roles & Permissions | AngkorGate",
}

interface RbacPageProps {
  searchParams?: Promise<{
    tab?: "roles" | "permissions"
  }>
}

export default async function RbacPage({ searchParams }: RbacPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined
  const defaultTab = resolvedParams?.tab === "permissions" ? "permissions" : "roles"

  const [roles, permissions] = await Promise.all([getRoles(), getPermissions()])

  return (
    <RbacTabsView
      roles={roles}
      permissions={permissions}
      defaultTab={defaultTab}
    />
  )
}
