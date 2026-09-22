import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Users,
  Buildings,
  GitMerge,
  SquaresFour,
  ArrowRight,
  Info,
  LinkBreak,
  ArrowUp,
  ArrowDown,
} from "@phosphor-icons/react/dist/ssr"
import { SystemActivityChart } from "@/components/admin/SystemActivityChart"
import { DepartmentUsageList } from "@/components/admin/DepartmentUsageList"
import { SetupWarnings } from "@/components/admin/SetupWarnings"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // ── 1. Users & Roles ──
  const { data: allEmployees } = await supabase.from("employees").select("id, role, is_active, created_at")
  const activeUsers = allEmployees?.filter((e) => e.is_active) || []
  const roleCounts: Record<string, number> = { SYSTEM_ADMIN: 0, WRITER: 0, VIEWER: 0 }
  activeUsers.forEach((u) => {
    const r = u.role as string
    if (roleCounts[r] !== undefined) roleCounts[r]++
  })
  // Delta: users added in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const newUsersCount = allEmployees?.filter((e) => e.created_at && e.created_at > thirtyDaysAgo).length || 0

  // ── 2. Departments & Workflow Coverage ──
  const { data: depts } = await supabase
    .from("departments")
    .select("id, department_name, workflow_templates(id)")
  const totalDepts = depts?.length || 0
  const deptsWithWorkflow = depts?.filter(
    (d: any) => d.workflow_templates && d.workflow_templates.length > 0
  ) || []
  const deptsWithoutWorkflow = depts?.filter(
    (d: any) => !d.workflow_templates || d.workflow_templates.length === 0
  ) || []

  // ── 3. Pending Approvals ──
  const { data: pendingApprovals } = await supabase
    .from("approval_requests")
    .select("id, created_at, status")
  const allApprovals = pendingApprovals || []
  const pendingCount = allApprovals.filter((a) => a.status === "PENDING_APPROVAL").length
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const stalledCount = allApprovals.filter(
    (a) => a.status === "PENDING_APPROVAL" && a.created_at && a.created_at < fourteenDaysAgo
  ).length

  // Approval breakdown for the pipeline card
  const approvedCount = allApprovals.filter((a) => a.status === "APPROVED").length
  const rejectedCount = allApprovals.filter((a) => a.status === "REJECTED").length
  const totalApprovals = allApprovals.length

  // ── 4. Data Gaps ──
  const { count: orphanedKpis } = await supabase
    .from("kpi_definitions")
    .select("id", { count: "exact", head: true })
    .is("process_id", null)
  const { count: orphanedRisks } = await supabase
    .from("risk_definitions")
    .select("id", { count: "exact", head: true })
    .is("procedure_id", null)
  const totalGaps = (orphanedKpis || 0) + (orphanedRisks || 0)

  // ── 5. Department Adoption ──
  const deptAdoption = await Promise.all(
    (depts || []).map(async (dept: any) => {
      const { count: objCount } = await supabase
        .from("objective_definitions")
        .select("id", { count: "exact", head: true })
        .eq("department_id", dept.id)
        .eq("is_active", true)

      const { data: procs } = await supabase.from("processes").select("id").eq("department_id", dept.id)
      const procIds = procs?.map((p: any) => p.id) || []
      let kpiCount = 0
      if (procIds.length > 0) {
        const { count } = await supabase.from("kpi_definitions").select("id", { count: "exact", head: true }).in("process_id", procIds)
        kpiCount = count || 0
      }

      const { data: riskProcs } = await supabase.from("risk_procedures").select("id").eq("department_id", dept.id)
      const riskProcIds = riskProcs?.map((p: any) => p.id) || []
      let deptRiskCount = 0
      if (riskProcIds.length > 0) {
        const { count } = await supabase.from("risk_definitions").select("id", { count: "exact", head: true }).in("procedure_id", riskProcIds)
        deptRiskCount = count || 0
      }

      return { name: dept.department_name, objectives: objCount || 0, kpis: kpiCount, risks: deptRiskCount }
    })
  )

  // ── 6. Recent Users ──
  const { data: recentUsers } = await supabase
    .from("employees")
    .select("id, firstname, lastname, email, role, created_at, departments(department_name)")
    .order("created_at", { ascending: false })
    .limit(5)

  // ── 7. Setup Warnings ──
  const warnings: { id: string; message: string; action?: { label: string; href: string } }[] = []
  deptsWithoutWorkflow.forEach((d: any) => {
    warnings.push({
      id: `wf-${d.id}`,
      message: `"${d.department_name}" has no approval chain configured.`,
      action: { label: "Configure now", href: "/admin/departments" },
    })
  })
  if ((orphanedKpis || 0) > 0) {
    warnings.push({
      id: "gap-kpi",
      message: `${orphanedKpis} KPI definition${orphanedKpis! > 1 ? "s" : ""} missing a linked Process.`,
    })
  }
  if ((orphanedRisks || 0) > 0) {
    warnings.push({
      id: "gap-risk",
      message: `${orphanedRisks} Risk definition${orphanedRisks! > 1 ? "s" : ""} missing a linked Procedure.`,
    })
  }
  if (stalledCount > 0) {
    warnings.push({
      id: "stalled",
      message: `${stalledCount} approval request${stalledCount > 1 ? "s" : ""} stalled for over 14 days.`,
    })
  }

  // Department options for the chart filter
  const deptOptions = (depts || []).map((d: any) => ({ id: d.id, name: d.department_name }))

  // ── Render ──
  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SquaresFour className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">System Administration</h1>
        </div>
      </div>

      {/* ── Top Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users & Roles */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users & Roles</CardTitle>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground" /></span>}></TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">Total active users in the system, broken down by their assigned access level.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold tracking-tight">{activeUsers.length}</span>
              {newUsersCount > 0 && (
                <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  <ArrowUp className="h-3 w-3" weight="bold" />
                  {newUsersCount} new
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {roleCounts.SYSTEM_ADMIN} Admin · {roleCounts.WRITER} Writer{roleCounts.WRITER !== 1 ? "s" : ""} · {roleCounts.VIEWER} Viewer{roleCounts.VIEWER !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

{/* Workflow Setup */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workflow Setup</CardTitle>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground" /></span>}></TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">Departments that have a configured approval chain for processing submissions.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{deptsWithWorkflow.length}</span>
                <span className="text-sm text-muted-foreground">/ {totalDepts}</span>
              </div>
              {deptsWithoutWorkflow.length > 0 ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                  {deptsWithoutWorkflow.length} unconfigured
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  All linked ✓
                </Badge>
              )}
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              {deptsWithoutWorkflow.length > 0 ? "Some departments lack approval chains" : "All departments can process submissions"}
            </p>
          </CardContent>
        </Card>

{/* Pending Approvals */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground" /></span>}></TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">Total waiting approval requests. Stalled requests have been pending for over 14 days.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold tracking-tight">{pendingCount}</span>
              {stalledCount > 0 && (
                <Badge variant="outline" className="gap-1 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                  <ArrowDown className="h-3 w-3" weight="bold" />
                  {stalledCount} stalled
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{pendingCount} waiting across all departments</p>
          </CardContent>
        </Card>

{/* Data Gaps */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Data Gaps</CardTitle>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground" /></span>}></TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">KPIs or Risks missing a parent link (Process or Procedure) won't appear in dashboards.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold tracking-tight">{totalGaps}</span>
              {totalGaps === 0 ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  All linked ✓
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                  Action required
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {(orphanedKpis || 0)} KPI{(orphanedKpis || 0) !== 1 ? "s" : ""} · {(orphanedRisks || 0)} Risk{(orphanedRisks || 0) !== 1 ? "s" : ""} unlinked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Chart + Pipeline Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SystemActivityChart departments={deptOptions} />
        </div>

        {/* Approval Pipeline Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Approval Pipeline</CardTitle>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm text-muted-foreground">Total Requests</span>
              <span className="text-sm font-semibold">{totalApprovals}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {totalApprovals === 0 ? (
              <p className="text-sm text-muted-foreground">No approval requests yet.</p>
            ) : (
              <>
                {/* Approved */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Approved</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {totalApprovals > 0 ? Math.round((approvedCount / totalApprovals) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Pending */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="text-lg font-bold text-amber-600">
                      {totalApprovals > 0 ? Math.round((pendingCount / totalApprovals) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${totalApprovals > 0 ? (pendingCount / totalApprovals) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Rejected */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rejected</span>
                    <span className="text-lg font-bold text-rose-600">
                      {totalApprovals > 0 ? Math.round((rejectedCount / totalApprovals) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all"
                      style={{ width: `${totalApprovals > 0 ? (rejectedCount / totalApprovals) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Usage (searchable/sortable) */}
        <div className="lg:col-span-1">
          <DepartmentUsageList departments={deptOptions} />
        </div>

        {/* Setup Warnings (dismissable) */}
        <div className="lg:col-span-1">
          <SetupWarnings warnings={warnings} />
        </div>

        {/* Recent Users + Quick Actions */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Users</CardTitle>
            <Link href="/admin/users" className="text-xs font-medium text-primary hover:underline underline-offset-2">
              View All →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers && recentUsers.length > 0 ? (
              recentUsers.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.firstname} {user.lastname}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {user.departments?.department_name || "—"}
                    </span>
                    <Link href="/admin/users" className="text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            )}

            {/* Quick Actions */}
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/admin/users">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Users
                  </Button>
                </Link>
                <Link href="/admin/departments">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                    <Buildings className="h-3.5 w-3.5" /> Departments
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
