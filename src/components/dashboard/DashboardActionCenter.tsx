/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Target, 
  ChartBar, 
  ShieldWarning, 
  PaperPlaneRight, 
  Plus
} from "@phosphor-icons/react"
import { createClient } from "@/lib/supabase/client"
import type { Employee } from "@/lib/employee-context"

function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }) {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  const suffix = options?.addSuffix ? " ago" : ""
  if (diffInSeconds < 60) return "just now"
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m${suffix}`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h${suffix}`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `${diffInDays}d${suffix}`
  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `${diffInMonths}mo${suffix}`
  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears}y${suffix}`
}

interface ActionCenterItem {
  id: string
  entityType: "objective" | "kpi" | "risk"
  title: string
  changeType: "NEW" | "UPDATE" | "DELETE"
  requesterName: string
  departmentName: string
  currentStepLabel: string
  status: "Pending Approval" | "Published" | "Rejected"
  createdAt: string
  timeAgo: string
  targetQuarter?: string
  targetYear?: string
}

interface Props {
  employee: Employee | null
  refreshKey?: number
}

export function DashboardActionCenter({ employee, refreshKey }: Props) {
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<ActionCenterItem[]>([])
  const [totalApprovalsCount, setTotalApprovalsCount] = useState(0)
  const [requests, setRequests] = useState<ActionCenterItem[]>([])
  const [totalRequestsCount, setTotalRequestsCount] = useState(0)

  const isApprover = Boolean(employee?.is_approver)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      if (!employee?.id) {
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        if (isApprover) {
          // ── Fetch for Approver ──
          // 1. Fetch pending approval requests
          const { data: reqs } = await supabase
            .from("approval_requests")
            .select("*")
            .in("status", ["PENDING_APPROVAL", "PENDING"])
            .order("created_at", { ascending: false })

          // 2. Lookups
          const [deptsRes, templatesRes, empsRes] = await Promise.all([
            supabase.from("departments").select("id, department_name, manager_id"),
            supabase.from("workflow_templates").select("id, department_id, steps"),
            supabase.from("employees").select("id, firstname, lastname")
          ])

          const deptsMap = new Map((deptsRes.data || []).map(d => [d.id, d]))
          const templatesMap = new Map((templatesRes.data || []).map(t => [t.department_id, t.steps]))
          const empsMap = new Map((empsRes.data || []).map(e => [e.id, `${e.firstname || ""} ${e.lastname || ""}`.trim()]))

          const pendingForMe: ActionCenterItem[] = []

          for (const r of reqs || []) {
            const dept = deptsMap.get(r.department_id)
            const deptManagerId = dept?.manager_id
            const rawSteps = templatesMap.get(r.department_id)
            const steps = Array.isArray(rawSteps) ? rawSteps : []

            const currentIndex = r.current_step_index ?? 0
            let isMyTurn = false
            let stepLabel = "Review"

            if (currentIndex === -1) {
              stepLabel = "Pre-Approval"
              if (deptManagerId === employee.id || employee.role === "SYSTEM_ADMIN") {
                isMyTurn = true
              }
            } else if (steps.length > 0 && currentIndex >= 0 && currentIndex < steps.length) {
              const currentStep = steps[currentIndex]
              stepLabel = currentStep?.label || `Step ${currentIndex + 1}`
              const stepApproverId = currentStep?.approverId || currentStep?.approver_id
              const stepRoleId = currentStep?.roleId || currentStep?.role_id

              if (stepApproverId === employee.id) {
                isMyTurn = true
              } else if (stepRoleId && stepRoleId === employee.company_role_id) {
                isMyTurn = true
              } else if (employee.role === "SYSTEM_ADMIN") {
                isMyTurn = true
              }
            } else if (steps.length === 0 && employee.role === "SYSTEM_ADMIN") {
              isMyTurn = true
            }

            if (isMyTurn) {
              let itemName = ""
              if (r.payload) {
                itemName = r.payload.objective_description ||
                  r.payload.kpi_name ||
                  r.payload.risk_statement ||
                  r.payload.title ||
                  r.payload.name ||
                  ""
              }
              if (!itemName) {
                itemName = `${r.entity_type.toUpperCase()} Request #${r.id.slice(0, 8)}`
              }

              const meta = r.custom_metadata || {}
              const changeType = (meta.change_type || "NEW").toUpperCase() as "NEW" | "UPDATE" | "DELETE"
              const requesterName = empsMap.get(r.requested_by) || "Department Member"
              const departmentName = dept?.department_name || "Department"

              pendingForMe.push({
                id: r.id,
                entityType: (r.entity_type || "objective").toLowerCase() as any,
                title: itemName,
                changeType,
                requesterName,
                departmentName,
                currentStepLabel: stepLabel,
                status: "Pending Approval",
                createdAt: r.created_at || new Date().toISOString(),
                timeAgo: formatDistanceToNow(new Date(r.created_at || Date.now()), { addSuffix: true }),
              })
            }
          }

          setTotalApprovalsCount(pendingForMe.length)
          setApprovals(pendingForMe.slice(0, 3))
        } else {
          // ── Fetch for Non-Approver (My Requests) ──
          const { data: myReqs } = await supabase
            .from("approval_requests")
            .select("*")
            .eq("requested_by", employee.id)
            .order("created_at", { ascending: false })
            .limit(20)

          const mapped: ActionCenterItem[] = (myReqs || []).map(r => {
            let itemName = ""
            if (r.payload) {
              itemName = r.payload.objective_description ||
                r.payload.kpi_name ||
                r.payload.risk_statement ||
                r.payload.title ||
                r.payload.name ||
                ""
            }
            if (!itemName) {
              itemName = `${r.entity_type?.toUpperCase() || "Item"} Request`
            }

            const rawStatus = (r.status || "PENDING_APPROVAL").toUpperCase()
            let statusLabel: "Pending Approval" | "Published" | "Rejected" = "Pending Approval"
            if (rawStatus === "PUBLISHED" || rawStatus === "APPROVED") statusLabel = "Published"
            else if (rawStatus === "REJECTED") statusLabel = "Rejected"

            const meta = r.custom_metadata || {}
            const changeType = (meta.change_type || "NEW").toUpperCase() as "NEW" | "UPDATE" | "DELETE"

            return {
              id: r.id,
              entityType: (r.entity_type || "objective").toLowerCase() as any,
              title: itemName,
              changeType,
              requesterName: `${employee.firstname || ""} ${employee.lastname || ""}`.trim(),
              departmentName: "",
              currentStepLabel: statusLabel === "Pending Approval" ? "In Review" : statusLabel,
              status: statusLabel,
              createdAt: r.created_at || new Date().toISOString(),
              timeAgo: formatDistanceToNow(new Date(r.created_at || Date.now()), { addSuffix: true }),
            }
          })

          setTotalRequestsCount(mapped.length)
          setRequests(mapped.slice(0, 3))
        }
      } catch (err) {
        console.error("Error fetching dashboard action center items:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [employee?.id, employee?.role, employee?.company_role_id, isApprover, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Helper renderers
  function renderTypeIcon(type: "objective" | "kpi" | "risk") {
    switch (type) {
      case "objective":
        return <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case "kpi":
        return <ChartBar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      case "risk":
        return <ShieldWarning className="h-4 w-4 text-amber-600 dark:text-amber-400" />
    }
  }

  function renderTypeBadge(type: "objective" | "kpi" | "risk", changeType: "NEW" | "UPDATE" | "DELETE") {
    const badgeStyles = {
      objective: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
      kpi: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
      risk: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    }

    const changeLabels = {
      NEW: "Create",
      UPDATE: "Update",
      DELETE: "Delete",
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={`text-xs font-medium uppercase tracking-wider capitalize ${badgeStyles[type] || ""}`}>
          {type}
        </Badge>
        {changeType !== "NEW" && (
          <span className="text-[11px] font-semibold text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-muted">
            {changeLabels[changeType] || changeType}
          </span>
        )}
      </div>
    )
  }

  function renderStatusBadge(status: "Pending Approval" | "Published" | "Rejected") {
    switch (status) {
      case "Published":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
            Approved & Published
          </Badge>
        )
      case "Rejected":
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
            Returned for Revision
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400">
            In Review
          </Badge>
        )
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b">
        <div>
          <div className="flex items-center gap-2">
            {isApprover ? (
              <CheckCircle className="h-5 w-5 text-primary" weight="bold" />
            ) : (
              <PaperPlaneRight className="h-5 w-5 text-primary" weight="bold" />
            )}
            <CardTitle className="text-base font-semibold">
              {isApprover ? "My Approvals" : "My Requests"}
            </CardTitle>
            {isApprover ? (
              totalApprovalsCount > 0 ? (
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 text-xs font-semibold">
                  {totalApprovalsCount} Action Required
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Up to date
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {totalRequestsCount} {totalRequestsCount === 1 ? "Request" : "Requests"}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs mt-0.5">
            {isApprover 
              ? "Pending departmental requests waiting for your review and decision." 
              : "Track the status of your submitted Objectives, KPIs, and Risks."}
          </CardDescription>
        </div>

        <div>
          {isApprover ? (
            <Link 
              href="/department/approvals" 
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1 w-max"
            >
              View all approvals ({totalApprovalsCount}) <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <Link 
              href="/department/requests" 
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1 w-max"
            >
              View all my requests <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            ))}
          </div>
        ) : isApprover ? (
          /* ── APPROVER VIEW ── */
          approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
              <CheckCircle weight="duotone" className="h-10 w-10 text-emerald-500 mb-1" />
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">You&apos;re all caught up!</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                There are no pending requests currently waiting for your review or approval.
              </p>
              <Button variant="outline" size="sm" render={<Link href="/department/approvals?tab=approved" />} className="mt-2 text-xs">
                View approval history
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[45%] font-semibold text-xs">Request / Item</TableHead>
                    <TableHead className="font-semibold text-xs">Type</TableHead>
                    <TableHead className="font-semibold text-xs">Submitted By</TableHead>
                    <TableHead className="font-semibold text-xs">Time</TableHead>
                    <TableHead className="text-right font-semibold text-xs pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 p-1 rounded-md bg-muted">
                            {renderTypeIcon(item.entityType)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.currentStepLabel}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {renderTypeBadge(item.entityType, item.changeType)}
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {item.requesterName}
                        </span>
                        {item.departmentName && (
                          <p className="text-[11px] text-muted-foreground">{item.departmentName}</p>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground/70" />
                          {item.timeAgo}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4">
                        <Button
                          size="sm"
                          render={<Link href="/department/approvals" />}
                          className="h-7 text-xs bg-primary hover:bg-primary/90 text-white gap-1"
                        >
                          Review & Decide
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          /* ── NON-APPROVER VIEW (My Requests) ── */
          requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
              <PaperPlaneRight weight="duotone" className="h-10 w-10 text-muted-foreground/40 mb-1" />
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">No requests submitted yet</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                When you create or update Objectives, KPIs, or Risks, your submitted requests will appear here for tracking.
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
                <Button variant="outline" size="sm" render={<Link href="/department/objectives/new" />} className="text-xs gap-1">
                  <Plus className="h-3 w-3" /> New Objective
                </Button>
                <Button variant="outline" size="sm" render={<Link href="/department/kpis/new" />} className="text-xs gap-1">
                  <Plus className="h-3 w-3" /> New KPI
                </Button>
                <Button variant="outline" size="sm" render={<Link href="/department/risks/new" />} className="text-xs gap-1">
                  <Plus className="h-3 w-3" /> Log Risk
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[45%] font-semibold text-xs">Request / Item</TableHead>
                    <TableHead className="font-semibold text-xs">Type</TableHead>
                    <TableHead className="font-semibold text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-xs">Submitted</TableHead>
                    <TableHead className="text-right font-semibold text-xs pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 p-1 rounded-md bg-muted">
                            {renderTypeIcon(item.entityType)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Request #{item.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {renderTypeBadge(item.entityType, item.changeType)}
                      </TableCell>
                      <TableCell className="py-3">
                        {renderStatusBadge(item.status)}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground/70" />
                          {item.timeAgo}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href="/department/requests" />}
                          className="h-7 text-xs text-primary hover:text-primary gap-1"
                        >
                          Track
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}
