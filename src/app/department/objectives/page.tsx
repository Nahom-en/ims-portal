"use client";
import { ScrollableTableWrapper } from "@/components/shared/ScrollableTableWrapper";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Target, Plus, Funnel, Trash, CaretUp, CaretDown, MagnifyingGlass, Info } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  TableRow,
} from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { BulkExportToolbar } from "@/components/shared/BulkExportToolbar"
import { useEmployee } from "@/lib/employee-context"
import { DepartmentFilter } from "@/components/shared/DepartmentFilter"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { submitForApproval } from "@/lib/workflow"

export default function ObjectivesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const employee = useEmployee()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [departmentFilter, setDepartmentFilter] = useState<string | 'ALL' | null>(() => employee?.department_id || null)
  
  // Set default once employee is loaded

    const currentDate = new Date()
  const actualQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`
  const actualYear = currentDate.getFullYear().toString()
  const [activeQuarter, setActiveQuarter] = useState(actualQuarter)
  const [activeYear, setActiveYear] = useState(actualYear)

  const [departmentId, setDepartmentId] = useState<string>("")
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "ALL")
  const [processFilter, setProcessFilter] = useState("ALL")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [objToDelete, setObjToDelete] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      if (departmentFilter === null) return;
      if (departmentFilter !== 'ALL') {
        setDepartmentId(departmentFilter)
      } else {
        setDepartmentId(employee?.department_id || '')
      }

      let query = supabase.from('objective_definitions').select('*').eq('is_active', true)
      if (departmentFilter !== 'ALL') {
        query = query.eq('department_id', departmentFilter)
      }
      const { data: objs } = await query
        
      if (objs) {
        // 1. Get cycle IDs for the active period
        const { data: cycles } = await supabase.from('report_cycles').select('id, reporting_period')
          .like('reporting_period', activeQuarter === 'ALL' ? `%${activeYear}` : `${activeQuarter} ${activeYear}`)
        const cycleIds = cycles?.map(c => c.id) || []
        
        // 2. Fetch employees and approval_requests for author resolution
        const [empsRes, appReqsRes] = await Promise.all([
          supabase.from('employees').select('id, firstname, lastname'),
          supabase.from('approval_requests').select('entity_id, requested_by').eq('entity_type', 'objective')
        ])
        const empsMap = new Map((empsRes.data || []).map(e => [e.id, `${e.firstname || ''} ${e.lastname || ''}`.trim()]))
        const creatorMap = new Map((appReqsRes.data || []).map(a => [a.entity_id, a.requested_by]))

        let trackingData: any[] = []
        if (cycleIds.length > 0 && objs.length > 0) {
          const objIds = objs.map(o => o.id)
          const { data: tr } = await supabase.from('objective_tracking')
            .select('objective_id, status_vs_target, followup_action, reasons_for_deviation, evidence_of_achievement')
            .in('objective_id', objIds)
            .in('report_cycle_id', cycleIds)
          if (tr) trackingData = tr
        }
        
        function calculateTargetPeriod(meta: any, endDate?: string, startDate?: string): string {
          if (meta?.targetDate && /^Q[1-4]\s\d{4}$/.test(String(meta.targetDate).trim())) {
            return String(meta.targetDate).trim()
          }
          if (meta?.period && /^Q[1-4]\s\d{4}$/.test(String(meta.period).trim())) {
            return String(meta.period).trim()
          }
          const dStr = endDate || startDate
          if (!dStr) return "Q1 2026"
          const d = new Date(dStr)
          if (isNaN(d.getTime())) return "Q1 2026"
          const q = Math.ceil((d.getUTCMonth() + 1) / 3)
          return `Q${q} ${d.getUTCFullYear()}`
        }

        const mapped = objs.map(o => {
          const meta = (o.custom_metadata as any) || {}
          const track = trackingData.find((t: any) => t.objective_id === o.id)
          const targetPeriod = calculateTargetPeriod(meta, o.end_date, o.start_date)

          // Process resolution
          let processName = "General"
          if (Array.isArray(meta.processNames) && meta.processNames.length > 0) {
            processName = meta.processNames.join(", ")
          } else if (meta.processName) {
            processName = meta.processName
          } else if (meta.process) {
            processName = meta.process
          }

          // Q1 Status vs Target resolution
          const rawStatus = track?.status_vs_target ? String(track.status_vs_target).trim() : null
          let displayStatus = "No Review"
          if (rawStatus) {
            if (rawStatus === "Achieved") displayStatus = "Success"
            else displayStatus = rawStatus
          }

          // Evidence indicator (only from evidence_of_achievement field)
          const hasEvidence = Boolean(track?.evidence_of_achievement && String(track.evidence_of_achievement).trim().length > 0)

          // Follow-up indicator
          const hasDeviation = Boolean(track?.reasons_for_deviation && String(track.reasons_for_deviation).trim().length > 0)
          const hasFollowupAction = Boolean(track?.followup_action && String(track.followup_action).trim().length > 0)
          const isSuccess = displayStatus === 'Success'
          const followupRequired = hasFollowupAction || (!isSuccess && displayStatus !== 'No Review' && hasDeviation)

          const creatorId = meta.author_id || creatorMap.get(o.id) || o.manager_id
          const createdByName = empsMap.get(creatorId) || "System"
          const createdByInitials = createdByName.split(" ").map((n: string) => n[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "SY"

          return {
            id: o.id,
            name: o.objective_description,
            department_id: o.department_id,
            process: processName,
            author_id: meta.author_id,
            createdByName,
            createdByInitials,
            targetPeriod,
            rawStatus,
            displayStatus,
            hasEvidence,
            evidenceLabel: hasEvidence ? "Provided" : "Not provided",
            followupRequired,
            followupLabel: followupRequired ? "Required" : "None",
            hasFollowupAction,
            requiresAction: followupRequired,
            status: displayStatus,
            targetDate: targetPeriod,
          }
        })

        // Filter by the selected Quarter and Year
        const periodFiltered = mapped.filter(item => {
          if (activeQuarter !== 'ALL' && !item.targetPeriod.startsWith(activeQuarter)) {
            return false
          }
          if (activeYear && !item.targetPeriod.includes(activeYear)) {
            return false
          }
          return true
        })

        setData(periodFiltered)
      }
      setLoading(false)
    }
    fetchData()
  }, [employee, supabase, departmentFilter, activeQuarter, activeYear])

  const filteredData = data.filter(d => {
    if (search) {
      const q = search.toLowerCase()
      if (!d.name.toLowerCase().includes(q) && !d.process.toLowerCase().includes(q) && !d.targetPeriod.toLowerCase().includes(q)) {
        return false
      }
    }
    if (statusFilter !== 'ALL') {
      if (d.displayStatus !== statusFilter && d.rawStatus !== statusFilter) {
        return false
      }
    }
    if (processFilter !== 'ALL' && d.process !== processFilter) {
      return false
    }
    return true
  })

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0
    let aVal = a[sortKey]
    let bVal = b[sortKey]
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(filteredData.map(d => d.id))
    else setSelectedIds([])
  }
  const toggleOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds(prev => [...prev, id])
    else setSelectedIds(prev => prev.filter(x => x !== id))
  }

  const exportColumns = [
    { key: 'name', label: 'Objective' },
    { key: 'process', label: 'Process' },
    { key: 'createdByName', label: 'Created By' },
    { key: 'targetPeriod', label: 'Target Period' },
    { key: 'displayStatus', label: 'Q1 Status vs Target' },
    { key: 'evidenceLabel', label: 'Evidence' },
    { key: 'followupLabel', label: 'Follow-up' },
  ]

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleDeleteRequest = async () => {
    if (!objToDelete) return
    
    if (objToDelete.author_id && objToDelete.author_id !== employee?.id && !justification.trim()) {
      toast.error("Please provide a justification for deleting this objective.")
      return
    }

    try {
      await submitForApproval(supabase, {
        entityType: "objective",
        entityId: objToDelete.id,
        departmentId: objToDelete.department_id || departmentId || employee?.department_id || "",
        requestedBy: employee?.id || "",
        payload: {
          id: objToDelete.id,
          custom_metadata: {
            change_type: "DELETE",
            justification: justification.trim() || undefined,
            author_id: employee?.id,
          },
        },
      })
      toast.success("Deletion request submitted for approval.")
    } catch (err: any) {
      toast.error(`Delete request failed: ${err.message}`)
    }
    setObjToDelete(null)
    setJustification("")
  }

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] flex flex-col p-4 md:p-6 overflow-hidden max-w-[1600px] mx-auto w-full relative">
      {/* ── Fixed Top Controls (Stationary) ── */}
      <div className="shrink-0 space-y-3 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary dark:text-blue-500" />
            <h1 className="text-2xl font-bold tracking-tight">Objectives</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {departmentFilter !== null && (
              <DepartmentFilter value={departmentFilter} onChange={setDepartmentFilter} />
            )}
            <div className="flex items-center gap-2">
              <Select value={activeQuarter} onValueChange={(v) => v && setActiveQuarter(v)}>
                <SelectTrigger className="w-[80px] h-9 text-sm bg-muted dark:bg-zinc-900 border-border dark:border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Q1","Q2","Q3","Q4"].map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activeYear} onValueChange={(v) => v && setActiveYear(v)}>
                <SelectTrigger className="w-[90px] h-9 text-sm bg-muted dark:bg-zinc-900 border-border dark:border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => router.push("/department/objectives/new")} className="gap-2 h-9">
              <Plus className="h-4 w-4" />
              New Objective
            </Button>
          </div>
        </div>

        {(() => {
          const total = data.length;
          const achieved = data.filter(d => d.status === 'Achieved').length;
          const achievementRate = total > 0 ? Math.round((achieved / total) * 100) : 0;
          const requiringAction = data.filter(d => d.requiresAction).length;
          const followupActionsCount = data.filter(d => d.hasFollowupAction).length;
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Total Objectives */}
              <Card size="sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Total Objectives</CardTitle>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">Total number of objective records for the selected period.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold">{total}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">For selected period</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="font-normal text-[10px] bg-primary/5 text-primary border-primary/20 hover:bg-primary/5">
                      {total} Total Objectives
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Objectives Achieved */}
              <Card size="sm" className="bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20">
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                  <CardTitle className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Objectives Achieved</CardTitle>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">Count of objectives where Status vs Target = Achieved.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{achieved}</div>
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                    {achieved} of {total} achieved
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className="font-normal text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                      {achievementRate}% Achievement Rate
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Objectives Requiring Action */}
              <Card size="sm" className={requiringAction > 0 ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/20" : ""}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                  <CardTitle className={`text-xs font-medium ${requiringAction > 0 ? 'text-amber-700 dark:text-amber-500' : 'text-muted-foreground'}`}>
                    Objectives Requiring Action
                  </CardTitle>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">Objectives with deviation from target requiring follow-up.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={`text-xl font-bold ${requiringAction > 0 ? 'text-amber-700 dark:text-amber-500' : ''}`}>
                    {requiringAction}
                  </div>
                  <p className="text-[11px] text-amber-600/80 dark:text-amber-500/80 mt-0.5">
                    {requiringAction} {requiringAction === 1 ? 'objective requires' : 'objectives require'} follow-up
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className={`font-normal text-[10px] ${requiringAction > 0 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' : 'bg-muted text-muted-foreground border-border'} hover:bg-amber-50 dark:hover:bg-amber-950/40`}>
                      {followupActionsCount} Follow-up Actions
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })()}

        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          <div className="flex items-center gap-2 w-full max-w-sm relative">
            <MagnifyingGlass className="absolute left-3 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search objectives..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <Funnel className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Filter</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="Success">Success</SelectItem>
                <SelectItem value="Partially Achieved">Partially Achieved</SelectItem>
                <SelectItem value="At Risk">At Risk</SelectItem>
                <SelectItem value="Off Track">Off Track</SelectItem>
                <SelectItem value="Missed">Missed</SelectItem>
                <SelectItem value="No Review">No Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={processFilter} onValueChange={setProcessFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Process" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Processes</SelectItem>
                {Array.from(new Set(data.map(d => d.process))).sort().map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <BulkExportToolbar 
          selectedIds={selectedIds} 
          data={filteredData} 
          columns={exportColumns} 
          filename="objectives_export" 
          onClearSelection={() => setSelectedIds([])} 
        />
      </div>

      {/* ── Scrollable Table Container (Fills Remaining Viewport) ── */}
      <ScrollableTableWrapper className="flex-1 min-h-0">
        <Table className="min-w-full" containerClassName="overflow-visible">
          <TableHeader className="bg-slate-100 dark:bg-zinc-900 sticky top-0 z-20 border-b shadow-xs [&_th]:bg-slate-100 dark:[&_th]:bg-zinc-900">
            <TableRow>
              {/* 1. Selection checkbox */}
              <TableHead className="w-12 h-10 px-4">
                <Checkbox 
                  checked={filteredData.length > 0 && selectedIds.length === filteredData.length} 
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>

              {/* 2. Objective */}
              <TableHead className="h-10 cursor-pointer min-w-[280px]" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1 font-semibold">Objective {sortKey === 'name' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 3. Process */}
              <TableHead className="h-10 cursor-pointer min-w-[120px]" onClick={() => handleSort('process')}>
                <div className="flex items-center gap-1 font-semibold">Process {sortKey === 'process' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 4. Created By */}
              <TableHead className="h-10 cursor-pointer min-w-[140px]" onClick={() => handleSort('createdByName')}>
                <div className="flex items-center gap-1 font-semibold">Created By {sortKey === 'createdByName' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 5. Target Period */}
              <TableHead className="h-10 cursor-pointer min-w-[110px]" onClick={() => handleSort('targetPeriod')}>
                <div className="flex items-center gap-1 font-semibold">Target Period {sortKey === 'targetPeriod' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 6. Q1 Status vs Target */}
              <TableHead className="h-10 cursor-pointer min-w-[160px]" onClick={() => handleSort('displayStatus')}>
                <div className="flex items-center gap-1 font-semibold">Q1 Status vs Target {sortKey === 'displayStatus' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 7. Evidence */}
              <TableHead className="h-10 min-w-[120px] font-semibold">Evidence</TableHead>

              {/* 8. Follow-up */}
              <TableHead className="h-10 min-w-[110px] font-semibold">Follow-up</TableHead>

              {/* 9. Action */}
              <TableHead className="h-10 w-[90px] text-right pr-4 font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={9} rows={3} />
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No objectives found.</TableCell>
              </TableRow>
            ) : (
              sortedData.map((row) => (
                <TableRow 
                  key={row.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/department/objectives/${row.id}`)}
                >
                  {/* 1. Selection checkbox */}
                  <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.includes(row.id as string)} 
                      onCheckedChange={(checked) => toggleOne(row.id as string, checked as boolean)}
                      aria-label="Select row"
                    />
                  </TableCell>

                  {/* 2. Objective */}
                  <TableCell className="font-medium max-w-[340px]">
                    <span className="truncate block" title={row.name}>{row.name}</span>
                  </TableCell>

                  {/* 3. Process */}
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {row.process}
                  </TableCell>

                  {/* 4. Created By */}
                  <TableCell className="text-xs whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-[10px] shrink-0">
                        {row.createdByInitials}
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{row.createdByName}</span>
                    </div>
                  </TableCell>

                  {/* 5. Target Period */}
                  <TableCell className="text-sm tabular-nums whitespace-nowrap">
                    {row.targetPeriod}
                  </TableCell>

                  {/* 5. Q1 Status vs Target */}
                  <TableCell className="whitespace-nowrap">
                    {row.displayStatus === 'No Review' ? (
                      <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border font-normal text-xs">
                        No Review
                      </Badge>
                    ) : row.displayStatus === 'Success' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 font-semibold text-xs">
                        Success
                      </Badge>
                    ) : row.displayStatus === 'Partially Achieved' ? (
                      <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800 font-semibold text-xs">
                        Partially Achieved
                      </Badge>
                    ) : row.displayStatus === 'At Risk' ? (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-semibold text-xs">
                        At Risk
                      </Badge>
                    ) : row.displayStatus === 'Off Track' ? (
                      <Badge className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800 font-semibold text-xs">
                        Off Track
                      </Badge>
                    ) : row.displayStatus === 'Missed' ? (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 font-semibold text-xs">
                        Missed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-semibold text-xs">
                        {row.displayStatus}
                      </Badge>
                    )}
                  </TableCell>

                  {/* 6. Evidence */}
                  <TableCell className="whitespace-nowrap">
                    {row.hasEvidence ? (
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        ✓ Provided
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs text-muted-foreground">
                        — Not provided
                      </span>
                    )}
                  </TableCell>

                  {/* 7. Follow-up */}
                  <TableCell className="whitespace-nowrap">
                    {row.followupRequired ? (
                      <span className="inline-flex items-center text-xs font-semibold text-amber-700 dark:text-amber-400">
                        ⚠ Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs text-muted-foreground">
                        — None
                      </span>
                    )}
                  </TableCell>

                  {/* 8. Action */}
                  <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2.5 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => router.push(`/department/objectives/${row.id}`)}
                      >
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Objective"
                        onClick={() => setObjToDelete(row)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollableTableWrapper>

      <AlertDialog 
        open={!!objToDelete} 
        title="Submit for Deletion Approval?" 
        description={`You are requesting to delete the objective "${objToDelete?.name}". This requires approval.`}
        onConfirm={handleDeleteRequest} 
        onCancel={() => { setObjToDelete(null); setJustification(""); }}
        confirmLabel="Submit Request" 
      >
        {objToDelete && objToDelete.author_id !== employee?.id && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Justification Note <span className="text-destructive">*</span></label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
              placeholder="Why are you requesting to delete an objective you did not create?"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>
        )}
      </AlertDialog>
    </div>
  )
}
