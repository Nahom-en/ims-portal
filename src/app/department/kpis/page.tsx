"use client";
import { ScrollableTableWrapper } from "@/components/shared/ScrollableTableWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, FileCsv, Trash, Lock, CaretUp, CaretDown, CaretRight, Pulse, ChartLineUp, CheckCircle, WarningCircle } from "@phosphor-icons/react"
import { TableSkeleton } from "@/components/shared/TableSkeleton"

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

import { KpiFormData } from "@/components/forms/KpiForm"
import { mockKpis } from "@/lib/mockData"

import { useEmployee } from "@/lib/employee-context"

import { DepartmentFilter } from "@/components/shared/DepartmentFilter"

export default function KPITrackingPage() {
  const router = useRouter()
  const employee = useEmployee()
  const [data, setData] = useState<any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */ >([])
  const [loading, setLoading] = useState(true)
  const [kpiToDelete, setKpiToDelete] = useState<any /* eslint-disable-line @typescript-eslint/no-explicit-any */ | null>(null)
  const [departmentFilter, setDepartmentFilter] = useState<string | 'ALL' | null>(() => employee?.department_id || 'ALL')
  
  const supabase = createClient()
  useEffect(() => {
    async function fetchData() {
      if (!employee || departmentFilter === null) return

      let query = supabase
        .from('kpi_definitions')
        .select(`
          id,
          kpi_name,
          target_value,
          
          processes!inner (
            process_name,
            department_id
          )
        `)

      if (departmentFilter !== 'ALL') {
        query = query.eq('processes.department_id', departmentFilter)
      }
      
      const { data: kpis } = await query
      
      if (kpis) {
        const mapped = kpis.map((k: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
          return {
            id: k.id,
            name: k.kpi_name,
            processName: k.processes?.process_name || "Department Metrics",
            responsibility: "Dept Head",
            target: `${k.target_value} `,
            actual: "",
            achievementPercentage: "",
            status: "Pending",
            justification: ""
          }
        })
        setData(mapped)
      }
      setLoading(false)
    }
    fetchData()
  }, [supabase, employee, departmentFilter])

  // Reporting Period
  const currentDate = new Date()
  const actualQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`
  const actualYear = currentDate.getFullYear().toString()
  const [activeQuarter, setActiveQuarter] = useState(actualQuarter)
  const [activeYear, setActiveYear] = useState(actualYear)

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

  const handleDelete = () => {
    if (kpiToDelete) {
      setData(data.filter(kpi => kpi.id !== kpiToDelete.id))
      toast.success(`"${kpiToDelete.name}" was permanently deleted.`)
      setKpiToDelete(null)
    }
  }

  // A KPI is "locked" once it has an actual value and isn't pending
  const isLocked = (kpi: KpiFormData) => !!(kpi.actual?.trim()) && kpi.status !== "Pending"

  // Collapsible process groups — all expanded by default
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

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto relative">
      {/* ── Page Header & Stats ── */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Pulse className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">KPIs</h1>
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
            <Button
              className="bg-primary hover:bg-primary/90 text-white gap-2 h-9"
              onClick={() => setIsCreateSheetOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New KPI
            </Button>
          </div>
        </div>

        {(() => {
          const total = data.length;
          const avgScore = total > 0 ? (data.reduce((acc, k) => acc + (parseFloat(k.achievementPercentage) || 0), 0) / total) : 0;
          const belowTarget = data.filter(d => d.status === 'Below Target').length;
          
          const uniqueProcesses = new Set(data.map(d => d.process)).size;
          
          let scoreColor = "text-emerald-600 dark:text-emerald-500";
          let scoreBg = "bg-emerald-500";
          let scoreBgTrack = "bg-emerald-100 dark:bg-emerald-950/50";
          
          if (avgScore < 50) {
            scoreColor = "text-destructive";
            scoreBg = "bg-destructive";
            scoreBgTrack = "bg-red-100 dark:bg-red-950/50";
          } else if (avgScore < 80) {
            scoreColor = "text-amber-600 dark:text-amber-500";
            scoreBg = "bg-amber-500";
            scoreBgTrack = "bg-amber-100 dark:bg-amber-950/50";
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tracked Metrics</CardTitle>
                  <ChartLineUp className="h-4 w-4 text-primary opacity-70" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{total}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across {uniqueProcesses} department process{uniqueProcesses !== 1 ? 'es' : ''}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Overall Achievement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${scoreColor}`}>
                    {avgScore.toFixed(1)}%
                  </div>
                  <div className={`mt-3 h-1.5 w-full ${scoreBgTrack} rounded-full overflow-hidden`}>
                    <div className={`h-full ${scoreBg} rounded-full`} style={{ width: `${Math.min(100, Math.max(0, avgScore))}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Average target completion</p>
                </CardContent>
              </Card>

              <Card className={belowTarget > 0 ? "bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/20" : "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20"}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className={`text-sm font-medium ${belowTarget > 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'}`}>Underperforming</CardTitle>
                  {belowTarget > 0 ? (
                    <WarningCircle className="h-4 w-4 text-destructive opacity-70" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-600 opacity-70" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${belowTarget > 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {belowTarget > 0 ? belowTarget : 'Targets met'}
                  </div>
                  <p className={`text-xs mt-1 ${belowTarget > 0 ? 'text-destructive/80' : 'text-emerald-600/80 dark:text-emerald-400/80'}`}>
                    {belowTarget > 0 ? 'Metrics requiring intervention' : 'No interventions needed'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )
        })()}
      </div>

      {/* ── KPI Data Table ── */}
      <ScrollableTableWrapper>
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-zinc-900/50 sticky top-0 z-10 shadow-sm outline outline-1 outline-border">
            <TableRow>
              <TableHead className="h-10 pl-6 cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">Metric {sortKey === 'name' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
              </TableHead>
              <TableHead className="h-10">Responsibility</TableHead>
              <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('target')}>
                <div className="flex items-center gap-1">Target {sortKey === 'target' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
              </TableHead>
              <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('actual')}>
                <div className="flex items-center gap-1">Actual {sortKey === 'actual' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
              </TableHead>
              <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('achieved')}>
                <div className="flex items-center gap-1">Achiev. % {sortKey === 'achieved' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
              </TableHead>
              <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status {sortKey === 'status' && (sortDir === 'asc' ? <CaretUp className="h-3 w-3" /> : <CaretDown className="h-3 w-3" />)}</div>
              </TableHead>
              <TableHead className="h-10">Remark/Justification</TableHead>
              <TableHead className="h-10 w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={5} rows={3} />
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                  No KPIs found.
                </TableCell>
              </TableRow>
            ) : (() => {
              // Group KPIs by processName, preserving insertion order
              const groups = data.reduce<Record<string, KpiFormData[]>>((acc, kpi) => {
                const key = kpi.processName || "General"
                if (!acc[key]) acc[key] = []
                acc[key].push(kpi)
                return acc
              }, {})

              return Object.entries(groups).flatMap(([processName, kpis]) => {
                const isCollapsed = collapsedProcesses.has(processName)
                return [
                  // ── Process Section Header Row (clickable toggle) ──
                  <TableRow
                    key={`group-${processName}`}
                    className="bg-muted/80 dark:bg-zinc-900/60 hover:bg-slate-100/80 dark:hover:bg-zinc-900/80 cursor-pointer select-none"
                    onClick={() => toggleProcess(processName)}
                  >
                    <TableCell colSpan={8} className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        {isCollapsed
                          ? <CaretRight className="h-3.5 w-3.5 text-muted-foreground" />
                          : <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground dark:text-zinc-400">
                          {processName}
                        </span>
                        <span className="text-xs text-muted-foreground dark:text-zinc-500 ml-1">
                          ({kpis.length} {kpis.length === 1 ? "metric" : "metrics"})
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>,
                  ...(!isCollapsed ? kpis.map((row) => {
                  const locked = isLocked(row)
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => router.push(`/department/kpis/${row.id}`)}
                      className={`transition-colors cursor-pointer ${locked ? "bg-muted/60 dark:bg-zinc-900/30 hover:bg-slate-100/60 dark:hover:bg-zinc-900/50 opacity-80" : "hover:bg-muted dark:hover:bg-slate-900/50"}`}
                    >
                      <TableCell className="font-medium max-w-[250px] pl-6">
                        <div className="flex items-center gap-2 truncate" title={row.name}>
                          {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <span className="truncate">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate" title={row.responsibility}>
                        {row.responsibility || "-"}
                      </TableCell>
                      <TableCell>{row.target}</TableCell>
                      <TableCell className="font-semibold">{row.actual || "-"}</TableCell>
                      <TableCell className="text-sm font-medium">{row.achievementPercentage || "-"}</TableCell>
                      <TableCell>
                        {row.status === "Achieved" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400">Achieved</Badge>
                        ) : row.status === "Deviated" ? (
                          <Badge className="bg-destructive/20 text-rose-800 hover:bg-destructive/20 dark:bg-rose-900/40 dark:text-rose-400">Deviated</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate" title={row.justification}>
                        {row.justification || "-"}
                      </TableCell>
                      <TableCell>
                        {locked ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-zinc-500 font-medium px-1">
                            <Lock className="h-3 w-3" />
                            <span>Submitted</span>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-rose-950/50 transition-colors z-10 relative"
                            title="Delete KPI"
                            onClick={(e) => {
                              e.stopPropagation();
                              setKpiToDelete(row);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                }) : [])
              ]})
            })()}
          </TableBody>
        </Table>
      </ScrollableTableWrapper>

      {/* ── Custom Delete Alert Dialog ── */}
      {kpiToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold tracking-tight mb-2">Are you sure?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete <strong className="text-slate-900 dark:text-slate-100">{kpiToDelete.name}</strong> and all of its historical measurements. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setKpiToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete KPI
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
