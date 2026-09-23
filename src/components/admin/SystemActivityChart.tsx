"use client"

import { useMemo, useState, useEffect } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "@phosphor-icons/react"
import { createClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig = {
  objectives: { label: "Objectives", color: "hsl(var(--primary))" },
  kpis: { label: "KPIs", color: "hsl(142, 71%, 45%)" },
  risks: { label: "Risks", color: "hsl(0, 84%, 60%)" },
} satisfies ChartConfig

type DeptOption = { id: string; name: string }

export function SystemActivityChart({ departments }: { departments: DeptOption[] }) {
  const [selectedDept, setSelectedDept] = useState("ALL")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedQuarter, setSelectedQuarter] = useState("ALL")
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // Get all report cycles, optionally filtered by department
      let cycleQ = supabase.from("report_cycles").select("id, reporting_period, department_id").order("reporting_period")
      if (selectedDept !== "ALL") {
        cycleQ = cycleQ.eq("department_id", selectedDept)
      }
      if (selectedYear !== "ALL") {
        cycleQ = cycleQ.like("reporting_period", `%${selectedYear}%`)
      }
      if (selectedQuarter !== "ALL") {
        cycleQ = cycleQ.like("reporting_period", `%${selectedQuarter}%`)
      }
      const { data: cycles } = await cycleQ

      if (!cycles || cycles.length === 0) {
        setData([])
        setLoading(false)
        return
      }

      // Group cycles by reporting_period
      const periodMap: Record<string, string[]> = {}
      cycles.forEach((c) => {
        if (!periodMap[c.reporting_period]) periodMap[c.reporting_period] = []
        periodMap[c.reporting_period].push(c.id)
      })

      const chartData = await Promise.all(
        Object.entries(periodMap).map(async ([period, cycleIds]) => {
          const { count: objCount } = await supabase
            .from("objective_tracking")
            .select("id", { count: "exact", head: true })
            .in("report_cycle_id", cycleIds)

          const { count: kpiCount } = await supabase
            .from("kpi_measurements")
            .select("id", { count: "exact", head: true })
            .in("report_cycle_id", cycleIds)

          const { count: riskCount } = await supabase
            .from("risk_assessments")
            .select("id", { count: "exact", head: true })
            .in("report_cycle_id", cycleIds)

          return {
            period,
            objectives: objCount || 0,
            kpis: kpiCount || 0,
            risks: riskCount || 0,
          }
        })
      )

      setData(chartData)
      setLoading(false)
    }

    fetchData()
  }, [selectedDept, selectedYear, selectedQuarter, supabase])

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-lg">System Activity</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground" /></span>}>
                </TooltipTrigger>
                <TooltipContent>
                  Tracks Objectives, KPIs, and Risks recorded per reporting period across the organization.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>Objectives, KPIs & Risks tracked per period</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="Quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Qs</SelectItem>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Yrs</SelectItem>
              {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
            No tracking data available yet. Submit report cycles to see activity.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillObjectives" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillKpis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillRisks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="objectives" stroke="hsl(var(--primary))" fill="url(#fillObjectives)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="kpis" stroke="hsl(142, 71%, 45%)" fill="url(#fillKpis)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="risks" stroke="hsl(0, 84%, 60%)" fill="url(#fillRisks)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ChartContainer>
        )}
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Objectives
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "hsl(142, 71%, 45%)" }} />
            KPIs
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "hsl(0, 84%, 60%)" }} />
            Risks
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
