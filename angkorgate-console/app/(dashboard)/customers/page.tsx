import {
  getCustomers,
  CustomersTable,
  CreateCustomerDialog,
} from "@/features/customers"

export const metadata = {
  title: "Customers | AngkorGate",
}

interface CustomersPageProps {
  searchParams?: Promise<{
    search?: string
    type?: string
    status?: string
    page?: string
  }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = (await searchParams) || {}
  const page = params.page ? Math.max(1, parseInt(params.page, 10) || 1) : 1

  const customersData = await getCustomers({
    search: params.search,
    type: params.type,
    status: params.status,
    page,
    limit: 20,
  })

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

      <CustomersTable
        customers={customersData.items}
        total={customersData.total}
        page={customersData.page}
        limit={customersData.limit}
        initialSearch={params.search || ""}
        initialType={params.type || ""}
        initialStatus={params.status || ""}
      />
    </div>
  )
}
