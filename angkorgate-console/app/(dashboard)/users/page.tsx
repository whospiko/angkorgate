import { getUsers, UsersTable, CreateUserDialog } from "@/features/users"

export const metadata = {
  title: "Users | AngkorGate",
}

export default async function UsersPage() {
  const usersData = await getUsers()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            User Accounts
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage user identity, account activation, credentials, and role assignments.
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <UsersTable users={usersData.items} />
    </div>
  )
}
