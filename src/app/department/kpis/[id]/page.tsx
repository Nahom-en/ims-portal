/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, FileCsv, Pulse, Target, ClockCounterClockwise, Lock, XCircle, Clock } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { DetailSkeleton } from "@/components/shared/DetailSkeleton"
import { WorkflowStepper } from "@/components/shared/WorkflowStepper"
import { Badge } from "@/components/ui/badge"
import KpiForm, { KpiFormData, KpiStatus } from "@/components/forms/KpiForm"
import { createClient } from "@/lib/supabase/client"

function StatusBadge({ status }: { status: KpiStatus }) {
  switch (status) {
    case "Achieved":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400">Achieved</Badge>
    case "Deviated":
      return <Badge className="bg-destructive/20 text-rose-800 hover:bg-destructive/20 dark:bg-rose-900/40 dark:text-rose-400">Deviated</Badge>
    case "Pending":
      return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
  }
}

export default function KpiDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<"definition" | "measurement" | "history">("definition")
  const [kpi, setKpi] = useState<KpiFormData | null>(null)
  const [approvalLogs, setApprovalLogs] = useState<any[]>([])
  const [cycleStatus, setCycleStatus] = useState<string | null>(null)
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchKpi() {
      const { data, error } = await supabase
        .from("kpi_definitions")
        .select("*, processes ( process_name, department_id )")
        .eq("id", id)
        .single()

      if (error || !data) { setLoading(false); return }

      let currentWorkflowStatus: "Draft" | "Pending Approval" | "Published" | "Rejected" = "Draft"
      let currentStepIndex = 0

      const deptId = (data.processes as any)?.department_id
      
      if (deptId) {
        // Fetch workflow template steps
        const { data: wf } = await supabase.from("workflow_templates").select("steps").eq("department_id", deptId).maybeSingle()
        if (wf && wf.steps) setWorkflowSteps(wf.steps as any[])

        // Fetch processes
        const { data: procs } = await supabase.from("processes").select("id, name").eq("department_id", deptId)
        if (procs) setProcesses(procs)

        const { data: cycle } = await supabase
          .from("report_cycles")
          .select("id, workflow_status, current_step_index")
          .eq("department_id", deptId)
          .eq("reporting_period", "Q1 2026")
          .maybeSingle()

        if (cycle) {
          setCycleStatus(cycle.workflow_status)
          currentStepIndex = cycle.current_step_index ?? 0
          if (cycle.workflow_status === "APPROVED") currentWorkflowStatus = "Published"
          else if (cycle.workflow_status === "PENDING_APPROVAL" || cycle.workflow_status === "PENDING") currentWorkflowStatus = "Pending Approval"
          else if (cycle.workflow_status === "REJECTED") currentWorkflowStatus = "Rejected"

          const { data: logs } = await supabase
            .from("approval_logs")
            .select(`
              id,
              action,
              step_name,
              comment,
              created_at,
              employees ( full_name )
            `)
            .eq("report_cycle_id", cycle.id)
            .order("created_at", { ascending: false })

          if (logs) {
            setApprovalLogs(logs)
          }
        }
      }

      const meta = data.custom_metadata as any ?? {}
      setKpi({
        id: data.id,
        period: "Q1 2026",
        processName: (data.processes as any)?.process_name ?? "",
        name: data.kpi_name,
        target: data.target_value,
        dataSource: data.source ?? "",
        analysisFrequency: data.analysis_frequency ?? "",
        responsibility: meta.responsibility ?? "",
        analysisMethodology: meta.analysisMethodology ?? "",
        customFields: meta.customFields ?? [],
        status: "Pending",
        actual: "",
        achievementPercentage: "",
        workflowStatus: currentWorkflowStatus,
        currentStepIndex: currentStepIndex,
      })
      setLoading(false)
    }
    fetchKpi()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <DetailSkeleton />
    )
  }

  if (!kpi) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[50vh]">
        <FileCsv className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">KPI Not Found</h2>
        <p className="text-muted-foreground text-sm mt-2">The KPI you are looking for does not exist or was deleted.</p>
        <Button variant="outline" className="mt-6" onClick={() => router.push("/department/kpis")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to KPIs
        </Button>
      </div>
    )
  }

  // A KPI is locked if it has an actual value, or if the quarterly cycle is in review/approved
  const isLocked = (!!(kpi.actual?.trim()) && kpi.status !== "Pending") || cycleStatus === "PENDING_APPROVAL" || cycleStatus === "APPROVED"


  const handleUpdate = async (updatedData: KpiFormData) => {
    setSaving(true)
    const { error } = await supabase
      .from("kpi_definitions")
      .update({
        kpi_name: updatedData.name,
        target_value: updatedData.target,
        source: updatedData.dataSource ?? "Manual",
        custom_metadata: {
          responsibility: updatedData.responsibility,
          analysisMethodology: updatedData.analysisMethodology,
          customFields: updatedData.customFields ?? [],
        },
      })
      .eq("id", id)
    setSaving(false)
    if (error) { toast.error(`Save failed: ${error.message}`); return }
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
              <Badge variant="outline" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground bg-muted dark:bg-zinc-900">
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
                <span>Achievement: <strong className="text-primary dark:text-blue-400">{kpi.achievementPercentage}</strong></span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Workflow Stepper ── */}
      <WorkflowStepper 
        steps={workflowSteps}
        currentStepIndex={kpi.currentStepIndex ?? 0}
        status={kpi.workflowStatus ?? "Draft"}
        canApprove={kpi.workflowStatus === "Pending Approval"}
        onApprove={() => handleUpdate({ ...kpi, currentStepIndex: (kpi.currentStepIndex || 0) + 1 })}
        onReject={() => handleUpdate({ ...kpi, workflowStatus: "Rejected", currentStepIndex: 0 })}
      />

      {/* ── Tabs Navigation ── */}
      <div className="border-b border-border dark:border-zinc-800">
        <div className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("definition")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "definition" 
                ? "border-blue-600 text-primary dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <Target className="h-4 w-4" />
            KPI Definition
          </button>
          <button
            onClick={() => setActiveTab("measurement")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "measurement" 
                ? "border-blue-600 text-primary dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <Pulse className="h-4 w-4" />
            Performance Tracking
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "history" 
                ? "border-blue-600 text-primary dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <ClockCounterClockwise className="h-4 w-4" />
            History Log
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-xl p-5 md:p-8 shadow-sm">
        
        {activeTab === "definition" && (
          <KpiForm
            key={`def-${kpi.id}`}
            initialData={kpi}
            mode={isLocked ? "view-all" : "edit-plan"}
            readOnly={isLocked}
            processes={processes}
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
            processes={processes}
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
              {approvalLogs.map((log) => (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${
                    log.action === "REJECTED" ? "bg-destructive/20 text-destructive dark:bg-rose-900 dark:text-rose-400" :
                    log.action === "APPROVED" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400" :
                    "bg-primary/20 text-primary dark:bg-blue-900 dark:text-blue-400"
                  }`}>
                    {log.action === "REJECTED" ? <XCircle className="w-4 h-4" /> : <FileCsv className="w-4 h-4" />}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border dark:border-zinc-800 bg-muted/50 dark:bg-zinc-900/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">
                        {log.action === "SUBMITTED" ? "Submitted for Review" : log.action === "APPROVED" ? "Approved & Published" : "Rejected / Revisions Needed"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {log.employees?.full_name || log.step_name || "Workflow Actor"}
                      </span> 
                      {log.comment ? ` left a comment:` : ` performed this action.`}
                    </p>
                    {log.comment && (
                      <div className="mt-2 p-3 bg-white dark:bg-zinc-950 rounded-md border border-border dark:border-zinc-800 text-sm text-slate-600 dark:text-slate-300 italic">
                        &quot;{log.comment}&quot;
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {approvalLogs.length === 0 && (
                <div className="p-8 border border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No workflow actions recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When this department&apos;s reporting cycle is submitted or reviewed, actions will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
