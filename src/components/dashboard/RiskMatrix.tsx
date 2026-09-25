"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
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
          <CardDescription className="whitespace-nowrap">Risk distribution for {period || "current period"}</CardDescription>
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
        <div className="flex flex-row h-[300px] w-full items-stretch pt-2">
          {/* Y-axis label container with perfect flex centering */}
          <div className="w-8 shrink-0 flex items-center justify-center pr-2">
            <span className="-rotate-90 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase whitespace-nowrap">
              Likelihood
            </span>
          </div>
          
          <div className="flex-1 flex flex-col min-w-0">
            <div className="grid grid-cols-5 gap-1.5 flex-1 w-full">
            {levels.map((likelihood) => (
              levels.slice().reverse().map((severity) => {
                const count = getRiskCount(likelihood, severity)
                const color = getCellColor(likelihood, severity)
                const hasRisks = count > 0

                return (
                  <Link
                    href={`/department/risks?likelihood=${likelihood}&severity=${severity}`}
                    key={`${likelihood}-${severity}`}
                    className={`relative rounded-sm flex items-center justify-center text-sm font-bold transition-all ${color} ${
                      hasRisks 
                        ? "ring-1 ring-inset ring-black/20 dark:ring-white/20 shadow-sm hover:scale-105 cursor-pointer z-10" 
                        : "opacity-30 dark:opacity-20 cursor-default"
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
                  </Link>
                )
              })
            ))} 
          </div>
            
            {/* X-axis label container */}
            <div className="h-8 shrink-0 flex items-center justify-center pt-2">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                Severity
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
