"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Target, ChartBar, Shield } from "@phosphor-icons/react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { CardSkeleton } from "@/components/shared/CardSkeleton"

export function OverviewCards({ period, departmentId, refreshKey }: { period: string, departmentId?: string, refreshKey?: number }) {
  const router = useRouter()
  const [metrics, setMetrics] = useState({
    objTotal: 0,
    objAchieved: 0,
    kpiTotal: 0,
    kpiAchieved: 0,
    riskTotal: 0,
    riskHighCritical: 0,
    riskRequiringAction: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // 1. Resolve period (e.g. "Q1 2026" or "ALL 2026")
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

      // 2. Query Objectives: COUNT(all objective records)
      let objQ = supabase
        .from('objective_definitions')
        .select('id', { count: 'exact' })
        .eq('is_active', true)

      if (departmentId && departmentId !== 'ALL') {
        objQ = objQ.eq('department_id', departmentId)
      }

      // 3. Query KPIs: COUNT(all KPI records)
      let kpiQ = supabase
        .from('kpi_definitions')
        .select('id, processes!inner(department_id)', { count: 'exact' })
        .eq('is_active', true)

      if (departmentId && departmentId !== 'ALL') {
        kpiQ = kpiQ.eq('processes.department_id', departmentId)
      }

      // 4. Query Risks: COUNT(risks where status = active/open)
      let riskQ = supabase
        .from('risk_definitions')
        .select(`
          id,
          baseline_severity,
          baseline_likelihood,
          treatment_solution,
          custom_metadata,
          risk_procedures!inner(department_id)
        `, { count: 'exact' })
        .eq('is_active', true)

      if (departmentId && departmentId !== 'ALL') {
        riskQ = riskQ.eq('risk_procedures.department_id', departmentId)
      }

      const [objsRes, kpisRes, risksRes] = await Promise.all([objQ, kpiQ, riskQ])

      const objTotal = objsRes.count || objsRes.data?.length || 0
      const kpiTotal = kpisRes.count || kpisRes.data?.length || 0
      const riskTotal = risksRes.count || risksRes.data?.length || 0

      // Calculate Objectives Achieved: COUNT(objectives where Status vs Target = "Achieved")
      let objAchievedCount = 0
      if (objsRes.data && objsRes.data.length > 0 && cycleIds.length > 0) {
        const objIds = objsRes.data.map((o: any) => o.id)
        const { data: trackingData } = await supabase
          .from('objective_tracking')
          .select('objective_id, status_vs_target')
          .in('objective_id', objIds)
          .in('report_cycle_id', cycleIds)
          .eq('status_vs_target', 'Achieved')

        if (trackingData) {
          const uniqueAchieved = new Set(trackingData.map((t: any) => t.objective_id))
          objAchievedCount = uniqueAchieved.size
        }
      }

      // Calculate KPIs Achieved: COUNT(KPIs where actual performance meets or exceeds target)
      let kpiAchievedCount = 0
      if (kpisRes.data && kpisRes.data.length > 0 && cycleIds.length > 0) {
        const kpiIds = kpisRes.data.map((k: any) => k.id)
        const { data: measurements } = await supabase
          .from('kpi_measurements')
          .select('kpi_id, status')
          .in('kpi_id', kpiIds)
          .in('report_cycle_id', cycleIds)
          .eq('status', 'Achieved')

        if (measurements) {
          const uniqueKpisAchieved = new Set(measurements.map((m: any) => m.kpi_id))
          kpiAchievedCount = uniqueKpisAchieved.size
        }
      }

      // Calculate Risks: High/Critical & Requiring Action
      let riskHighCritical = 0
      let riskRequiringAction = 0
      const riskData = risksRes.data || []

      let assessments: any[] = []
      if (cycleIds.length > 0 && riskData.length > 0) {
        const { data: aData } = await supabase
          .from('risk_assessments')
          .select('risk_id, residual_severity, residual_likelihood, treatment_effectiveness, followup_measure')
          .in('report_cycle_id', cycleIds)
        if (aData) assessments = aData
      }

      riskData.forEach((r: any) => {
        const assessment = assessments.find((a: any) => a.risk_id === r.id)
        const s = assessment?.residual_severity || r.baseline_severity || 1
        const l = assessment?.residual_likelihood || r.baseline_likelihood || 1
        const score = s * l

        // High / Critical = score >= 15
        if (score >= 15) {
          riskHighCritical++
        }

        // Requiring Action:
        // - Assessment has treatment_effectiveness of 'CORRECTION' or 'IMPROVEMENT'
        // - OR has a followup measure documented
        // - OR custom_metadata explicitly marks status as 'Open' or 'Mitigating'
        // - OR high risk (score >= 15) with no assessment yet
        // - OR treatment_solution is empty/pending
        const effectiveness = assessment?.treatment_effectiveness
        const statusMeta = r.custom_metadata?.status
        const requiresAction = 
          effectiveness === 'CORRECTION' ||
          effectiveness === 'IMPROVEMENT' ||
          !!assessment?.followup_measure ||
          statusMeta === 'Open' ||
          statusMeta === 'Mitigating' ||
          (!assessment && score >= 15) ||
          !r.treatment_solution

        if (requiresAction) {
          riskRequiringAction++
        }
      })

      setMetrics({
        objTotal,
        objAchieved: objAchievedCount,
        kpiTotal,
        kpiAchieved: kpiAchievedCount,
        riskTotal,
        riskHighCritical,
        riskRequiringAction,
      })
      setLoading(false)
    }

    fetchData()
  }, [departmentId, period, refreshKey, supabase])

  const { objTotal, objAchieved, kpiTotal, kpiAchieved, riskTotal, riskHighCritical, riskRequiringAction } = metrics

  const objAchievementRate = objTotal > 0 ? Math.round((objAchieved / objTotal) * 100) : 0
  const kpiAchievementRate = kpiTotal > 0 ? Math.round((kpiAchieved / kpiTotal) * 100) : 0

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
      {/* ── Card 1: Objectives ── */}
      <Card
        className="cursor-pointer hover:border-primary/50 transition-all shadow-xs"
        onClick={() => router.push("/department/objectives")}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-muted-foreground">Total Objectives</CardTitle>
          <div className="p-2 rounded-lg bg-primary/10 text-primary dark:bg-blue-950/40 dark:text-blue-400">
            <Target className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold tracking-tight text-foreground">{objTotal}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium pt-1">
            <Link
              href="/department/objectives?status=Achieved"
              className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {objAchieved} Achieved
            </Link>
            <Link
              href="/department/objectives"
              className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 transition-colors font-semibold"
              onClick={(e) => e.stopPropagation()}
            >
              {objAchievementRate}% Achievement
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 2: KPIs ── */}
      <Card
        className="cursor-pointer hover:border-primary/50 transition-all shadow-xs"
        onClick={() => router.push("/department/kpis")}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-muted-foreground">Total KPIs</CardTitle>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <ChartBar className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold tracking-tight text-foreground">{kpiTotal}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium pt-1">
            <Link
              href="/department/kpis?status=Achieved"
              className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {kpiAchieved} Achieved
            </Link>
            <Link
              href="/department/kpis"
              className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60 transition-colors font-semibold"
              onClick={(e) => e.stopPropagation()}
            >
              {kpiAchievementRate}% Achievement
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 3: Risks ── */}
      <Card
        className="cursor-pointer hover:border-primary/50 transition-all shadow-xs"
        onClick={() => router.push("/department/risks")}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-muted-foreground">Total Risks</CardTitle>
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <Shield className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold tracking-tight text-foreground">{riskTotal}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium pt-1">
            <Link
              href="/department/risks?status=Critical"
              className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {riskHighCritical} High / Critical
            </Link>
            <Link
              href="/department/risks"
              className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-900/60 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {riskRequiringAction} Requiring Action
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
