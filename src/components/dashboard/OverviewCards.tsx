"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link"
import { Target, ChartBar, ShieldWarning, ArrowRight } from "@phosphor-icons/react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { CardSkeleton } from "@/components/shared/CardSkeleton"

export function OverviewCards({ period, departmentId, refreshKey }: { period: string, departmentId?: string, refreshKey?: number }) {
  const [metrics, setMetrics] = useState({ objTotal: 0, objOnTrack: 0, kpiTotal: 0, kpiMet: 0, riskHigh: 0, riskMed: 0, riskLow: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  

  useEffect(() => {
        async function fetchData() {
      setLoading(true)
      
      // 1. Resolve period (e.g. "Q1 2026")
      const periodStr = period || 'Q1 2026'

      let cycleQ = supabase.from('report_cycles').select('id')
      if (periodStr.startsWith('ALL ')) {
        cycleQ = cycleQ.like('reporting_period', `%${periodStr.split(' ')[1]}`)
      } else {
        cycleQ = cycleQ.eq('reporting_period', periodStr)
      }
      if (departmentId && departmentId !== 'ALL') {
        cycleQ = cycleQ.eq('department_id', departmentId)
      }
      const { data: cycles } = await cycleQ
      const cycleIds = cycles ? cycles.map(c => c.id) : []

      // 2. Query basic definitions
      let objQ = supabase.from('objective_definitions').select('id', { count: 'exact' }).eq('is_active', true)
      let riskQ = supabase.from('risk_definitions').select('id, baseline_severity, baseline_likelihood, risk_procedures!inner(department_id)').eq('is_active', true)

      if (departmentId && departmentId !== 'ALL') {
        objQ = objQ.eq('department_id', departmentId)
        riskQ = riskQ.eq('risk_procedures.department_id', departmentId)
      }

      const [objs, risks] = await Promise.all([objQ, riskQ])

      // 3. Objectives tracking count
      let objOnTrackCount = 0
      if (objs.data && objs.data.length > 0 && cycleIds.length > 0) {
        const objIds = objs.data.map((o: any) => o.id)
        const { data: trackingData } = await supabase
          .from('objective_tracking')
          .select('objective_id, status_vs_target')
          .in('objective_id', objIds)
          .in('report_cycle_id', cycleIds)
          .not('status_vs_target', 'is', null)
        
        if (trackingData) {
          const onTrack = trackingData.filter((t:any) => t.status_vs_target === 'On Track' || t.status_vs_target === 'Achieved')
          const uniqueObjectivesOnTrack = new Set(onTrack.map((t:any) => t.objective_id))
          objOnTrackCount = uniqueObjectivesOnTrack.size
        }
      }

      // 4. KPI Performance
      let kpiTotalCount = 0
      let kpiMetCount = 0
      if (cycleIds.length > 0) {
        const { data: kpis } = await supabase.from('kpi_measurements').select('status').in('report_cycle_id', cycleIds)
        if (kpis) {
          kpiTotalCount = kpis.length
          kpiMetCount = kpis.filter((k: any) => k.status === 'Achieved' || k.status === 'On Track').length
        }
      }

      // 5. Risks
      let riskHigh = 0
      let riskMed = 0
      let riskLow = 0
      
      const riskData = risks.data || []
      
      if (cycleIds.length > 0 && riskData.length > 0) {
        const { data: assessments } = await supabase.from('risk_assessments').select('risk_id, residual_severity, residual_likelihood').in('report_cycle_id', cycleIds)
        
        riskData.forEach((r: any) => {
          const assessment = assessments?.find((a:any) => a.risk_id === r.id)
          const s = assessment?.residual_severity || r.baseline_severity || 1
          const l = assessment?.residual_likelihood || r.baseline_likelihood || 1
          const score = s * l
          if (score >= 15) riskHigh++
          else if (score >= 8) riskMed++
          else riskLow++
        })
      } else {
        // Fallback to baseline if no assessments
        riskData.forEach((r: any) => {
          const s = r.baseline_severity || 1
          const l = r.baseline_likelihood || 1
          const score = s * l
          if (score >= 15) riskHigh++
          else if (score >= 8) riskMed++
          else riskLow++
        })
      }

      setMetrics({
        objTotal: objs.count || 0,
        objOnTrack: objOnTrackCount,
        kpiTotal: kpiTotalCount,
        kpiMet: kpiMetCount,
        riskHigh,
        riskMed,
        riskLow
      })
      setLoading(false)
    }
    fetchData()
  }, [departmentId, period, refreshKey, supabase])

  const { objTotal, objOnTrack, kpiTotal, kpiMet, riskHigh, riskMed, riskLow } = metrics
  const objLagging = objTotal - objOnTrack
  const kpiOff = kpiTotal - kpiMet
  const kpiSuccessRate = kpiTotal > 0 ? Math.round((kpiMet / kpiTotal) * 100) : 0
  const totalRisk = riskHigh + riskMed + riskLow

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* ── 1. Objective Card ── */}
      <Card className="">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-muted-foreground">
            Objectives
          </CardTitle>
          <div className="p-2 rounded-lg bg-primary/10 text-primary dark:bg-blue-950/40 dark:text-blue-400">
            <Target className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-bold tracking-tight text-foreground">{objTotal}</div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {objOnTrack} on track
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              {objLagging} lagging
            </span>
          </div>
        </CardContent>
        
      </Card>

      {/* ── 2. KPI Card ── */}
      <Card className="">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-muted-foreground">KPIs</CardTitle>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <ChartBar className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">{kpiSuccessRate}%</span>
            <span className="text-sm font-medium text-muted-foreground">success</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {kpiMet} met
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
              {kpiOff} missed
            </span>
          </div>
        </CardContent>
        
      </Card>

      {/* ── 3. Risk Card ── */}
      <Card className="">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-muted-foreground">Risks</CardTitle>
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <ShieldWarning className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-bold tracking-tight text-foreground">{totalRisk}</div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
              {riskHigh} high
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              {riskMed} med
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {riskLow} low
            </span>
          </div>
        </CardContent>
        
      </Card>
    </div>
  )
}
