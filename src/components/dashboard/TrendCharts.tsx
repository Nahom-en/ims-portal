/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo, useState, useEffect } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { createClient } from "@/lib/supabase/client"

const objectiveStatusConfig = {
  count: { label: "Objectives", color: "hsl(var(--primary))" },
} satisfies ChartConfig

const kpiTrendConfig = {
  achievement: { label: "Achievement Rate (%)", color: "var(--coral, #E8624A)" },
} satisfies ChartConfig

export function ObjectiveChart({ period, departmentId, refreshKey }: { period?: string, departmentId?: string, refreshKey?: number }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const activePeriod = period || `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      // 1. Get all active objectives for the department
      let objQ = supabase.from('objective_definitions').select('id, objective_description').eq('is_active', true)
      if (departmentId && departmentId !== 'ALL') {
        objQ = objQ.eq('department_id', departmentId)
      }
      const { data: objs } = await objQ
      
      if (!objs || objs.length === 0) {
        setData([])
        setLoading(false)
        return
      }

      // 2. Get report cycles for the active period
      const parts = activePeriod.split(" ")
      const q = parts[0]
      const y = parts[1]
      let cycleQ = supabase.from('report_cycles').select('id, reporting_period')
      if (departmentId && departmentId !== 'ALL') {
        cycleQ = cycleQ.eq('department_id', departmentId)
      }
      if (q && q !== 'ALL') cycleQ = cycleQ.ilike('reporting_period', `%${q}%`)
      if (y) cycleQ = cycleQ.ilike('reporting_period', `%${y}%`)
      const { data: cycles } = await cycleQ
      const cycleIds = cycles?.map(c => c.id) || []
        
      let trackingData: any[] = []
      if (cycleIds.length > 0) {
        const objIds = objs.map(o => o.id)
        const { data: tr } = await supabase.from('objective_tracking')
          .select('objective_id, status_vs_target')
          .in('objective_id', objIds)
          .in('report_cycle_id', cycleIds)
          
        if (tr) trackingData = tr
      }

      // 3. Count occurrences of each actual unique status value
      const statusCounts: Record<string, number> = {}
      objs.forEach((o: any) => {
        const track = trackingData.find((t: any) => t.objective_id === o.id)
        const status = track?.status_vs_target ? String(track.status_vs_target).trim() : null
        if (status) {
          statusCounts[status] = (statusCounts[status] || 0) + 1
        }
      })

      // Convert to chart data array with only the actual values from database
      const result = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }))

      setData(result)
      setLoading(false)
    }
    fetchData()
  }, [activePeriod, departmentId, refreshKey, supabase])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Objective Status</CardTitle>
        <CardDescription>{activePeriod} - Distribution of objectives by actual status</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="flex h-[300px] w-full items-center justify-center text-sm text-muted-foreground animate-pulse">
            Loading objective statuses...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[300px] w-full flex-col items-center justify-center text-sm text-muted-foreground">
            No status data recorded for {activePeriod}
          </div>
        ) : (
          <ChartContainer config={objectiveStatusConfig} className="h-[300px] w-full">
            <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="status" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Objectives" />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function KpiChart({ period, departmentId, refreshKey }: { period?: string, departmentId?: string, refreshKey?: number }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const activePeriod = period || `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`
  const activeQuarter = activePeriod.split(" ")[0] || `Q${Math.floor(new Date().getMonth() / 3) + 1}`
  const activeYear = activePeriod.split(" ")[1] || new Date().getFullYear().toString()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // Determine the list of candidate quarters based on selected filter
      let candidatePeriods: string[] = []
      if (activeQuarter === 'ALL') {
        candidatePeriods = [`Q1 ${activeYear}`, `Q2 ${activeYear}`, `Q3 ${activeYear}`, `Q4 ${activeYear}`]
      } else {
        // Last 4 quarters leading up to selected period
        const qNum = parseInt(activeQuarter.replace("Q", "")) || 1
        const yNum = parseInt(activeYear) || new Date().getFullYear()
        let q = qNum
        let y = yNum
        for (let i = 0; i < 4; i++) {
          candidatePeriods.unshift(`Q${q} ${y}`)
          q--
          if (q === 0) {
            q = 4
            y--
          }
        }
      }

      // 1. Fetch KPI definitions
      let kpiQ = supabase.from('kpi_definitions').select('id, kpi_name, target_value, is_active, processes!inner(department_id)').eq('is_active', true)
      if (departmentId && departmentId !== 'ALL') {
        kpiQ = kpiQ.eq('processes.department_id', departmentId)
      }
      const { data: kpiDefs } = await kpiQ
      const kpis = kpiDefs || []
      const kpiMap = Object.fromEntries(kpis.map((k: any) => [k.id, k]))

      // 2. Fetch report cycles
      let cycleQ = supabase.from('report_cycles')
        .select('id, reporting_period')
        .in('reporting_period', candidatePeriods)
      if (departmentId && departmentId !== 'ALL') {
        cycleQ = cycleQ.eq('department_id', departmentId)
      }
      const { data: cycles } = await cycleQ
      const validCycles = cycles || []

      // 3. Fetch measurements for these cycles
      let measurements: any[] = []
      if (validCycles.length > 0) {
        const cycleIds = validCycles.map((c: any) => c.id)
        const { data: ms } = await supabase
          .from('kpi_measurements')
          .select('kpi_id, report_cycle_id, actual_value, status')
          .in('report_cycle_id', cycleIds)
        if (ms) measurements = ms
      }

      // 4. Calculate Achievement % only for quarters that have actual data
      const points: { period: string; achievement: number }[] = []

      candidatePeriods.forEach(p => {
        const periodCycles = validCycles.filter((c: any) => c.reporting_period === p)
        if (periodCycles.length === 0) return

        const pCycleIds = periodCycles.map((c: any) => c.id)
        const pMeasurements = measurements.filter((m: any) => pCycleIds.includes(m.report_cycle_id))

        // If no KPI measurements exist for this quarter, omit it (no data != zero)
        if (pMeasurements.length === 0) return

        const achievements: number[] = []
        pMeasurements.forEach((m: any) => {
          const kpi = kpiMap[m.kpi_id]
          const actualStr = String(m.actual_value || '').trim()
          const targetStr = String(kpi?.target_value || '').trim()
          const actualNum = parseFloat(actualStr.replace(/[^0-9.-]/g, ''))
          const targetNum = parseFloat(targetStr.replace(/[^0-9.-]/g, ''))

          if (!isNaN(actualNum) && !isNaN(targetNum) && targetNum > 0) {
            achievements.push((actualNum / targetNum) * 100)
          } else if (m.status === 'Achieved') {
            achievements.push(100)
          } else if (m.status === 'Off Track') {
            achievements.push(0)
          }
        })

        if (achievements.length > 0) {
          const quarterAvg = Math.round(achievements.reduce((sum, val) => sum + val, 0) / achievements.length)
          points.push({
            period: p,
            achievement: quarterAvg
          })
        }
      })

      setData(points)
      setLoading(false)
    }

    fetchData()
  }, [activeQuarter, activeYear, activePeriod, departmentId, refreshKey, supabase])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>KPI Achievement Trend</CardTitle>
        <CardDescription>Overall KPI achievement % per recorded quarter</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="flex h-[300px] w-full items-center justify-center text-sm text-muted-foreground animate-pulse">
            Loading achievement trends...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[300px] w-full flex-col items-center justify-center text-sm text-muted-foreground">
            No KPI measurement data recorded for this period
          </div>
        ) : (
          <ChartContainer config={kpiTrendConfig} className="h-[300px] w-full">
            <LineChart accessibilityLayer data={data} margin={{ top: 20, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(v) => `${v}%`} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="achievement" 
                stroke="var(--coral, #E8624A)" 
                strokeWidth={2.5} 
                dot={{ r: 4, fill: "var(--coral, #E8624A)" }} 
                activeDot={{ r: 6 }} 
                name="Achievement %" 
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
