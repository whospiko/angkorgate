import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCurrentUser } from "@/features/auth"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect("/login?unauthorized=1")
  }

  return (
    <div className="[--header-height:calc(--spacing(14))] min-h-svh flex flex-col">
      <SidebarProvider className="flex flex-col flex-1">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar currentUser={currentUser} />
          <SidebarInset className="flex-1 p-6">
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
