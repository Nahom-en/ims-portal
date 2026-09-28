/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { X, ArrowSquareOut } from "@phosphor-icons/react"
import { createClient } from "@/lib/supabase/client"

export function RiskMatrix({ period, departmentId, refreshKey }: { period?: string, departmentId?: string, refreshKey?: number }) {
  const router = useRouter()
  const [risks, setRisks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState<{ likelihood: number; severity: number; risks: any[] } | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const activePeriod = period || `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`

  useEffect(() => {
    async function fetchRisks() {
      setLoading(true)

      // 1. Fetch active baseline risks
      let q = supabase
        .from('risk_definitions')
        .select(`
          id,
          risk_statement,
          treatment_solution,
          baseline_severity,
          baseline_likelihood,
          is_active,
          custom_metadata,
          risk_procedures!inner(procedure_name, department_id)
        `)
        .eq('is_active', true)

      if (departmentId && departmentId !== 'ALL') {
        q = q.eq('risk_procedures.department_id', departmentId)
      }
      const { data: baseRisks } = await q
      
      if (!baseRisks) {
        setRisks([])
        setLoading(false)
        return
      }

      // 2. Fetch assessments for the selected period
      const parts = activePeriod.split(" ")
      const quarterPart = parts[0]
      const yearPart = parts[1]
      let cycleQ = supabase.from('report_cycles').select('id, reporting_period')
      if (departmentId && departmentId !== 'ALL') {
        cycleQ = cycleQ.eq('department_id', departmentId)
      }
      if (quarterPart && quarterPart !== 'ALL') {
        cycleQ = cycleQ.ilike('reporting_period', `%${quarterPart}%`)
      }
      if (yearPart) {
        cycleQ = cycleQ.ilike('reporting_period', `%${yearPart}%`)
      }
      const { data: cycles } = await cycleQ
      
      let assessments: any[] = []
      if (cycles && cycles.length > 0) {
        const cycleIds = cycles.map((c: any) => c.id)
        const { data: a } = await supabase
          .from('risk_assessments')
          .select('risk_id, residual_severity, residual_likelihood, treatment_effectiveness, followup_measure')
          .in('report_cycle_id', cycleIds)
        if (a) assessments = a
      }

      // 3. Map only active risks
      const mapped = baseRisks
        .filter((r: any) => {
          const meta = r.custom_metadata as any
          return r.is_active !== false && meta?.status !== 'Closed'
        })
        .map((r: any) => {
          const assessment = assessments.find(a => a.risk_id === r.id)
          const severity = assessment?.residual_severity || r.baseline_severity || 1
          const likelihood = assessment?.residual_likelihood || r.baseline_likelihood || 1
          const meta = r.custom_metadata as any
          return {
            id: r.id,
            title: r.risk_statement,
            procedureName: (r.risk_procedures as any)?.procedure_name || "General",
            treatmentSolution: r.treatment_solution || "None specified",
            status: meta?.status || "Open",
            severity,
            likelihood,
            score: severity * likelihood
          }
        })

      setRisks(mapped)
      setLoading(false)
    }

    fetchRisks()
  }, [departmentId, activePeriod, refreshKey, supabase])

  const getMatchingRisks = (likelihood: number, severity: number) => {
    return risks.filter(r => r.likelihood === likelihood && r.severity === severity)
  }

  // 5x5 Matrix coordinates:
  // Likelihood rows: 5 down to 1
  // Severity columns: 1 up to 5
  const likelihoods = [5, 4, 3, 2, 1]
  const severities = [1, 2, 3, 4, 5]

  const getCellStyle = (score: number, count: number) => {
    if (score >= 15) {
      return count > 0
        ? "bg-rose-600 hover:bg-rose-700 text-white ring-1 ring-rose-400 font-bold shadow-sm"
        : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-300 border border-rose-500/20"
    }
    if (score >= 8) {
      return count > 0
        ? "bg-amber-500 hover:bg-amber-600 text-white ring-1 ring-amber-300 font-bold shadow-sm"
        : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/20"
    }
    return count > 0
      ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-1 ring-emerald-300 font-bold shadow-sm"
      : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
  }

  const getScoreRating = (score: number) => {
    if (score >= 15) return { label: "High / Critical", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800" }
    if (score >= 8) return { label: "Medium", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" }
    return { label: "Low", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" }
  }

  return (
    <Card className="h-full flex flex-col relative">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Risk Heatmap</CardTitle>
          <CardDescription>
            {loading ? "Loading risk distribution..." : `${risks.length} active risks plotted by Likelihood & Severity`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-muted-foreground">Low (1-7)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[11px] text-muted-foreground">Med (8-14)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-[11px] text-muted-foreground">High (15-25)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="flex flex-col w-full max-w-[420px] mx-auto py-1">
          {/* Top Severity Column Numbers */}
          <div className="flex items-center pl-10 pr-1 pb-1">
            <div className="grid grid-cols-5 gap-1.5 flex-1 text-center">
              {severities.map(s => (
                <span key={s} className="text-[11px] font-semibold text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Matrix Body with Likelihood Labels */}
          <div className="flex items-stretch">
            {/* Likelihood vertical title + row numbers */}
            <div className="flex items-center mr-1">
              <span className="-rotate-90 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase select-none w-4">
                Likelihood
              </span>
              <div className="flex flex-col justify-between h-[230px] py-1 text-right pr-2">
                {likelihoods.map(l => (
                  <span key={l} className="text-[11px] font-semibold text-muted-foreground h-9 flex items-center justify-end">
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* 5x5 Heatmap Grid */}
            <div className="grid grid-cols-5 gap-1.5 flex-1">
              {likelihoods.map(l =>
                severities.map(s => {
                  const cellRisks = getMatchingRisks(l, s)
                  const count = cellRisks.length
                  const score = l * s
                  const style = getCellStyle(score, count)

                  return (
                    <button
                      type="button"
                      key={`${l}-${s}`}
                      onClick={() => setSelectedCell({ likelihood: l, severity: s, risks: cellRisks })}
                      className={`h-9 rounded flex items-center justify-center text-xs font-semibold transition-transform active:scale-95 cursor-pointer relative ${style}`}
                      title={`Likelihood ${l} × Severity ${s} = Score ${score} (${count} risks)`}
                    >
                      {count > 0 && (
                        <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                        </span>
                      )}
                      <span>{count}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Severity Axis Label */}
          <div className="text-center pt-2 pl-8">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase select-none">
              Severity
            </span>
          </div>
        </div>
      </CardContent>

      {/* ── Interactive Drill-down Modal on Cell Click ── */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">
                    L: {selectedCell.likelihood} × S: {selectedCell.severity} = Score {selectedCell.likelihood * selectedCell.severity}
                  </h3>
                  <Badge variant="outline" className={`text-xs ${getScoreRating(selectedCell.likelihood * selectedCell.severity).color}`}>
                    {getScoreRating(selectedCell.likelihood * selectedCell.severity).label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedCell.risks.length} active {selectedCell.risks.length === 1 ? "risk" : "risks"} found
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCell(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {selectedCell.risks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No active registered risks with Likelihood {selectedCell.likelihood} and Severity {selectedCell.severity}.
                </div>
              ) : (
                selectedCell.risks.map((r: any) => (
                  <div key={r.id} className="p-3.5 rounded-lg border bg-muted/40 hover:bg-muted/70 transition-colors flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm leading-snug">{r.title}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {r.procedureName}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      <span className="font-medium text-foreground">Treatment:</span> {r.treatmentSolution}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <Badge variant="outline" className="text-[10px] bg-background">
                        {r.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-primary hover:text-primary"
                        onClick={() => {
                          setSelectedCell(null)
                          router.push(`/department/risks/${r.id}`)
                        }}
                      >
                        View Risk
                        <ArrowSquareOut className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const l = selectedCell.likelihood
                  const s = selectedCell.severity
                  setSelectedCell(null)
                  router.push(`/department/risks?likelihood=${l}&severity=${s}`)
                }}
              >
                View in Risk Register
              </Button>
              <Button size="sm" onClick={() => setSelectedCell(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
