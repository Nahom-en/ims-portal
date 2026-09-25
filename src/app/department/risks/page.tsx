"use client";
import { ScrollableTableWrapper } from "@/components/shared/ScrollableTableWrapper";
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, ShieldWarning, Trash, Lock, CaretUp, CaretDown, CaretRight, Warning, WarningCircle, Clock, MagnifyingGlass, Funnel, Info } from "@phosphor-icons/react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { RiskFormData, RiskStatus } from "@/components/forms/RiskForm"

// ── Score Helpers ──

function getScoreColor(score: number) {
  if (score >= 15) return { bg: "bg-destructive/20 dark:bg-rose-900/40", text: "text-rose-800 dark:text-rose-400", label: "Critical" }
  if (score >= 5)  return { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-400", label: "Medium" }
  return { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-400", label: "Low" }
}

function ScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score)
  return (
    <Badge className={`${color.bg} ${color.text} hover:${color.bg} font-semibold tabular-nums`}>
      {score} · {color.label}
    </Badge>
  )
}

function StatusBadge({ status }: { status: RiskStatus }) {
  switch (status) {
    case "Open":
      return <Badge className="bg-destructive/20 text-rose-800 hover:bg-destructive/20 dark:bg-rose-900/40 dark:text-rose-400">Open</Badge>
    case "Mitigating":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400">Mitigating</Badge>
    case "Closed":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400">Closed</Badge>
  }
}

import { useEmployee } from "@/lib/employee-context"

import { DepartmentFilter } from "@/components/shared/DepartmentFilter"

