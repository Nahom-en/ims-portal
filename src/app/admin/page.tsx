import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Users,
  Buildings,
  GitMerge,
  SquaresFour,
  UserCircleGear,
  Eye,
  PencilSimple,
  Warning,
  CheckCircle,
  ArrowRight,
  Target,
  ChartBar,
  ShieldWarning,
  LinkBreak,
} from "@phosphor-icons/react/dist/ssr"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // ── Data Fetching ──────────────────────────────────────────

  // 1. Users & Roles
  const { data: allEmployees } = await supabase.from("employees").select("id, role, is_active")
  const activeUsers = allEmployees?.filter((e) => e.is_active) || []
  const roleCounts: Record<string, number> = {
    SYSTEM_ADMIN: 0,
    WRITER: 0,
    VIEWER: 0,
  }
  activeUsers.forEach((u) => {
    const r = u.role as string
    if (roleCounts[r] !== undefined) roleCounts[r]++
  })

  // 2. Departments & Workflow Coverage
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

  // 3. Pending Approvals
  const { data: pendingApprovals } = await supabase
    .from("approval_requests")
    .select("id, created_at")
    .eq("status", "PENDING_APPROVAL")
  const pendingCount = pendingApprovals?.length || 0
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const stalledCount = pendingApprovals?.filter(
    (a) => a.created_at && a.created_at < fourteenDaysAgo
  ).length || 0

  // 4. Data Gaps (orphaned KPIs and Risks)
  const { count: orphanedKpis } = await supabase
    .from("kpi_definitions")
    .select("id", { count: "exact", head: true })
    .is("process_id", null)
  const { count: orphanedRisks } = await supabase
    .from("risk_definitions")
    .select("id", { count: "exact", head: true })
    .is("procedure_id", null)

  // 5. Department Adoption — counts per department
  const deptAdoption = await Promise.all(
    (depts || []).map(async (dept: any) => {
      const { count: objCount } = await supabase
        .from("objective_definitions")
        .select("id", { count: "exact", head: true })
        .eq("department_id", dept.id)
        .eq("is_active", true)

      // For KPIs, count via processes belonging to this department
      const { data: procs } = await supabase
        .from("processes")
        .select("id")
        .eq("department_id", dept.id)
      const procIds = procs?.map((p: any) => p.id) || []
      let kpiCount = 0
      if (procIds.length > 0) {
        const { count } = await supabase
          .from("kpi_definitions")
          .select("id", { count: "exact", head: true })
          .in("process_id", procIds)
        kpiCount = count || 0
      }

      // For Risks, count via risk_procedures belonging to this department
      const { data: riskProcs } = await supabase
        .from("risk_procedures")
        .select("id")
        .eq("department_id", dept.id)
      const riskProcIds = riskProcs?.map((p: any) => p.id) || []
      let deptRiskCount = 0
      if (riskProcIds.length > 0) {
        const { count } = await supabase
          .from("risk_definitions")
          .select("id", { count: "exact", head: true })
          .in("procedure_id", riskProcIds)
        deptRiskCount = count || 0
      }

      return {
        name: dept.department_name,
        objectives: objCount || 0,
        kpis: kpiCount,
        risks: deptRiskCount,
      }
    })
  )

  // Find the max value across all departments for scaling the bars
  const maxAdoption = Math.max(
    ...deptAdoption.flatMap((d) => [d.objectives, d.kpis, d.risks]),
    1
  )

  // 6. Recent Users
  const { data: recentUsers } = await supabase
    .from("employees")
    .select("id, firstname, lastname, email, role, created_at, departments(department_name)")
    .order("created_at", { ascending: false })
    .limit(5)

  // 7. Setup Warnings
  const warnings: { message: string }[] = []

  deptsWithoutWorkflow.forEach((d: any) => {
    warnings.push({
      message: `"${d.department_name}" has no approval chain configured.`,
    })
  })
  if ((orphanedKpis || 0) > 0) {
    warnings.push({
      message: `${orphanedKpis} KPI definition${orphanedKpis! > 1 ? "s" : ""} missing a linked Process.`,
    })
  }
  if ((orphanedRisks || 0) > 0) {
    warnings.push({
      message: `${orphanedRisks} Risk definition${orphanedRisks! > 1 ? "s" : ""} missing a linked Procedure.`,
    })
  }
  if (stalledCount > 0) {
    warnings.push({
      message: `${stalledCount} approval request${stalledCount > 1 ? "s" : ""} stalled for over 14 days.`,
    })
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SquaresFour className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">System Administration</h1>
      </div>

      {/* ── Section 1: Top Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users & Roles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users & Roles</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold tracking-tight">{activeUsers.length}</div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                <UserCircleGear className="h-3 w-3" weight="fill" />
                {roleCounts.SYSTEM_ADMIN} Admin{roleCounts.SYSTEM_ADMIN !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <PencilSimple className="h-3 w-3" weight="fill" />
                {roleCounts.WRITER} Writer{roleCounts.WRITER !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <Eye className="h-3 w-3" weight="fill" />
                {roleCounts.VIEWER} Viewer{roleCounts.VIEWER !== 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Setup */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workflow Setup</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <GitMerge className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight">{deptsWithWorkflow.length}</span>
              <span className="text-sm text-muted-foreground">of {totalDepts} departments</span>
            </div>
            {deptsWithoutWorkflow.length > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-xs font-medium">
                <Warning className="h-3 w-3" weight="fill" />
                {deptsWithoutWorkflow.length} unconfigured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle className="h-3 w-3" weight="fill" />
                All covered
              </span>
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <GitMerge className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold tracking-tight">{pendingCount}</div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                {pendingCount} waiting
              </span>
              {stalledCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  {stalledCount} stalled
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Gaps */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Data Gaps</CardTitle>
            <div className="p-2 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <LinkBreak className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold tracking-tight">{(orphanedKpis || 0) + (orphanedRisks || 0)}</div>
            <div className="flex items-center gap-2 text-xs font-medium">
              {(orphanedKpis || 0) + (orphanedRisks || 0) === 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3" weight="fill" />
                  All linked
                </span>
              ) : (
                <>
                  {(orphanedKpis || 0) > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                      {orphanedKpis} KPI{orphanedKpis! > 1 ? "s" : ""} unlinked
                    </span>
                  )}
                  {(orphanedRisks || 0) > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                      {orphanedRisks} Risk{orphanedRisks! > 1 ? "s" : ""} unlinked
                    </span>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 2: Department Adoption ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Usage by Department</CardTitle>
          <CardDescription>How many Objectives, KPIs, and Risks each department has registered</CardDescription>
        </CardHeader>
        <CardContent>
          {deptAdoption.length === 0 ? (
            <p className="text-sm text-muted-foreground">No departments found.</p>
          ) : (
            <div className="space-y-5">
              {deptAdoption.map((dept) => (
                <div key={dept.name} className="space-y-2">
                  <p className="text-sm font-medium">{dept.name}</p>
                  <div className="space-y-1.5">
                    {/* Objectives */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-24 text-xs text-muted-foreground shrink-0">
                        <Target className="h-3.5 w-3.5 text-blue-500" />
                        Objectives
                      </div>
                      <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${Math.max((dept.objectives / maxAdoption) * 100, dept.objectives > 0 ? 12 : 0)}%` }}
                        >
                          {dept.objectives > 0 && (
                            <span className="text-[10px] font-bold text-white">{dept.objectives}</span>
                          )}
                        </div>
                      </div>
                      {dept.objectives === 0 && <span className="text-xs text-muted-foreground w-4">0</span>}
                    </div>
                    {/* KPIs */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-24 text-xs text-muted-foreground shrink-0">
                        <ChartBar className="h-3.5 w-3.5 text-emerald-500" />
                        KPIs
                      </div>
                      <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${Math.max((dept.kpis / maxAdoption) * 100, dept.kpis > 0 ? 12 : 0)}%` }}
                        >
                          {dept.kpis > 0 && (
                            <span className="text-[10px] font-bold text-white">{dept.kpis}</span>
                          )}
                        </div>
                      </div>
                      {dept.kpis === 0 && <span className="text-xs text-muted-foreground w-4">0</span>}
                    </div>
                    {/* Risks */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-24 text-xs text-muted-foreground shrink-0">
                        <ShieldWarning className="h-3.5 w-3.5 text-rose-500" />
                        Risks
                      </div>
                      <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${Math.max((dept.risks / maxAdoption) * 100, dept.risks > 0 ? 12 : 0)}%` }}
                        >
                          {dept.risks > 0 && (
                            <span className="text-[10px] font-bold text-white">{dept.risks}</span>
                          )}
                        </div>
                      </div>
                      {dept.risks === 0 && <span className="text-xs text-muted-foreground w-4">0</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 3 & 4: Warnings + Quick Actions + Recent Users ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setup Warnings */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Setup Warnings</CardTitle>
            <CardDescription>Configuration issues that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {warnings.length === 0 ? (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
                <CheckCircle weight="fill" className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">All systems healthy — no issues detected.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/20"
                  >
                    <Warning weight="fill" className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-400">{w.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/users" className="block">
              <Button variant="outline" className="w-full justify-between h-12 text-left">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manage Users
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
            <Link href="/admin/departments" className="block">
              <Button variant="outline" className="w-full justify-between h-12 text-left">
                <span className="flex items-center gap-2">
                  <Buildings className="h-4 w-4" />
                  Manage Departments
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
            <Link href="/admin/departments" className="block">
              <Button variant="outline" className="w-full justify-between h-12 text-left">
                <span className="flex items-center gap-2">
                  <GitMerge className="h-4 w-4" />
                  Configure Workflows
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Recent Users</CardTitle>
            <CardDescription>Latest users added to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers && recentUsers.length > 0 ? (
                recentUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{user.firstname} {user.lastname}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {user.departments?.department_name || "No Dept"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent users.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
