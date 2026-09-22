import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Buildings, GitMerge, SquaresFour, UserCircleGear, UsersThree, UserPlus, Eye, CheckCircle } from "@phosphor-icons/react/dist/ssr"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch metrics
  const { count: usersCount } = await supabase.from('employees').select('id', { count: 'exact', head: true })
  const { count: deptsCount } = await supabase.from('departments').select('id', { count: 'exact', head: true })
  const { count: pendingCount } = await supabase.from('approval_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_APPROVAL')

  // Fetch role distribution
  const { data: roleData } = await supabase.from('employees').select('role')
  
  // Fetch Recent Onboarding
  const { data: recentUsers } = await supabase
    .from('employees')
    .select('id, firstname, lastname, email, created_at, departments(department_name)')
    .order('created_at', { ascending: false })
    .limit(5)
    
  // Fetch Workflow Config Status
  const { data: depts } = await supabase
    .from('departments')
    .select('id, department_name, workflow_templates(id)')
    
  const deptsWithWorkflows = depts?.filter(d => d.workflow_templates && d.workflow_templates.length > 0) || []
  const deptsWithoutWorkflows = depts?.filter(d => !d.workflow_templates || d.workflow_templates.length === 0) || []
  const roleDistribution = {
    'SYSTEM_ADMIN': 0,
    'DEPARTMENT_MANAGER': 0,
    'CONTRIBUTOR': 0,
    'VIEWER': 0
  }
  
  if (roleData) {
    roleData.forEach(user => {
      if (user.role && roleDistribution[user.role as keyof typeof roleDistribution] !== undefined) {
        roleDistribution[user.role as keyof typeof roleDistribution]++
      }
    })
  }

  const roleConfig = [
    { label: 'System Admins', key: 'SYSTEM_ADMIN', icon: UserCircleGear, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'Department Managers', key: 'DEPARTMENT_MANAGER', icon: UsersThree, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Contributors', key: 'CONTRIBUTOR', icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Viewers', key: 'VIEWER', icon: Eye, color: 'text-slate-500', bg: 'bg-slate-500/10' }
  ]

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto relative">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <SquaresFour className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">System Administration</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total System Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Departments Configured</CardTitle>
              <Buildings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deptsCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
              <GitMerge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Role Distribution</CardTitle>
              <CardDescription>Breakdown of assigned system access levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roleConfig.map((role) => {
                  const count = roleDistribution[role.key as keyof typeof roleDistribution]
                  const percentage = usersCount ? Math.round((count / usersCount) * 100) : 0
                  
                  return (
                    <div key={role.key} className="flex items-center gap-4">
                      <div className={`p-2 rounded-md ${role.bg}`}>
                        <role.icon className={`h-4 w-4 ${role.color}`} weight="fill" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium leading-none">{role.label}</p>
                          <span className="text-sm text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${role.bg.replace('/10', '')} transition-all`} 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Recent Onboarding</CardTitle>
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
          
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Workflow Configuration</CardTitle>
              <CardDescription>Departments with active routing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-400">
                    <CheckCircle weight="fill" className="h-5 w-5" />
                    Configured ({deptsWithWorkflows.length})
                  </div>
                </div>
                
                {deptsWithoutWorkflows.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-t-lg border border-b-0 border-amber-100 dark:border-amber-900/20">
                      <ShieldWarningIcon weight="fill" className="h-5 w-5" />
                      Missing Workflows ({deptsWithoutWorkflows.length})
                    </div>
                    <div className="border border-amber-100 dark:border-amber-900/20 rounded-b-lg border-t-0 p-3 bg-white dark:bg-zinc-900 space-y-2">
                      {deptsWithoutWorkflows.map((d: any) => (
                        <div key={d.id} className="text-sm flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">{d.department_name}</span>
                          <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">Action Required</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
