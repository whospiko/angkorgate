import {
  getCustomers,
  CustomersTable,
  CreateCustomerDialog,
} from "@/features/customers"

export const metadata = {
  title: "Customers | AngkorGate",
}

export default async function CustomersPage() {
  const customersData = await getCustomers()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Customer Directory
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage customer accounts, dynamic attributes, and authorized contact persons.
          </p>
        </div>
        <CreateCustomerDialog />
      </div>

      <CustomersTable customers={customersData.items} />
    </div>
  )
}
