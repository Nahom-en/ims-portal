const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DepartmentUsageList.tsx', 'utf8');

// We rewrite DepartmentUsageList to match SystemActivityChart's data fetching and filtering
const newCode = `"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, MagnifyingGlass, Target, ChartBar, ShieldWarning } from "@phosphor-icons/react"
import { createClient } from "@/lib/supabase/client"

type DeptOption = { id: string; name: string }
type DeptData = {
  name: string
  objectives: number
  kpis: number
  risks: number
}

export function DepartmentUsageList({ departments }: { departments: DeptOption[] }) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("most-active")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedQuarter, setSelectedQuarter] = useState("ALL")
  
  const [data, setData] = useState<DeptData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      
      let cycleQ = supabase.from("report_cycles").select("id, department_id, reporting_period")
      if (selectedYear !== "ALL") {
        cycleQ = cycleQ.like("reporting_period", \`%\${selectedYear}%\`)
      }
      if (selectedQuarter !== "ALL") {
        cycleQ = cycleQ.like("reporting_period", \`%\${selectedQuarter}%\`)
      }
      
      const { data: cycles } = await cycleQ

      if (!cycles || cycles.length === 0) {
        setData(departments.map(d => ({ name: d.name, objectives: 0, kpis: 0, risks: 0 })))
        setLoading(false)
        return
      }

      const deptCycles: Record<string, string[]> = {}
      departments.forEach(d => deptCycles[d.id] = [])
      cycles.forEach(c => {
        if (deptCycles[c.department_id]) {
          deptCycles[c.department_id].push(c.id)
        }
      })

      const deptData = await Promise.all(
        departments.map(async (dept) => {
          const cycleIds = deptCycles[dept.id] || []
          if (cycleIds.length === 0) {
            return { name: dept.name, objectives: 0, kpis: 0, risks: 0 }
          }
          
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
            name: dept.name,
            objectives: objCount || 0,
            kpis: kpiCount || 0,
            risks: riskCount || 0,
          }
        })
      )

      setData(deptData)
      setLoading(false)
    }

    fetchData()
  }, [departments, selectedYear, selectedQuarter, supabase])

  const filtered = useMemo(() => {
    let result = data.filter((d) =>
      d.name.toLowerCase().includes(search.toLowerCase())
    )

    switch (sortBy) {
      case "most-active":
        result.sort((a, b) => (b.objectives + b.kpis + b.risks) - (a.objectives + a.kpis + a.risks))
        break
      case "least-active":
        result.sort((a, b) => (a.objectives + a.kpis + a.risks) - (b.objectives + b.kpis + b.risks))
        break
      case "alphabetical":
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return result
  }, [data, search, sortBy])

  const maxVal = Math.max(...data.flatMap((d) => [d.objectives, d.kpis, d.risks]), 1)
  const emptyDepts = data.filter((d) => d.objectives + d.kpis + d.risks === 0).length

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-lg">Department Usage</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}>
                  </TooltipTrigger>
                  <TooltipContent>
                    Shows how many tracking submissions (Objectives, KPIs, and Risks) each department has recorded in the selected period.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              {loading ? "Loading..." : emptyDepts > 0
                ? \`\${emptyDepts} department\${emptyDepts > 1 ? "s" : ""} with zero submissions\`
                : "All departments have active submissions"}
            </CardDescription>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col gap-2 pt-2">
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
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Yrs</SelectItem>
                {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search depts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most-active">Most Active</SelectItem>
                <SelectItem value="least-active">Least Active</SelectItem>
                <SelectItem value="alphabetical">A → Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading usage data...</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No departments match your search.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((dept) => {
              const total = dept.objectives + dept.kpis + dept.risks
              return (
                <div key={dept.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{dept.name}</p>
                    <span className="text-xs text-muted-foreground">{total} total</span>
                  </div>
                  {/* Objectives bar */}
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: \`\${(dept.objectives / maxVal) * 100}%\` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-5 text-right tabular-nums">{dept.objectives}</span>
                  </div>
                  {/* KPIs bar */}
                  <div className="flex items-center gap-2">
                    <ChartBar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: \`\${(dept.kpis / maxVal) * 100}%\` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-5 text-right tabular-nums">{dept.kpis}</span>
                  </div>
                  {/* Risks bar */}
                  <div className="flex items-center gap-2">
                    <ShieldWarning className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all"
                        style={{ width: \`\${(dept.risks / maxVal) * 100}%\` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-5 text-right tabular-nums">{dept.risks}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
`

fs.writeFileSync('src/components/admin/DepartmentUsageList.tsx', newCode);
