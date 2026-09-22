"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, MagnifyingGlass, Target, ChartBar, ShieldWarning } from "@phosphor-icons/react"

type DeptData = {
  name: string
  objectives: number
  kpis: number
  risks: number
}

export function DepartmentUsageList({ data }: { data: DeptData[] }) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("most-active")

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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-lg">Department Usage</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Shows how many Objectives, KPIs, and Risks each department has registered. Empty departments may need onboarding support.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              {emptyDepts > 0
                ? `${emptyDepts} department${emptyDepts > 1 ? "s" : ""} with zero entries`
                : "All departments have active data"}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most-active">Most Active</SelectItem>
              <SelectItem value="least-active">Least Active</SelectItem>
              <SelectItem value="alphabetical">A → Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
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
                        style={{ width: `${(dept.objectives / maxVal) * 100}%` }}
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
                        style={{ width: `${(dept.kpis / maxVal) * 100}%` }}
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
                        style={{ width: `${(dept.risks / maxVal) * 100}%` }}
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
