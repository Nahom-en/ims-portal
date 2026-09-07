"use client"

import { useMemo } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { mockObjectives, mockKpis } from "@/lib/mockData"

// --- Chart Configs ---
const objectiveConfig = {
  achieved: {
    label: "Achieved",
    color: "hsl(var(--primary))",
  },
  target: {
    label: "Target",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig

const kpiConfig = {
  score: {
    label: "Performance Score (%)",
    color: "var(--coral)",
  },
} satisfies ChartConfig

export function TrendCharts({ period }: { period?: string }) {
  // Extract year from period (e.g., "Q1 2026" -> "2026")
  const activeYear = period ? period.split(" ")[1] : new Date().getFullYear().toString()
  const activeQuarter = period ? period.split(" ")[0] : `Q${Math.floor(new Date().getMonth() / 3) + 1}`

  // 1. Build Objective Data for the whole active year (Q1, Q2, Q3, Q4)
  const objectiveData = useMemo(() => {
    const quarters = ["Q1", "Q2", "Q3", "Q4"]
    return quarters.map(q => {
      const qPeriod = `${q} ${activeYear}`
      const objs = mockObjectives.filter(o => o.period === qPeriod)
      const target = objs.length
      const achieved = objs.filter(o => o.status === "On Track").length
      return { quarter: q, achieved, target }
    })
  }, [activeYear])

  // 2. Build KPI Data for the selected period
  // We'll calculate a single average achievement score for the selected quarter, 
  // but to show a trend, we'll mock the previous months leading up to it.
  const kpiData = useMemo(() => {
    // Get KPIs for the selected period
    const kpis = mockKpis.filter(k => k.period === period)
    const totalAchieved = kpis.filter(k => k.status === "Achieved").length
    const score = kpis.length > 0 ? Math.round((totalAchieved / kpis.length) * 100) : 0

    // Determine the months of the selected quarter
    const quarterNum = parseInt(activeQuarter.replace("Q", ""))
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    // Last 6 months leading up to the end of the quarter
    const endMonthIndex = quarterNum * 3 - 1 // e.g., Q1 -> Mar (index 2)
    const trend = []
    
    for (let i = 5; i >= 0; i--) {
      let mIndex = endMonthIndex - i
      if (mIndex < 0) {
        mIndex += 12
      }
      // Mock the previous scores slightly lower/higher to create a trend line, ending on the actual calculated score
      const variance = i === 0 ? 0 : Math.floor(0.5 * 15) - 5
      let prevScore = Math.min(100, Math.max(0, score - (i * 2) + variance))
      if (score === 0 && i !== 0) prevScore = 0 // If no data, keep it 0
      
      trend.push({
        month: `${monthNames[mIndex]}`,
        score: i === 0 ? score : prevScore
      })
    }
    
    return trend
  }, [period, activeQuarter])


  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      
      {/* ── Objectives Progress (Bar Chart) ── */}
      <Card>
        <CardHeader>
          <CardTitle>Objective Completion</CardTitle>
          <CardDescription>{activeYear} Quarterly targets vs achieved</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={objectiveConfig} className="h-[300px] w-full">
            <BarChart accessibilityLayer data={objectiveData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="quarter"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={10} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
              <Bar dataKey="achieved" fill="var(--color-achieved)" radius={4} />
              <Bar dataKey="target" fill="var(--color-target)" opacity={0.3} radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ── KPI Trend (Area Chart) ── */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Performance Trend</CardTitle>
          <CardDescription>Aggregate score for {activeQuarter} {activeYear}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={kpiConfig} className="h-[300px] w-full">
            <AreaChart accessibilityLayer data={kpiData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickMargin={10} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="var(--color-score)"
                fill="var(--color-score)"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

    </div>
  )
}
