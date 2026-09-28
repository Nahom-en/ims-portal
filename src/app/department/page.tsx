"use client"

import { useState } from "react"
import { FilePdf } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { OverviewCards } from "@/components/dashboard/OverviewCards"
import { ObjectiveChart, KpiChart } from "@/components/dashboard/TrendCharts"
import { RiskMatrix } from "@/components/dashboard/RiskMatrix"
import { DashboardActionCenter } from "@/components/dashboard/DashboardActionCenter"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useEmployee } from "@/lib/employee-context"
import { DepartmentFilter } from "@/components/shared/DepartmentFilter"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function DepartmentDashboardPage() {
  const employee = useEmployee()
  const currentDate = new Date()
  const actualQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`
  const actualYear = currentDate.getFullYear().toString()

  // Time-travel state
  const [activeQuarter, setActiveQuarter] = useState(actualQuarter)
  const [activeYear, setActiveYear] = useState(actualYear)
  const [departmentFilter, setDepartmentFilter] = useState<string | 'ALL' | null>(() => employee?.department_id || null)
  
  const [refreshKey, setRefreshKey] = useState(0)

  const isLive = activeQuarter === actualQuarter && activeYear === actualYear

  // Real-time subscription logic
  useEffect(() => {
    if (!isLive || !employee || departmentFilter === null) return

    const supabase = createClient()
    // Subscribe to all measurements. If we have a specific department, we can't easily filter
    // postgres_changes by a joined table. The simplest way is to subscribe to all and just refetch,
    // relying on RLS/ABAC in the fetch itself. 
    const channel = supabase.channel('dashboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kpi_measurements' },
        () => setRefreshKey(prev => prev + 1)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'objective_tracking' },
        () => setRefreshKey(prev => prev + 1)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'risk_assessments' },
        () => setRefreshKey(prev => prev + 1)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'approval_requests' },
        () => setRefreshKey(prev => prev + 1)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isLive, employee, departmentFilter])

  return (
    <div className="flex-1 space-y-3 p-4 md:p-6 w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            
            {/* Dynamic Status Badge */}
            {isLive ? (
              <Badge variant="outline" className="gap-2 px-3 py-1 text-sm font-semibold rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-400 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-2 px-3 py-1 text-sm font-semibold rounded-full border-slate-300 bg-slate-100 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-300 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400 dark:bg-zinc-500"></span>
                </span>
                Past
              </Badge>
            )}
          </div>
          
        </div>

        {/* ── Global Period Picker ── */}
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" className="h-9 gap-2 print:hidden" onClick={() => window.print()}>
            <FilePdf className="h-4 w-4 text-rose-500" />
            <span className="hidden sm:inline">Quarterly Report</span>
          </Button>
        </div>
      </div>

      {/* ── Dashboard Bento Grid ── */}
      
      {/* Row 1: The Quick Pulse (100% width) */}
      <div className="w-full">
        <OverviewCards 
          period={`${activeQuarter} ${activeYear}`} 
          departmentId={employee?.role !== 'SYSTEM_ADMIN' ? employee?.department_id : (departmentFilter !== 'ALL' ? departmentFilter : undefined)}
          refreshKey={refreshKey}
        />
      </div>

      {/* ── Symmetrical Charts Row (3 proportional charts) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ObjectiveChart 
          period={`${activeQuarter} ${activeYear}`}
          departmentId={employee?.role !== 'SYSTEM_ADMIN' ? employee?.department_id : (departmentFilter !== 'ALL' ? departmentFilter : undefined)}
          refreshKey={refreshKey}
        />
        <KpiChart 
          period={`${activeQuarter} ${activeYear}`}
          departmentId={employee?.role !== 'SYSTEM_ADMIN' ? employee?.department_id : (departmentFilter !== 'ALL' ? departmentFilter : undefined)}
          refreshKey={refreshKey}
        />
        <RiskMatrix 
          period={`${activeQuarter} ${activeYear}`}
          departmentId={employee?.role !== 'SYSTEM_ADMIN' ? employee?.department_id : (departmentFilter !== 'ALL' ? departmentFilter : undefined)}
          refreshKey={refreshKey}
        />
      </div>

      {/* ── Action Center (My Approvals / My Requests) ── */}
      <DashboardActionCenter 
        employee={employee}
        refreshKey={refreshKey}
      />
    </div>
  )
}
