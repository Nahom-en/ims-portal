"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { CaretRight, Bell } from "@phosphor-icons/react"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TopHeader() {
  const pathname = usePathname()
  const supabase = createClient()
  
  const [notifications, setNotifications] = useState<{id: string, title: string, message: string, is_read: boolean, created_at: string}[]>([])

  useEffect(() => {
    async function fetchNotifs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: empRows } = await supabase.from('employees').select('id').eq('auth_user_id', user.id).single()
      if (empRows) {
        const empId = empRows.id
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', empId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (notifs) {
          setNotifications(notifs.map(n => ({
            id: n.id,
            title: n.title,
            description: n.message,
            time: new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            read: n.is_read
          })))
        }
      }
    }
    fetchNotifs()

    let channel: any
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('employees').select('id').eq('auth_user_id', user.id).single().then(({ data: emp }) => {
        if (!emp) return
        channel = supabase.channel('notifs-' + emp.id)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + emp.id },
            (payload) => {
              const n = payload.new
              setNotifications(prev => [{
                id: n.id,
                title: n.title,
                description: n.message,
                time: new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                read: n.is_read
              }, ...prev].slice(0, 10))
            }
          )
          .subscribe()
      })
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase])

  const markAllAsRead = async () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: empRows } = await supabase.from('employees').select('id').eq('auth_user_id', user.id).single()
    if (empRows) {
      await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', empRows.id)
    }
  }

  // Do not render the top header on authentication pages
  if (pathname.startsWith("/auth")) {
    return null;
  }

  // Split path into segments: "/department/objectives/sub" -> ["department", "objectives", "sub"]
  const pathSegments = pathname.split('/').filter(Boolean)

  // Build the breadcrumb items dynamically, skipping the "department" root
  const breadcrumbItems: { label: string, href: string }[] = []
  
  if (pathname === '/' || pathname === '/department') {
    breadcrumbItems.push({ label: 'Dashboard', href: '/department' })
  } else {
    let currentPath = ''
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`
      
      // Skip the department base prefix in the UI
      if (segment === 'department' || segment === 'admin') return

            // Format the label nicely
      let label = segment.charAt(0).toUpperCase() + segment.slice(1)
      if (segment.toLowerCase() === 'kpis') label = 'KPI Tracking'
      if (segment.toLowerCase() === 'risks') label = 'Risk Register'

      if (uuidNames[segment]) {
        label = uuidNames[segment]
      } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
        label = "Loading..."
      }

      breadcrumbItems.push({ label, href: currentPath })
    })
  }

  
  const [uuidNames, setUuidNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchNames = async () => {
      const segments = pathname.split('/').filter(Boolean)
      const newNames: Record<string, string> = { ...uuidNames }
      let updated = false

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
          if (!newNames[segment]) {
            const prev = segments[i - 1]
            if (prev === 'objectives') {
              const { data } = await supabase.from('objective_definitions').select('objective_description').eq('id', segment).single()
              if (data) { newNames[segment] = data.objective_description; updated = true; }
            } else if (prev === 'kpis') {
              const { data } = await supabase.from('kpi_definitions').select('name').eq('id', segment).single()
              if (data) { newNames[segment] = data.name; updated = true; }
            } else if (prev === 'risks') {
              const { data } = await supabase.from('risk_definitions').select('name').eq('id', segment).single()
              if (data) { newNames[segment] = data.name; updated = true; }
            } else if (prev === 'users') {
              const { data } = await supabase.from('employees').select('first_name, last_name').eq('id', segment).single()
              if (data) { newNames[segment] = data.first_name + ' ' + data.last_name; updated = true; }
            } else if (prev === 'departments') {
              const { data } = await supabase.from('departments').select('department_name').eq('id', segment).single()
              if (data) { newNames[segment] = data.department_name; updated = true; }
            }
          }
        }
      }
      if (updated) setUuidNames(newNames)
    }
    fetchNames()
  }, [pathname, supabase])
  
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b bg-white px-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
      {/* ── Dynamic Breadcrumb Navigation ── */}
      <nav className="flex items-center text-sm font-medium text-muted-foreground">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          return (
            <div key={item.href} className="flex items-center">
              {index > 0 && <CaretRight className="h-4 w-4 mx-1 opacity-50" />}
              {isLast ? (
                <span className="text-foreground">{item.label}</span>
              ) : (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Right Side Actions ── */}
      <div className="flex items-center gap-4">
        {/* Notification Bell Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger 
            className="relative rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-muted-foreground hover:text-foreground outline-none"
            aria-label="View notifications"
          >
            <Bell className="h-4 w-4" />
            {/* Unread indicator dot */}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive border-2 border-white dark:border-zinc-950"></span>
              </span>
            )}
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-[360px] rounded-lg shadow-lg border-border dark:border-zinc-800 p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800/50">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-primary dark:text-primary hover:underline font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            {/* Notification List */}
            <div className="max-h-[350px] overflow-y-auto">
              {unreadCount === 0 ? (
                <div className="px-4 py-12 text-center flex flex-col items-center justify-center">
                  <p className="font-medium text-sm text-muted-foreground dark:text-muted-foreground">No unread notifications</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.filter(n => !n.read).map((notif) => (
                    <DropdownMenuItem 
                      key={notif.id} 
                      className="flex items-start gap-3 p-4 border-b last:border-0 border-slate-100 dark:border-zinc-800/50 cursor-pointer rounded-none focus:bg-muted dark:focus:bg-zinc-900/50"
                    >
                      <div className="mt-1 shrink-0">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-primary dark:bg-primary/100"></span>
                      </div>
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{notif.title}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{notif.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">{notif.description}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-100 dark:border-zinc-800/50 bg-muted/50 dark:bg-zinc-900/20 text-center">
              <button className="text-xs font-medium text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 w-full py-1.5 cursor-pointer transition-colors">
                View all activity
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
