'use client'

import { usePathname } from 'next/navigation'
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { TopHeader } from "@/components/layout/TopHeader"

import { EmployeeProvider, type Employee } from '@/lib/employee-context'

export function ClientLayoutWrapper({ 
  children, 
  employee 
}: { 
  children: React.ReactNode, 
  employee: Employee | null 
}) {
  const pathname = usePathname()
  const isAuthRoute = pathname.startsWith('/auth')

  if (isAuthRoute) {
    return (
      <main className="flex-1 w-full flex flex-col bg-white">
        {children}
      </main>
    )
  }

  return (
    <EmployeeProvider employee={employee}>
      <SidebarProvider>
        <AppSidebar employee={employee} />
        <main className="flex-1 w-full flex flex-col min-w-0">
          <TopHeader />
          {children}
        </main>
      </SidebarProvider>
    </EmployeeProvider>
  )
}
