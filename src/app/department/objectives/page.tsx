"use client";
import { ScrollableTableWrapper } from "@/components/shared/ScrollableTableWrapper";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Target, Plus, Funnel, Trash, CaretUp, CaretDown, MagnifyingGlass, Warning, CheckCircle, Info } from "@phosphor-icons/react"
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

export default function ObjectivesPage() {
  const router = useRouter()
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
  const [statusFilter, setStatusFilter] = useState("ALL")
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
        const { data: cycles } = await supabase.from('report_cycles').select('id')
        .like('reporting_period', activeQuarter === 'ALL' ? `%${activeYear}` : `${activeQuarter} ${activeYear}`)
        const cycleIds = cycles?.map(c => c.id) || []
        
        let trackingData: any[] = []
        if (cycleIds.length > 0 && objs.length > 0) {
          const objIds = objs.map(o => o.id)
          const { data: tr } = await supabase.from('objective_tracking')
            .select('objective_id, status_vs_target')
            .in('objective_id', objIds)
            .in('report_cycle_id', cycleIds)
          if (tr) trackingData = tr
        }
        
        setData(objs.map(o => {
          const track = trackingData.find((t: any) => t.objective_id === o.id)
          return {
            id: o.id,
            name: o.objective_description,
            department_id: o.department_id,
            process: (o.custom_metadata as any)?.processNames?.join(", ") || 'N/A',
            author_id: (o.custom_metadata as any)?.author_id,
            status: track ? track.status_vs_target : 'No Data',
            targetDate: o.end_date || 'N/A',
          }
        }))
      }
      setLoading(false)
    }
    fetchData()
  }, [employee, supabase, departmentFilter, activeQuarter, activeYear])

  const filteredData = data.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.process.toLowerCase().includes(search.toLowerCase())
  )

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
    { key: 'name', label: 'Objective Title' },
    { key: 'process', label: 'Process' },
    { key: 'targetDate', label: 'Target Date' },
    { key: 'status', label: 'Status' }
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

    const { error } = await supabase
      .from("approval_requests")
      .insert({
        department_id: objToDelete.department_id || departmentId,
        entity_type: "objective",
        entity_id: objToDelete.id,
        requested_by: employee?.id || null,
        status: "PENDING_APPROVAL",
        current_step_index: 1,
        custom_metadata: {
          change_type: "DELETE",
          justification: justification.trim() || undefined
        }
      })

    if (error) {
      toast.error(`Delete request failed: ${error.message}`)
    } else {
      toast.success("Deletion request submitted for approval.")
    }
    setObjToDelete(null)
    setJustification("")
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto w-full relative">
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
        const healthy = data.filter(d => d.status === 'Completed' || d.status === 'On Track').length;
        const atRisk = data.filter(d => d.status === 'At Risk' || d.status === 'Overdue').length;
        const healthPercent = total > 0 ? Math.round((healthy / total) * 100) : 0;
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Objectives</CardTitle>
                <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Total number of objectives set for the selected period.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{total}</div>
                <p className="text-xs text-muted-foreground mt-1">For selected period</p>
                <div className="mt-3">
                  <Badge variant="outline" className="font-normal text-[10px] bg-primary/5 text-primary border-primary/20 hover:bg-primary/5">
                    {total} Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Completed</CardTitle>
                <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Percentage of objectives that are currently on track or completed.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{healthPercent}% On Track</div>
                <div className="mt-3 h-1.5 w-full bg-emerald-100 dark:bg-emerald-950/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${healthPercent}%` }} />
                </div>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-2">{healthy} of {total} objectives on track</p>
                <div className="mt-3">
                  <Badge variant="outline" className="font-normal text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                    {healthPercent}% On Track
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className={atRisk > 0 ? "bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/20" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className={`text-sm font-medium ${atRisk > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>Attention Required</CardTitle>
                <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Objectives that are at risk or overdue and require immediate attention.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${atRisk > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-500'}`}>
                  {atRisk > 0 ? atRisk : 'All clear'}
                </div>
                <p className={`text-xs mt-1 ${atRisk > 0 ? 'text-destructive/80' : 'text-muted-foreground'}`}>
                  {atRisk > 0 ? 'At risk or overdue' : 'No interventions needed'}
                </p>
                <div className="mt-3">
                  <Badge variant="outline" className={`font-normal text-[10px] ${atRisk > 0 ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {atRisk > 0 ? `${atRisk} Interventions` : '0 Interventions'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mt-2">
        <div className="flex items-center gap-2 w-full max-w-sm relative">
          <MagnifyingGlass className="absolute left-3 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search objectives..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <Funnel className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Filter</span>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="On Track">On Track</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
              <SelectItem value="Off Track">Off Track</SelectItem>
              <SelectItem value="Achieved">Achieved</SelectItem>
              <SelectItem value="No Data">No Data</SelectItem>
            </SelectContent>
          </Select>
          <Select value={processFilter} onValueChange={setProcessFilter}>
            <SelectTrigger className="w-[180px]">
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
      <ScrollableTableWrapper>
        <Table className="min-w-full">
          <TableHeader className="bg-slate-50 dark:bg-zinc-900/50 sticky top-0 z-10 shadow-sm outline outline-1 outline-border">
            <TableRow>
              <TableHead className="w-12 h-10 px-4">
                <Checkbox 
                  checked={filteredData.length > 0 && selectedIds.length === filteredData.length} 
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">Objective {sortKey === 'name' && (sortDir === 'asc' ? <CaretUp /> : <CaretDown />)}</div>
              </TableHead>
              <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('process')}>
                <div className="flex items-center gap-1">Process {sortKey === 'process' && (sortDir === 'asc' ? <CaretUp /> : <CaretDown />)}</div>
              </TableHead>
              <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status {sortKey === 'status' && (sortDir === 'asc' ? <CaretUp /> : <CaretDown />)}</div>
              </TableHead>
              <TableHead className="h-10 w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={4} rows={3} />
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No objectives found.</TableCell>
              </TableRow>
            ) : (
              sortedData.map((row) => (
                <TableRow 
                  key={row.id} 
                  className="cursor-pointer"
                  onClick={() => router.push(`/department/objectives/${row.id}`)}
                >
                  <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.includes(row.id as string)} 
                      onCheckedChange={(checked) => toggleOne(row.id as string, checked as boolean)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.process}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setObjToDelete(row)
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
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
