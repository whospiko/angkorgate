import { getRoles, RolesTable, CreateRoleDialog } from "@/features/rbac"

export const metadata = {
  title: "Roles & Permissions | AngkorGate",
}

export default async function RbacPage() {
  const roles = await getRoles()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Roles & Permissions (RBAC)
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Configure access control policies, permissions, and security role hierarchies.
          </p>
        </div>
        <CreateRoleDialog />
      </div>

      <RolesTable roles={roles} />
    </div>
  )
}
