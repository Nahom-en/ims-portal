"use client"
import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, ShieldWarning, ChartBar, ArrowRight } from "@phosphor-icons/react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const suffix = options?.addSuffix ? ' ago' : '';
  if (diffInSeconds < 60) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return diffInMinutes + ' minute' + (diffInMinutes !== 1 ? 's' : '') + suffix;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return diffInHours + ' hour' + (diffInHours !== 1 ? 's' : '') + suffix;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return diffInDays + ' day' + (diffInDays !== 1 ? 's' : '') + suffix;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return diffInMonths + ' month' + (diffInMonths !== 1 ? 's' : '') + suffix;
  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears + ' year' + (diffInYears !== 1 ? 's' : '') + suffix;
}

interface Props {
  departmentId?: string
  refreshKey?: number
}

type Activity = {
  id: string
  type: "objective" | "risk" | "kpi"
  action: string
  actor: string
  time: string
  date: Date
  icon: any
}

export function RecentActivity({ departmentId, refreshKey }: Props) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchActivity() {
      setLoading(true)
      
      // Fetch recent objective tracking
      let objQ = supabase.from('objective_tracking').select('id, created_at, status_vs_target, objective_id, objective_definitions!inner(objective_description, department_id), employees(id, first_name)').order('created_at', { ascending: false }).limit(5)
      
      // Fetch recent KPI measurements
      let kpiQ = supabase.from('kpi_measurements').select('id, created_at, status, kpi_id, kpi_definitions!inner(name, processes!inner(department_id)), employees(id, first_name)').order('created_at', { ascending: false }).limit(5)
      
      // Fetch recent Risk assessments
      let riskQ = supabase.from('risk_assessments').select('id, created_at, status, risk_id, risk_definitions!inner(name, risk_procedures!inner(department_id)), employees(id, first_name)').order('created_at', { ascending: false }).limit(5)
      
      if (departmentId && departmentId !== 'ALL') {
        objQ = objQ.eq('objective_definitions.department_id', departmentId)
        kpiQ = kpiQ.eq('kpi_definitions.processes.department_id', departmentId)
        riskQ = riskQ.eq('risk_definitions.risk_procedures.department_id', departmentId)
      }

      const [objs, kpis, risks] = await Promise.all([objQ, kpiQ, riskQ])
      
      const all: Activity[] = []
      
      if (objs.data) {
        objs.data.forEach((item: any) => {
          all.push({
            id: `obj-${item.id}`,
            type: "objective",
            action: `Updated progress on '${item.objective_definitions?.objective_description || 'Objective'}'`,
            actor: item.employees?.first_name || "User",
            date: new Date(item.created_at),
            time: formatDistanceToNow(new Date(item.created_at), { addSuffix: true }),
            icon: Target
          })
        })
      }
      
      if (kpis.data) {
        kpis.data.forEach((item: any) => {
          all.push({
            id: `kpi-${item.id}`,
            type: "kpi",
            action: `Recorded measurement for '${item.kpi_definitions?.name || 'KPI'}'`,
            actor: item.employees?.first_name || "User",
            date: new Date(item.created_at),
            time: formatDistanceToNow(new Date(item.created_at), { addSuffix: true }),
            icon: ChartBar
          })
        })
      }
      
      if (risks.data) {
        risks.data.forEach((item: any) => {
          all.push({
            id: `risk-${item.id}`,
            type: "risk",
            action: `Assessed risk '${item.risk_definitions?.name || 'Risk'}'`,
            actor: item.employees?.first_name || "User",
            date: new Date(item.created_at),
            time: formatDistanceToNow(new Date(item.created_at), { addSuffix: true }),
            icon: ShieldWarning
          })
        })
      }
      
      // Sort all combined descending by date and take top 5
      all.sort((a, b) => b.date.getTime() - a.date.getTime())
      setActivities(all.slice(0, 5))
      setLoading(false)
    }

    fetchActivity()
  }, [departmentId, refreshKey, supabase])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          <CardDescription>Latest updates across the department</CardDescription>
        </div>
        <div>
          <Link href="/department/requests" className="text-xs font-medium text-primary hover:underline flex items-center gap-1 w-max">
            View full audit log <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col">
        {loading ? (
          <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-zinc-800 before:to-transparent">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-6 last:pb-0">
                <Skeleton className="w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10" />
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border dark:border-zinc-800 bg-muted/50 dark:bg-zinc-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-full mb-1.5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No recent activity found.</div>
        ) : (
          <div className="space-y-6">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="mt-0.5 rounded-md p-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-muted-foreground">
                  <activity.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm font-medium leading-tight">{activity.action}</p>
                  <div className="flex items-center text-xs text-muted-foreground gap-2">
                    <span className="font-semibold text-foreground/70">{activity.actor}</span>
                    <span>•</span>
                    <span>{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
