"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Employee } from "@/lib/employee-context"

import {
  Sidebar,
  SidebarContent,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { SquaresFourIcon, TargetIcon, ChartBarIcon, ShieldWarningIcon, CaretUpDownIcon, SignOutIcon, GearIcon, BuildingsIcon, UsersIcon, ActivityIcon, CheckCircleIcon } from "@phosphor-icons/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {SidebarHeaderLogo} from "@/components/sidebar/sidebar-header-logo"

const primaryNav = [
  { title: "Dashboard",     url: "/department", icon: SquaresFourIcon },
  { title: "Approvals",     url: "/department/approvals", icon: CheckCircleIcon, hideFrom: ["VIEWER"] },
  { title: "Objectives",    url: "/department/objectives", icon: TargetIcon },
  { title: "KPIs",  url: "/department/kpis", icon: ChartBarIcon },
  { title: "Risks", url: "/department/risks", icon: ShieldWarningIcon },
  { title: "Requests",      url: "/department/requests", icon: ActivityIcon },
]

const adminNav = [
  { title: "Dashboard", url: "/admin", icon: SquaresFourIcon },
  { title: "Users", url: "/admin/users", icon: UsersIcon },
  { title: "Departments", url: "/admin/departments", icon: BuildingsIcon },
]

export function AppSidebar({ employee }: { employee: Employee }) {
  const pathname = usePathname()

  // Dashboard is exact match, sub-routes use startsWith
  const isActive = (url: string) => {
    if (url === "/department" || url === "/admin") return pathname === url
    return pathname.startsWith(url)
  }

  // Fallback for unauthenticated state (though middleware should catch this)
  if (!employee) return null

  const userRole = employee.role || "VIEWER"
  const isSysAdmin = userRole === "SYSTEM_ADMIN"
  const initials = `${employee.firstname?.[0] || ""}${employee.lastname?.[0] || ""}`

  return (
    <Sidebar className="print:hidden" collapsible="icon">
      {/* === HEADER === */}
        <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
  <SidebarHeaderLogo />
</SidebarHeader>

      {/* === BODY === */}
      <SidebarContent className="px-3 py-4 space-y-6">

        {/* Primary Nav (Department Workspace) */}
        {!isSysAdmin && (
          <div>
            <SidebarMenu className="gap-0.5">
              {primaryNav.map((item) => {
                if (item.hideFrom && item.hideFrom.includes(employee?.role)) return null
                if (item.url === "/department/approvals" && !employee.is_approver && employee.role !== "SYSTEM_ADMIN") return null
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      render={<Link href={item.url} />}
                      isActive={isActive(item.url)} 
                      tooltip={item.title}
                      className={cn(
                        "hover:bg-primary/10 hover:text-primary transition-colors",
                        isActive(item.url) && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </div>
        )}

        {/* Admin Nav (System Administration) */}
        {isSysAdmin && (
          <div>
            <SidebarMenu className="gap-0.5">
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    render={<Link href={item.url} />} 
                    tooltip={item.title} 
                    isActive={isActive(item.url)} 
                    className="w-full px-3 py-2"
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        )}

      </SidebarContent>

      {/* === FOOTER === */}
      <SidebarFooter className="border-t border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-left outline-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
            
            <div className="flex items-center gap-3 overflow-hidden">
              <Avatar className="h-8 w-8 shrink-0 rounded-full border border-sidebar-border">
                <AvatarFallback className="rounded-full bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
              </Avatar>
              
              {/* Hidden when collapsed */}
              <div className="flex flex-col items-start justify-center overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate w-full font-semibold text-sm leading-tight text-foreground">{employee.firstname} {employee.lastname}</span>
                <span className="truncate w-full text-xs leading-tight text-muted-foreground">{userRole.replace('_', ' ')}</span>
              </div>
            </div>
            
            {/* Hidden when collapsed */}
            <CaretUpDownIcon className="size-4 shrink-0 text-muted-foreground/70 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          
          <DropdownMenuContent side="top" align="center" className="w-56 rounded-lg">
            <DropdownMenuItem 
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = '/auth/login'
              }}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium"
            >
              <SignOutIcon className="mr-2 size-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}