"use client"
import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, CheckCircle } from "@phosphor-icons/react"
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
  employeeId?: string
  refreshKey?: number
}

type Action = {
  id: string
  title: string
  due: string
  priority: "high" | "medium" | "low"
  icon: any
}

export function PendingActions({ employeeId, refreshKey }: Props) {
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchActions() {
      if (!employeeId) return;
      setLoading(true)
      
      // Get employee's department
      const { data: emp } = await supabase.from('employees').select('department_id').eq('id', employeeId).single()
      if (!emp || !emp.department_id) {
        setActions([])
        setLoading(false)
        return
      }

      // Get pending approvals for this department (via the requester's department)
      const { data: reqs } = await supabase
        .from('approval_requests')
        .select('id, entity_type, created_at, employees!inner(department_id, first_name, last_name)')
        .eq('status', 'PENDING_APPROVAL')
        .eq('employees.department_id', emp.department_id)
        .order('created_at', { ascending: false })
        .limit(3)
        
      if (reqs && reqs.length > 0) {
        setActions(reqs.map((r: any) => {
          const isOld = new Date(r.created_at).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000
          const typeName = r.entity_type.charAt(0).toUpperCase() + r.entity_type.slice(1)
          return {
            id: r.id,
            title: `Review ${typeName} Submission from ${r.employees?.first_name || 'User'}`,
            due: formatDistanceToNow(new Date(r.created_at), { addSuffix: true }),
            priority: isOld ? 'high' : 'medium',
            icon: Clock
          }
        }))
      } else {
        setActions([])
      }
      
      setLoading(false)
    }

    fetchActions()
  }, [employeeId, refreshKey, supabase])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
        <CardDescription>Tasks requiring attention in your department</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground gap-2">
            <CheckCircle weight="duotone" className="h-10 w-10 text-emerald-500 mb-1" />
            <p>You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {actions.map((action) => (
              <div key={action.id} className="flex items-start gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className={`mt-0.5 rounded-full p-2 ${action.priority === 'high' ? 'bg-destructive/20 text-destructive dark:bg-rose-950/50' : action.priority === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold leading-none">{action.title}</p>
                  <p className="text-xs font-medium text-muted-foreground">Submitted: {action.due}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