export default function RiskRegisterPage() {
  const router = useRouter()
  const employee = useEmployee()
  const [data, setData] = useState<any[]>(/* eslint-disable-line @typescript-eslint/no-explicit-any */ [])
  const [loading, setLoading] = useState(true)
  const [riskToDelete, setRiskToDelete] = useState<any | null>(null /* eslint-disable-line @typescript-eslint/no-explicit-any */)
  const [departmentFilter, setDepartmentFilter] = useState<string | 'ALL' | null>(() => employee?.department_id || null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  
  const supabase = createClient()

  // Reporting Period
  const currentDate = new Date()
  const actualQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`
  const actualYear = currentDate.getFullYear().toString()
  const [activeQuarter, setActiveQuarter] = useState(actualQuarter)
  const [activeYear, setActiveYear] = useState(actualYear)



  useEffect(() => {
    async function fetchData() {
      if (!employee || departmentFilter === null) return

      let query = supabase
        .from('risk_definitions')
        .select(`
          id,
          risk_statement,
          baseline_likelihood,
          baseline_severity,
          risk_procedures!inner ( procedure_name, department_id )
        `)
      
      if (departmentFilter !== 'ALL') {
        query = query.eq('risk_procedures.department_id', departmentFilter)
      }
      
      const { data: risks } = await query
      
      if (risks) {
        const mapped = risks.map((r: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
          const l = r.baseline_likelihood || 1;
          const s = r.baseline_severity || 1;
          return {
            id: r.id,
            processName: r.risk_procedures?.procedure_name || "General Procedure",
            title: r.risk_statement,
            likelihood: l,
            severity: s,
            riskScore: l * s,
            linkedObjective: "",
            status: "Mitigating"
          }
        })
        setData(mapped)
      }
      setLoading(false)
    }
    fetchData()
  }, [supabase, employee, departmentFilter])

  // A risk is "locked" once it has been marked Closed
  const processedData = useMemo(() => {
    let result = data;
    result = result.filter(d => {
      if (statusFilter !== "ALL") {
        if (statusFilter === "Critical" && d.riskScore < 15) return false;
        if (statusFilter === "Medium" && (d.riskScore < 5 || d.riskScore >= 15)) return false;
        if (statusFilter === "Low" && (d.riskScore === 0 || d.riskScore >= 5)) return false;
        if (statusFilter === "Not Assessed" && d.riskScore > 0) return false;
      }
      return d.title.toLowerCase().includes(search.toLowerCase()) || 
             d.process.toLowerCase().includes(search.toLowerCase());
    });
    
    result = [...result].sort((a, b) => {
      if (!sortKey) return 0
      let aVal = a[sortKey]
      let bVal = b[sortKey]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result;
  }, [data, search, statusFilter, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const isLocked = (risk: RiskFormData) => risk.status === "Closed"

  // Collapsible process groups
  const [collapsedProcesses, setCollapsedProcesses] = useState<Set<string>>(new Set())

  const toggleProcess = (processName: string) => {
    setCollapsedProcesses(prev => {
      const next = new Set(prev)
      if (next.has(processName)) {
        next.delete(processName)
      } else {
        next.add(processName)
      }
      return next
    })
  }

  const handleDelete = () => {
    if (riskToDelete) {
      setData(data.filter(r => r.id !== riskToDelete.id))
      toast.success(`"${riskToDelete.title}" was permanently deleted.`)
      setRiskToDelete(null)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto relative">
      {/* ── Page Header & Stats ── */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Warning className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Risks</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {departmentFilter !== null && (
              <DepartmentFilter 
                value={departmentFilter} 
                onChange={(val) => setDepartmentFilter(val)} 
              />
            )}
            <Select value={activeQuarter} onValueChange={(v) => v && setActiveQuarter(v)}>
            <SelectTrigger className="w-[80px] h-9 text-sm bg-muted dark:bg-zinc-900 border-border dark:border-zinc-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["ALL", "Q1","Q2","Q3","Q4"].map((q) => (
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
            <Button
              className="bg-primary hover:bg-primary/90 text-white gap-2 h-9"
              onClick={() => router.push("/department/risks/new")}
            >
              <Plus className="h-4 w-4" />
              Log Risk
            </Button>
          </div>
        </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Risks</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Total number of active risks identified.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active registered risks</p>
            </CardContent>
          </Card>
          
          <Card className={data.filter(d => d.riskScore >= 15).length > 0 ? "bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/20" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className={"text-sm font-medium " + (data.filter(d => d.riskScore >= 15).length > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground')}>High/Critical Risks</CardTitle>
              <WarningCircle className={"h-4 w-4 opacity-70 " + (data.filter(d => d.riskScore >= 15).length > 0 ? 'text-red-600 dark:text-red-500' : 'text-muted-foreground')} />
            </CardHeader>
            <CardContent>
              <div className={"text-2xl font-bold " + (data.filter(d => d.riskScore >= 15).length > 0 ? 'text-red-700 dark:text-red-400' : '')}>
                {data.filter(d => d.riskScore >= 15).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Requires immediate mitigation</p>
            </CardContent>
          </Card>
          
          <Card className={data.filter(d => d.status === 'Overdue').length > 0 ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/20" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className={"text-sm font-medium " + (data.filter(d => d.status === 'Overdue').length > 0 ? 'text-amber-700 dark:text-amber-500' : 'text-muted-foreground')}>Overdue for Review</CardTitle>
              <Clock className={"h-4 w-4 opacity-70 " + (data.filter(d => d.status === 'Overdue').length > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground')} />
            </CardHeader>
            <CardContent>
              <div className={"text-2xl font-bold " + (data.filter(d => d.status === 'Overdue').length > 0 ? 'text-amber-700 dark:text-amber-500' : '')}>
                {data.filter(d => d.status === 'Overdue').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Action required</p>
            </CardContent>
          </Card>
        </div>
      </div>

      

      {/* ── Risk Data Table ── */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mt-2">
        <div className="flex items-center gap-2 w-full max-w-sm relative">
          <MagnifyingGlass className="absolute left-3 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search risks..." 
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
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Not Assessed">Not Assessed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollableTableWrapper>
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-zinc-900/50 sticky top-0 z-10 shadow-sm outline outline-1 outline-border">
            <TableRow>
              <TableHead className="h-10 pl-6">Risk</TableHead>
              <TableHead className="h-10 w-[80px] text-center">L × S</TableHead>
              <TableHead className="h-10">Score</TableHead>
              <TableHead className="h-10">Linked Objective</TableHead>
              <TableHead className="h-10">Status</TableHead>
              <TableHead className="h-10 w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={6} rows={3} />
            ) : processedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">No risks found.</TableCell>
              </TableRow>
            ) : (() => {
              const groups = processedData.reduce<Record<string, RiskFormData[]>>((acc, risk) => {
                const key = risk.processName || "General"
                if (!acc[key]) acc[key] = []
                acc[key].push(risk)
                return acc
              }, {})

              return Object.entries(groups).flatMap(([processName, risks]) => {
                const isCollapsed = collapsedProcesses.has(processName)
                return [
                  // ── Process Section Header Row ──
                  <TableRow
                    key={`group-${processName}`}
                    className="bg-muted/80 dark:bg-zinc-900/60 hover:bg-slate-100/80 dark:hover:bg-zinc-900/80 cursor-pointer select-none"
                    onClick={() => toggleProcess(processName)}
                  >
                    <TableCell colSpan={6} className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        {isCollapsed
                          ? <CaretRight className="h-3.5 w-3.5 text-muted-foreground" />
                          : <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-400">
                          {processName}
                        </span>
                        <span className="text-xs text-muted-foreground dark:text-zinc-500 ml-1">
                          ({risks.length} {risks.length === 1 ? "risk" : "risks"})
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>,
                  ...(!isCollapsed ? risks.map((row) => {
                    const locked = isLocked(row)
                    return (
                      <TableRow
                        key={row.id}
                        onClick={() => router.push(`/department/risks/${row.id}`)}
                        className={`transition-colors cursor-pointer ${locked ? "bg-muted/60 dark:bg-zinc-900/30 hover:bg-slate-100/60 dark:hover:bg-zinc-900/50 opacity-80" : "hover:bg-muted dark:hover:bg-slate-900/50"}`}
                      >
                        <TableCell className="font-medium max-w-[280px] pl-6">
                          <div className="flex items-center gap-2 truncate" title={row.title}>
                            {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            <span className="truncate">{row.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {row.likelihood} × {row.severity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={row.riskScore} />
                        </TableCell>
                        <TableCell>
                          {row.linkedObjective ? (
                            <span className="text-sm text-muted-foreground truncate block max-w-[200px]" title={row.linkedObjective}>
                              {row.linkedObjective}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell>
                          {locked ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-zinc-500 font-medium px-1">
                              <Lock className="h-3 w-3" />
                              <span>Closed</span>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-rose-950/50 transition-colors z-10 relative"
                              title="Delete Risk"
                              onClick={(e) => {
                                e.stopPropagation()
                                setRiskToDelete(row)
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  }) : [])
                ]
              })
            })()}
          </TableBody>
        </Table>
      </ScrollableTableWrapper>

      {/* ── Custom Delete Alert Dialog ── */}
      {riskToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold tracking-tight mb-2">Are you sure?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete <strong className="text-slate-900 dark:text-slate-100">{riskToDelete.title}</strong> from the risk register. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setRiskToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete Risk
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
