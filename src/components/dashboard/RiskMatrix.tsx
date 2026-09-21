"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"

export function RiskMatrix({ period, departmentId, refreshKey }: { period?: string, departmentId?: string, refreshKey?: number }) {
  const [risks, setRisks] = useState<any[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
        async function fetchRisks() {
      // 1. Fetch baseline risks
      let q = supabase.from('risk_definitions').select('id, baseline_severity, baseline_likelihood, risk_procedures!inner(department_id)').eq('is_active', true)
      if (departmentId && departmentId !== 'ALL') {
        q = q.eq('risk_procedures.department_id', departmentId)
      }
      const { data: baseRisks } = await q
      
      if (!baseRisks) return

      // 2. Fetch assessments for the current period to get residual scores
      let cycleQ = supabase.from('report_cycles').select('id').eq('reporting_period', period || 'Q1 2026')
      if (departmentId && departmentId !== 'ALL') {
        cycleQ = cycleQ.eq('department_id', departmentId)
      }
      const { data: cycles } = await cycleQ
      
      let assessments: any[] = []
      if (cycles && cycles.length > 0) {
        const cycleIds = cycles.map((c: any) => c.id)
        const { data: a } = await supabase.from('risk_assessments').select('risk_id, residual_severity, residual_likelihood').in('report_cycle_id', cycleIds)
        if (a) assessments = a
      }

      setRisks(baseRisks.map((r: any) => {
        const assessment = assessments.find(a => a.risk_id === r.id)
        return {
          severity: assessment?.residual_severity || r.baseline_severity || 1,
          likelihood: assessment?.residual_likelihood || r.baseline_likelihood || 1
        }
      }))
    }
    fetchRisks()
  }, [departmentId, period, refreshKey, supabase])

  const getRiskCount = (likelihood: number, severity: number) => {
    return risks.filter(r => r.likelihood === likelihood && r.severity === severity).length
  }

  // To build a 5x5 matrix
  const levels = [5, 4, 3, 2, 1]

  const getCellColor = (l: number, s: number) => {
    const score = l * s
    if (score >= 15) return "bg-rose-500 dark:bg-rose-600 text-white"
    if (score >= 10) return "bg-orange-400 dark:bg-orange-500 text-white"
    if (score >= 5) return "bg-amber-400 dark:bg-amber-500 text-amber-950"
    return "bg-emerald-400 dark:bg-emerald-500 text-white"
  }

  const legendItems = [
    { label: "Low", color: "bg-emerald-400 dark:bg-emerald-500" },
    { label: "Medium", color: "bg-amber-400 dark:bg-amber-500" },
    { label: "High", color: "bg-orange-400 dark:bg-orange-500" },
    { label: "Critical", color: "bg-rose-500 dark:bg-rose-600" }
  ]

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Risk Heatmap</CardTitle>
          <CardDescription>Risk distribution for {period || "current period"}</CardDescription>
        </div>
        {/* Legend at Top Right */}
        <div className="flex flex-wrap items-center gap-3 sm:justify-end shrink-0">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${item.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {/* h-[300px] matching ChartContainer */}
        <div className="h-[300px] w-full relative pl-6 pb-6 pt-2 pr-2">
          {/* Y-axis label */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-medium text-muted-foreground tracking-wider uppercase transform origin-center">
            Likelihood
          </div>
          
          <div className="grid grid-cols-5 gap-1 h-full w-full">
            {levels.map((likelihood) => (
              levels.slice().reverse().map((severity) => {
                const count = getRiskCount(likelihood, severity)
                const color = getCellColor(likelihood, severity)
                const hasRisks = count > 0

                return (
                  <div
                    key={`${likelihood}-${severity}`}
                    className={`relative rounded-sm flex items-center justify-center text-sm font-bold transition-all ${color} ${
                      hasRisks 
                        ? "ring-1 ring-inset ring-black/20 dark:ring-white/20 shadow-sm" 
                        : "opacity-30 dark:opacity-20"
                    }`}
                    title={`L:${likelihood} × S:${severity} = Score:${likelihood * severity}`}
                  >
                    {hasRisks && (
                      <>
                        {/* Visual current-state marker (pulsing dot) */}
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white shadow-sm"></span>
                        </span>
                        {count}
                      </>
                    )}
                  </div>
                )
              })
            ))}
          </div>

          {/* X-axis label */}
          <div className="absolute bottom-0 left-6 right-2 text-center text-[10px] font-medium text-muted-foreground tracking-wider uppercase mt-2">
            Severity
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
