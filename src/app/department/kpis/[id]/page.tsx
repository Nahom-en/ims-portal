"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, FileSpreadsheet, Activity, Target, History, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import KpiForm, { KpiFormData, KpiStatus } from "@/components/forms/KpiForm"
import { mockKpis, mockProcesses } from "@/lib/mockData"

function StatusBadge({ status }: { status: KpiStatus }) {
  switch (status) {
    case "Achieved":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400">Achieved</Badge>
    case "Deviated":
      return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400">Deviated</Badge>
    case "Pending":
      return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
  }
}

export default function KpiDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [activeTab, setActiveTab] = useState<"definition" | "measurement" | "history">("definition")
  const [kpi, setKpi] = useState<KpiFormData | null>(null)

  useEffect(() => {
    const found = mockKpis.find(k => k.id === id)
    if (found) {
      setTimeout(() => setKpi(found), 0)
    }
  }, [id])

  if (!kpi) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[50vh]">
        <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">KPI Not Found</h2>
        <p className="text-muted-foreground text-sm mt-2">The KPI you are looking for does not exist or was deleted.</p>
        <Button variant="outline" className="mt-6" onClick={() => router.push("/department/kpis")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to KPIs
        </Button>
      </div>
    )
  }

  // A KPI is locked if it has an actual value and is not pending
  const isLocked = !!(kpi.actual?.trim()) && kpi.status !== "Pending"

  const handleUpdate = (updatedData: KpiFormData) => {
    setKpi(updatedData)
    toast.success(`KPI "${updatedData.name}" has been updated.`)
  }

  return (
    <div className="flex-1 p-4 md:p-6 w-full max-w-[1400px] mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/department/kpis")}
            className="shrink-0 mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge variant="outline" className="text-[11px] font-medium uppercase tracking-widest text-slate-500 bg-slate-50 dark:bg-zinc-900">
                {kpi.processName}
              </Badge>
              <StatusBadge status={kpi.status} />
              {isLocked && (
                <Badge variant="outline" className="text-[11px] border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400 gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {kpi.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
              <span>Target: <strong className="text-slate-700 dark:text-slate-300">{kpi.target}</strong></span>
              {kpi.achievementPercentage && (
                <span>Achievement: <strong className="text-blue-600 dark:text-blue-400">{kpi.achievementPercentage}</strong></span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="border-b border-slate-200 dark:border-zinc-800">
        <div className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("definition")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "definition" 
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <Target className="h-4 w-4" />
            KPI Definition
          </button>
          <button
            onClick={() => setActiveTab("measurement")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "measurement" 
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <Activity className="h-4 w-4" />
            Performance Tracking
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "history" 
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <History className="h-4 w-4" />
            History Log
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 md:p-8 shadow-sm">
        
        {activeTab === "definition" && (
          <KpiForm
            key={`def-${kpi.id}`}
            initialData={kpi}
            mode={isLocked ? "view-all" : "edit-plan"}
            readOnly={isLocked}
            processes={mockProcesses}
            onSubmit={handleUpdate}
            onCancel={() => router.push("/department/kpis")}
          />
        )}

        {activeTab === "measurement" && (
          <KpiForm
            key={`meas-${kpi.id}`}
            initialData={kpi}
            mode={isLocked ? "view-all" : "review-progress"}
            readOnly={isLocked}
            processes={mockProcesses}
            onSubmit={handleUpdate}
            onCancel={() => router.push("/department/kpis")}
          />
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Audit History Log</h3>
              <p className="text-sm text-muted-foreground mt-1">
                System-generated log of all changes made to this KPI.
              </p>
            </div>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-zinc-800 before:to-transparent">
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  <Target className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">KPI Created</span>
                    <span className="text-xs text-muted-foreground">Jan 12, 2026</span>
                  </div>
                  <p className="text-xs text-muted-foreground">System Admin defined the metric and target.</p>
                </div>
              </div>
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Measurement Logged</span>
                    <span className="text-xs text-muted-foreground">Feb 01, 2026</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Status set to {kpi.status}. Actual performance updated to {kpi.actual || "Pending"}.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
