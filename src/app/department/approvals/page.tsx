/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { ScrollableTableWrapper } from "@/components/shared/ScrollableTableWrapper"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { 
  CheckCircle, 
  Tray, 
  PaperPlaneRight, 
  ArrowRight, 
  Signature, 
  XCircle, 
  CircleDashed, 
  CaretUp, 
  CaretDown,
  MagnifyingGlass,
  Funnel,
  ChatCircleDots,
  ArrowClockwise
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { useEmployee } from "@/lib/employee-context"

interface ApprovalItem {
  id: string
  entityType: string
  entityId: string | null
  title: string
  name: string
  processName: string
  type: string
  author: string
  workflowStatus: "Pending Approval" | "Published" | "Rejected" | "Draft"
  currentStepLabel: string
  currentStepApproverName: string
  rejectionFeedback: string | null
  lastUpdated: string
  createdAt: string
  targetQuarter?: string
  targetYear?: string
  url: string
}

export default function ApprovalsPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const initialTab = tabParam === "approved" ? "approved" : tabParam === "outbox" ? "outbox" : "inbox"

  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"inbox" | "approved" | "outbox">(initialTab)
  const [inboxItems, setInboxItems] = useState<ApprovalItem[]>([])
  const [approvedItems, setApprovedItems] = useState<ApprovalItem[]>([])
  const [outboxItems, setOutboxItems] = useState<ApprovalItem[]>([])
  const [rejectingItem, setRejectingItem] = useState<ApprovalItem | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [reasonError, setReasonError] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Filter States
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const employee = useEmployee()
  const employeeId = employee?.id
  const employeeRole = employee?.company_role_id

  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      if (!employeeId) return
      setIsLoading(true)

      try {
        // 1. Fetch all approval requests
        const { data: reqs, error: reqErr } = await supabase
          .from('approval_requests')
          .select('*')
          .order('updated_at', { ascending: false })

        if (reqErr) {
          console.error("Error fetching approval requests:", reqErr)
          setIsLoading(false)
          return
        }

        // 2. Fetch departments (for name and manager_id)
        const { data: depts } = await supabase
          .from('departments')
          .select('id, department_name, manager_id')

        const deptsMap = new Map<string, any>()
        if (depts) {
          depts.forEach(d => deptsMap.set(d.id, d))
        }

        // 3. Fetch workflow templates (fallback if chain_snapshot is empty)
        const { data: tmpls } = await supabase
          .from('workflow_templates')
          .select('id, department_id, steps')

        const tmplsMap = new Map<string, any>()
        if (tmpls) {
          tmpls.forEach(t => {
            if (t.department_id) tmplsMap.set(t.department_id, t.steps)
          })
        }

        // 4. Fetch employees (for requester and approver names)
        const { data: emps } = await supabase
          .from('employees')
          .select('id, firstname, lastname, email')

        const empsMap = new Map<string, string>()
        if (emps) {
          emps.forEach(e => empsMap.set(e.id, `${e.firstname} ${e.lastname}`))
        }

        // 5. Fetch rejection comments from approval_actions for outbox feedback
        const { data: rejectActions } = await supabase
          .from('approval_actions')
          .select('approval_request_id, comment, created_at')
          .eq('action', 'REJECTED')
          .order('created_at', { ascending: false })

        const rejectReasonMap = new Map<string, string>()
        if (rejectActions) {
          rejectActions.forEach(a => {
            if (!rejectReasonMap.has(a.approval_request_id) && a.comment) {
              rejectReasonMap.set(a.approval_request_id, a.comment)
            }
          })
        }

        // 6. Fetch actions where current employee approved
        const { data: myApprovedActions } = await supabase
          .from('approval_actions')
          .select('approval_request_id, created_at, comment')
          .eq('actor_id', employeeId)
          .eq('action', 'APPROVED')
          .order('created_at', { ascending: false })

        const myApprovedMap = new Map<string, any>()
        if (myApprovedActions) {
          myApprovedActions.forEach(a => {
            if (!myApprovedMap.has(a.approval_request_id)) {
              myApprovedMap.set(a.approval_request_id, a)
            }
          })
        }

        const inbox: ApprovalItem[] = []
        const approved: ApprovalItem[] = []
        const outbox: ApprovalItem[] = []

        for (const r of reqs || []) {
          const dept = deptsMap.get(r.department_id)
          const deptName = dept?.department_name || 'General'
          const deptManagerId = dept?.manager_id

          // Determine workflow steps
          let steps: any[] = Array.isArray(r.chain_snapshot) && r.chain_snapshot.length > 0
            ? r.chain_snapshot
            : []

          if (steps.length === 0 && r.department_id && tmplsMap.has(r.department_id)) {
            const rawSteps = tmplsMap.get(r.department_id)
            if (Array.isArray(rawSteps)) {
              steps = rawSteps
            }
          }

          // Determine current step and authorization
          let currentStepLabel = 'Review'
          let currentStepApproverName = ''
          let isMyTurn = false

          const currentIndex = r.current_step_index ?? 0

          if (currentIndex === -1) {
            currentStepLabel = 'Department Pre-Approval'
            if (deptManagerId) {
              currentStepApproverName = empsMap.get(deptManagerId) || 'Department Manager'
            }
            if (deptManagerId === employeeId || employee?.role === 'SYSTEM_ADMIN') {
              isMyTurn = true
            }
          } else if (steps.length > 0 && currentIndex >= 0 && currentIndex < steps.length) {
            const currentStep = steps[currentIndex]
            currentStepLabel = currentStep?.label || `Step ${currentIndex + 1}`
            const stepApproverId = currentStep?.approverId || currentStep?.approver_id
            const stepRoleId = currentStep?.roleId || currentStep?.role_id

            if (stepApproverId) {
              currentStepApproverName = empsMap.get(stepApproverId) || 'Assigned Approver'
            }

            if (stepApproverId && stepApproverId === employeeId) {
              isMyTurn = true
            } else if (stepRoleId && stepRoleId === employeeRole) {
              isMyTurn = true
            } else if (employee?.role === 'SYSTEM_ADMIN') {
              isMyTurn = true
            }
          } else if (steps.length === 0) {
            if (employee?.role === 'SYSTEM_ADMIN') {
              isMyTurn = true
            }
          }

          // Determine status
          const rawStatus = (r.status || r.workflow_status || 'PENDING_APPROVAL').toUpperCase()
          let statusLabel: "Pending Approval" | "Published" | "Rejected" | "Draft" = "Pending Approval"
          if (rawStatus === 'PUBLISHED' || rawStatus === 'APPROVED' || rawStatus === 'COMPLETED') {
            statusLabel = 'Published'
          } else if (rawStatus === 'REJECTED') {
            statusLabel = 'Rejected'
          } else if (rawStatus === 'DRAFT') {
            statusLabel = 'Draft'
          }

          // Extract readable name
          let itemName = ''
          if (r.payload) {
            itemName = r.payload.objective_description ||
                       r.payload.name ||
                       r.payload.custom_metadata?.name ||
                       r.payload.title ||
                       ''
          }
          if (!itemName && r.custom_metadata) {
            itemName = r.custom_metadata.title ||
                       r.custom_metadata.proposed_changes?.name ||
                       (r.custom_metadata.change_type === 'DELETE' ? `Delete ${r.entity_type} request` : '') ||
                       (r.custom_metadata.change_type ? `${r.custom_metadata.change_type} Request` : '')
          }
          if (!itemName) {
            itemName = `${deptName} ${r.entity_type || 'Item'}`
          }

          // Date & Quarter resolution for optional filtering
          let targetQ: string | undefined
          let targetY: string | undefined
          if (r.payload?.start_date) {
            const d = new Date(r.payload.start_date)
            if (!isNaN(d.getTime())) {
              targetQ = `Q${Math.floor(d.getMonth() / 3) + 1}`
              targetY = d.getFullYear().toString()
            }
          } else if (r.created_at) {
            const d = new Date(r.created_at)
            if (!isNaN(d.getTime())) {
              targetQ = `Q${Math.floor(d.getMonth() / 3) + 1}`
              targetY = d.getFullYear().toString()
            }
          }

          const authorName = r.requested_by ? (empsMap.get(r.requested_by) || 'Unknown') : 'Unknown'
          const rejectionFeedback = rejectReasonMap.get(r.id) || null

          let trackUrl = `/department/${r.entity_type}s`
          if (r.entity_id) {
            trackUrl = `/department/${r.entity_type}s/${r.entity_id}`
          }

          const mapped: ApprovalItem = {
            id: r.id,
            entityType: r.entity_type || 'objective',
            entityId: r.entity_id || null,
            title: `${(r.entity_type || 'item').toUpperCase()} Submission`,
            name: itemName,
            processName: deptName,
            type: (r.entity_type || 'item').charAt(0).toUpperCase() + (r.entity_type || 'item').slice(1),
            author: authorName,
            workflowStatus: statusLabel,
            currentStepLabel,
            currentStepApproverName,
            rejectionFeedback,
            lastUpdated: new Date(r.updated_at || r.created_at).toLocaleDateString(),
            createdAt: r.created_at || new Date().toISOString(),
            targetQuarter: targetQ,
            targetYear: targetY,
            url: trackUrl
          }

          // Action Required (Inbox): Pending and it's this user's turn (approver configured in System Admin)
          if ((rawStatus === 'PENDING_APPROVAL' || rawStatus === 'PENDING') && isMyTurn) {
            inbox.push(mapped)
          }

          // Approved (Chain Tracking): User previously approved, or user is department manager and item is progressing/completed
          const hasMyApproval = myApprovedMap.has(r.id)
          const isDeptManager = deptManagerId === employeeId
          const isPublished = statusLabel === 'Published'

          if (hasMyApproval || (isDeptManager && (r.current_step_index > -1 || isPublished))) {
            approved.push(mapped)
          }

          // My Requests (Outbox): Anything requested by this user
          if (r.requested_by === employeeId) {
            outbox.push(mapped)
          }
        }

        setInboxItems(inbox)
        setApprovedItems(approved)
        setOutboxItems(outbox)
      } catch (err) {
        console.error("Failed to load approvals data:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [supabase, employeeId, employeeRole, employee?.role, refreshIndex])

  const handleApprove = async (requestId: string, title: string) => {
    if (!employeeId) return
    setIsProcessing(true)

    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          requestId,
          actorId: employeeId
        })
      })

      if (!res.ok) {
        const err = await res.json()
        setIsProcessing(false)
        toast.error(`Approval failed: ${err.error || 'Server error'}`)
        return
      }

      toast.success(`Approved: ${title}`)
      setRefreshIndex(prev => prev + 1)
    } catch (e: any) {
      toast.error(`Approval failed: ${e.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      setReasonError(true)
      return
    }
    if (!rejectingItem || !employeeId) return

    setIsProcessing(true)

    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          requestId: rejectingItem.id,
          actorId: employeeId,
          comment: rejectReason.trim()
        })
      })

      if (!res.ok) {
        const err = await res.json()
        setIsProcessing(false)
        toast.error(`Rejection failed: ${err.error || 'Server error'}`)
        return
      }

      toast.success(`Submission returned for revisions with reviewer feedback.`)
      setRejectingItem(null)
      setRejectReason("")
      setReasonError(false)
      setRefreshIndex(prev => prev + 1)
    } catch (e: any) {
      toast.error(`Rejection failed: ${e.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter items based on user criteria
  const filterList = (items: ApprovalItem[], checkStatus = false) => {
    return items.filter(item => {
      // Type filter
      if (typeFilter !== "ALL" && item.type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false
      }
      // Status filter (for outbox & approved)
      if (checkStatus && statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && item.workflowStatus !== "Pending Approval") return false
        if (statusFilter === "PUBLISHED" && item.workflowStatus !== "Published") return false
        if (statusFilter === "REJECTED" && item.workflowStatus !== "Rejected") return false
      }
      // Text search
      if (search.trim()) {
        const query = search.toLowerCase()
        const match = 
          item.name.toLowerCase().includes(query) ||
          item.processName.toLowerCase().includes(query) ||
          item.author.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query) ||
          item.workflowStatus.toLowerCase().includes(query)
        if (!match) return false
      }
      return true
    })
  }

  const filteredInbox = filterList(inboxItems, false)
  const filteredApproved = filterList(approvedItems, true)
  const filteredOutbox = filterList(outboxItems, true)

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto relative">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary dark:text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Approvals Hub</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review pending departmental items or monitor the status of approved requests along the workflow chain.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshIndex(prev => prev + 1)}
            disabled={isLoading || isProcessing}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <ArrowClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-4 border-b dark:border-zinc-800 pb-px">
        <button
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "inbox" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("inbox")}
        >
          <Tray className="h-4 w-4" />
          Actions Require
          {inboxItems.length > 0 && (
            <Badge className="ml-1 bg-destructive hover:bg-destructive text-white border-transparent text-xs py-0 px-1.5 h-5">
              {inboxItems.length}
            </Badge>
          )}
        </button>
        <button
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "approved" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("approved")}
        >
          <CheckCircle className="h-4 w-4" />
          Approved
          {approvedItems.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs py-0 px-1.5 h-5">
              {approvedItems.length}
            </Badge>
          )}
        </button>
        <button
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "outbox" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("outbox")}
        >
          <PaperPlaneRight className="h-4 w-4" />
          My Requests
          {outboxItems.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs py-0 px-1.5 h-5">
              {outboxItems.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ── Search & Filter Controls Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by title, department, or author..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <Funnel className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
              <SelectTrigger className="w-[125px] h-9 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="Objective">Objectives</SelectItem>
                <SelectItem value="Kpi">KPIs</SelectItem>
                <SelectItem value="Risk">Risks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(activeTab === "outbox" || activeTab === "approved") && (
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-[125px] h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        {activeTab === "inbox" && (
          <TrayTable 
            items={filteredInbox} 
            onApprove={handleApprove}
            onReject={(item) => {
              setRejectingItem(item)
              setRejectReason("")
              setReasonError(false)
            }}
            isProcessing={isProcessing}
            isLoading={isLoading}
          />
        )}
        {activeTab === "approved" && (
          <ApprovedTable items={filteredApproved} isLoading={isLoading} />
        )}
        {activeTab === "outbox" && (
          <OutboxTable items={filteredOutbox} isLoading={isLoading} />
        )}
      </div>

      {/* ── Reject Modal ── */}
      {rejectingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-md w-full p-6 shadow-xl border animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <div className="p-2 bg-destructive/10 dark:bg-rose-950/50 rounded-full">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Reject Submission</h2>
                <p className="text-xs text-muted-foreground line-clamp-1">{rejectingItem.name}</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">
                Mandatory Reviewer Feedback <span className="text-destructive">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value)
                  if (e.target.value.trim()) setReasonError(false)
                }}
                placeholder="Specify the revisions required for the submitter..."
                className={`w-full h-28 p-3 text-sm rounded-md border bg-transparent focus:outline-none focus:ring-2 ${
                  reasonError 
                    ? "border-destructive focus:ring-rose-500/20" 
                    : "border-input focus:border-primary focus:ring-primary/20"
                } resize-none`}
              />
              {reasonError && (
                <p className="text-xs text-destructive font-medium">A reason is required by IMS audit standards.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setRejectingItem(null)
                  setRejectReason("")
                  setReasonError(false)
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejectConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? <CircleDashed className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Actions Require Table (TrayTable)
   ───────────────────────────────────────────────────────────────────────────── */
interface TrayTableProps {
  items: ApprovalItem[]
  onApprove: (id: string, title: string) => void
  onReject: (item: ApprovalItem) => void
  isProcessing: boolean
  isLoading?: boolean
}

function TrayTable({ items, onApprove, onReject, isProcessing, isLoading }: TrayTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey) return 0
    let aVal = (a as any)[sortKey]
    let bVal = (b as any)[sortKey]
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <CheckCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">You&apos;re all caught up!</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Your approval queue is currently empty. Items configured for your review in System Admin will appear here.
        </p>
      </div>
    )
  }

  return (
    <ScrollableTableWrapper>
      <Table className="min-w-full">
        <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b">
          <TableRow>
            <TableHead className="h-10 pl-6 cursor-pointer min-w-[100px]" onClick={() => handleSort('type')}>
              <div className="flex items-center gap-1 font-semibold">Type {sortKey === 'type' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[280px]" onClick={() => handleSort('name')}>
              <div className="flex items-center gap-1 font-semibold">Item {sortKey === 'name' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[140px]" onClick={() => handleSort('processName')}>
              <div className="flex items-center gap-1 font-semibold">Department {sortKey === 'processName' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[140px]" onClick={() => handleSort('author')}>
              <div className="flex items-center gap-1 font-semibold">Submitted By {sortKey === 'author' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 min-w-[160px] font-semibold">Waiting On</TableHead>
            <TableHead className="h-10 text-right pr-6 min-w-[220px] font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton columns={6} rows={3} />
          ) : (
            sortedItems.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="pl-6 whitespace-nowrap">
                  <Badge 
                    variant="outline" 
                    className={
                      item.type === "Objective" 
                        ? "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800 text-xs font-semibold" 
                        : item.type === "Kpi" 
                        ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs font-semibold"
                        : "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 text-xs font-semibold"
                    }
                  >
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium max-w-[320px]">
                  <span className="truncate block" title={item.name}>
                    {item.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {item.processName}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {item.author}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs font-medium">
                    You ({item.currentStepLabel})
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-6 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-rose-200 dark:border-rose-900 text-xs"
                      onClick={() => onReject(item)}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-medium"
                      onClick={() => onApprove(item.id, item.name)}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                    <Link href={item.url}>
                      <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground text-xs">
                        <Signature className="h-3.5 w-3.5 mr-1" />
                        Review
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ScrollableTableWrapper>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   My Requests Table (OutboxTable)
   ───────────────────────────────────────────────────────────────────────────── */
function OutboxTable({ items, isLoading }: { items: ApprovalItem[], isLoading?: boolean }) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey) return 0
    let aVal = (a as any)[sortKey]
    let bVal = (b as any)[sortKey]
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <PaperPlaneRight className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No requests submitted</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          You haven&apos;t submitted any Objectives, KPIs, or Risks for approval yet.
        </p>
      </div>
    )
  }

  return (
    <ScrollableTableWrapper>
      <Table className="min-w-full">
        <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b">
          <TableRow>
            <TableHead className="h-10 pl-6 cursor-pointer min-w-[100px]" onClick={() => handleSort('type')}>
              <div className="flex items-center gap-1 font-semibold">Type {sortKey === 'type' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[280px]" onClick={() => handleSort('name')}>
              <div className="flex items-center gap-1 font-semibold">Request {sortKey === 'name' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[140px]" onClick={() => handleSort('processName')}>
              <div className="flex items-center gap-1 font-semibold">Department {sortKey === 'processName' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[140px]" onClick={() => handleSort('workflowStatus')}>
              <div className="flex items-center gap-1 font-semibold">Status {sortKey === 'workflowStatus' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 min-w-[220px] font-semibold">Current Step / Details</TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[110px]" onClick={() => handleSort('lastUpdated')}>
              <div className="flex items-center gap-1 font-semibold">Date {sortKey === 'lastUpdated' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 text-right pr-6 min-w-[100px] font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton columns={7} rows={3} />
          ) : (
            sortedItems.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="pl-6 whitespace-nowrap">
                  <Badge 
                    variant="outline" 
                    className={
                      item.type === "Objective" 
                        ? "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800 text-xs font-semibold" 
                        : item.type === "Kpi" 
                        ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs font-semibold"
                        : "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 text-xs font-semibold"
                    }
                  >
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium max-w-[320px]">
                  <span className="truncate block" title={item.name}>
                    {item.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {item.processName}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {item.workflowStatus === "Pending Approval" && (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-xs font-semibold">
                      Pending
                    </Badge>
                  )}
                  {item.workflowStatus === "Rejected" && (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 text-xs font-semibold">
                      Rejected
                    </Badge>
                  )}
                  {item.workflowStatus === "Published" && (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs font-semibold">
                      Published
                    </Badge>
                  )}
                  {item.workflowStatus === "Draft" && (
                    <Badge variant="outline" className="text-xs font-semibold">
                      Draft
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {item.workflowStatus === "Published" ? (
                    <span className="text-muted-foreground text-xs flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      Completed & Published
                    </span>
                  ) : item.workflowStatus === "Rejected" ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs flex items-center gap-1 font-semibold text-destructive">
                        <XCircle className="h-3.5 w-3.5" />
                        Returned for revisions
                      </span>
                      {item.rejectionFeedback && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 italic max-w-[240px] truncate" title={item.rejectionFeedback}>
                          <ChatCircleDots className="h-3 w-3 shrink-0" />
                          &quot;{item.rejectionFeedback}&quot;
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      With {item.currentStepLabel}
                      {item.currentStepApproverName ? ` (${item.currentStepApproverName})` : ''}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                  {item.lastUpdated}
                </TableCell>
                <TableCell className="text-right pr-6 whitespace-nowrap">
                  <Link href={item.url}>
                    <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10 text-xs font-medium">
                      Track <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ScrollableTableWrapper>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Approved Requests Table (ApprovedTable)
   ───────────────────────────────────────────────────────────────────────────── */
function ApprovedTable({ items, isLoading }: { items: ApprovalItem[]; isLoading?: boolean }) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey) return 0
    let aVal = (a as any)[sortKey]
    let bVal = (b as any)[sortKey]
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <CheckCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No approved requests yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Requests you have approved or that are progressing through your department workflow will appear here.
        </p>
      </div>
    )
  }

  return (
    <ScrollableTableWrapper>
      <Table className="min-w-full">
        <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b">
          <TableRow>
            <TableHead className="h-10 pl-6 cursor-pointer min-w-[100px]" onClick={() => handleSort('type')}>
              <div className="flex items-center gap-1 font-semibold">Type {sortKey === 'type' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[280px]" onClick={() => handleSort('name')}>
              <div className="flex items-center gap-1 font-semibold">Item {sortKey === 'name' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[140px]" onClick={() => handleSort('processName')}>
              <div className="flex items-center gap-1 font-semibold">Department {sortKey === 'processName' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[140px]" onClick={() => handleSort('author')}>
              <div className="flex items-center gap-1 font-semibold">Submitted By {sortKey === 'author' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[180px]" onClick={() => handleSort('workflowStatus')}>
              <div className="flex items-center gap-1 font-semibold">Chain Status {sortKey === 'workflowStatus' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 cursor-pointer min-w-[110px]" onClick={() => handleSort('lastUpdated')}>
              <div className="flex items-center gap-1 font-semibold">Date {sortKey === 'lastUpdated' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
            </TableHead>
            <TableHead className="h-10 text-right pr-6 min-w-[100px] font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton columns={7} rows={3} />
          ) : (
            sortedItems.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="pl-6 whitespace-nowrap">
                  <Badge 
                    variant="outline" 
                    className={
                      item.type === "Objective" 
                        ? "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800 text-xs font-semibold" 
                        : item.type === "Kpi" 
                        ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs font-semibold"
                        : "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 text-xs font-semibold"
                    }
                  >
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium max-w-[320px]">
                  <span className="truncate block" title={item.name}>
                    {item.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {item.processName}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {item.author}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {item.workflowStatus === "Published" ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs font-semibold gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      Fully Published
                    </Badge>
                  ) : item.workflowStatus === "Rejected" ? (
                    <div className="flex flex-col gap-0.5">
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 text-xs font-semibold gap-1 w-fit">
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        Rejected Downstream
                      </Badge>
                      {item.rejectionFeedback && (
                        <span className="text-xs text-muted-foreground italic max-w-[240px] truncate" title={item.rejectionFeedback}>
                          &quot;{item.rejectionFeedback}&quot;
                        </span>
                      )}
                    </div>
                  ) : (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 text-xs font-semibold gap-1">
                      In Review ({item.currentStepLabel})
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                  {item.lastUpdated}
                </TableCell>
                <TableCell className="text-right pr-6 whitespace-nowrap">
                  <Link href={item.url}>
                    <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10 text-xs font-medium">
                      Track <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ScrollableTableWrapper>
  )
}
