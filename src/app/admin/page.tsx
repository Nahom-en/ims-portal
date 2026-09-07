"use client"

import { 
  Building2, 
  Users, 
  Shield, 
  FileCheck,
  Activity,
  UserPlus,
  PlusCircle,
  ArrowRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

// ── Mock Data ──

const auditLogs = [
  {
    id: 1,
    user: "Nahom Tesfaye",
    action: "escalated system role to SUPER_ADMIN for",
    target: "Elena Tadesse",
    time: "10 mins ago",
    type: "Security",
  },
  {
    id: 2,
    user: "David Haile",
    action: "published and locked",
    target: "Q4 2025 Service Delivery Report",
    time: "2 hours ago",
    type: "Compliance",
  },
  {
    id: 3,
    user: "Sarah Mengistu",
    action: "created a new department:",
    target: "Security Operations",
    time: "5 hours ago",
    type: "Access",
  },
  {
    id: 4,
    user: "Nahom Tesfaye",
    action: "suspended user account for",
    target: "Amir Kebede",
    time: "Yesterday",
    type: "Security",
  },
  {
    id: 5,
    user: "System",
    action: "auto-archived",
    target: "Legacy Hardware Objectives",
    time: "2 days ago",
    type: "Compliance",
  }
]

export default function AdminDashboardPage() {
  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto relative">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-slate-800 dark:text-slate-200" />
          <h1 className="text-2xl font-bold tracking-tight">System Administration</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Global overview of IMS compliance, access controls, and system health.
        </p>
      </div>

      {/* ── Top Row: Snapshot Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Departments</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center">
              100% Configured
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registered Users</CardTitle>
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">148</p>
            <p className="text-xs text-muted-foreground mt-1">
              Active across all branches
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Privileged Accounts</CardTitle>
            <Shield className="h-4 w-4 text-rose-600 dark:text-rose-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">14</p>
            <p className="text-xs text-muted-foreground mt-1">
              Super Admins & Dept Heads
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published Reports</CardTitle>
            <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">42</p>
            <p className="text-xs text-muted-foreground mt-1">
              Historically locked records
            </p>
          </CardContent>
        </Card>

      </div>

      {/* ── Main Body: 2/3 and 1/3 Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        
        {/* Left Column: Audit Log (60% width) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">System Audit Log</CardTitle>
              <CardDescription>Recent administrative and compliance events.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-6">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4">
                    {/* Icon indicator based on type */}
                    <div className="mt-0.5">
                      {log.type === "Security" && (
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full">
                          <Shield className="h-4 w-4" />
                        </div>
                      )}
                      {log.type === "Compliance" && (
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                          <FileCheck className="h-4 w-4" />
                        </div>
                      )}
                      {log.type === "Access" && (
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                          <Users className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    
                    {/* Log Content */}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm leading-snug">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{log.user}</span>{" "}
                        <span className="text-muted-foreground">{log.action}</span>{" "}
                        <span className="font-medium text-slate-900 dark:text-slate-200">{log.target}</span>.
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{log.time}</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-xs font-medium text-muted-foreground">{log.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 border-t dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/30 text-center rounded-b-xl">
              <Link 
                href="/admin/activity"
                className={cn(
                  buttonVariants({ variant: "ghost" }), 
                  "text-xs w-full text-blue-600 hover:text-blue-700 dark:text-blue-400"
                )}
              >
                View Full Audit History
                <ArrowRight className="h-3 w-3 ml-2" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Right Column: Role Distribution & Actions (40% width) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Quick Actions */}
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link 
                href="/admin/users"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full justify-start bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 shadow-sm"
                )}
              >
                <UserPlus className="h-4 w-4 mr-2 text-indigo-500" />
                Add New User
              </Link>
              <Link 
                href="/admin/departments"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full justify-start bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 shadow-sm"
                )}
              >
                <PlusCircle className="h-4 w-4 mr-2 text-blue-500" />
                Configure Department
              </Link>
            </CardContent>
          </Card>

          {/* Role Distribution */}
          <Card className="border-slate-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Role Distribution</CardTitle>
              <CardDescription>Allocation of active system licenses.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                
                {/* Super Admins */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-2 h-2 rounded-full p-0 bg-rose-500 border-rose-500"></Badge>
                    <span className="text-sm font-medium">Super Admins</span>
                  </div>
                  <span className="text-sm font-bold">2</span>
                </div>
                
                {/* Dept Heads */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-2 h-2 rounded-full p-0 bg-indigo-500 border-indigo-500"></Badge>
                    <span className="text-sm font-medium">Dept Heads</span>
                  </div>
                  <span className="text-sm font-bold">12</span>
                </div>

                {/* Contributors */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-2 h-2 rounded-full p-0 bg-blue-500 border-blue-500"></Badge>
                    <span className="text-sm font-medium">Contributors</span>
                  </div>
                  <span className="text-sm font-bold">45</span>
                </div>

                {/* Viewers */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-2 h-2 rounded-full p-0 bg-slate-400 border-slate-400"></Badge>
                    <span className="text-sm font-medium">Viewers</span>
                  </div>
                  <span className="text-sm font-bold">89</span>
                </div>

                {/* Total Bar */}
                <div className="pt-4 border-t dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Total Licenses</span>
                    <span className="text-xs font-semibold">148 / 250</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-rose-500" style={{ width: '1.3%' }}></div>
                    <div className="h-full bg-indigo-500" style={{ width: '8.1%' }}></div>
                    <div className="h-full bg-blue-500" style={{ width: '30.4%' }}></div>
                    <div className="h-full bg-slate-400" style={{ width: '60.1%' }}></div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
