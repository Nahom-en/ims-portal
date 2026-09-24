/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Target, Pulse, Link as LinkIcon, ClockCounterClockwise, Lock, XCircle, Clock } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { DetailSkeleton } from "@/components/shared/DetailSkeleton"
import { WorkflowStepper } from "@/components/shared/WorkflowStepper"
import { Badge } from "@/components/ui/badge"
import ObjectiveForm, { ObjectiveFormData, ObjectiveStatus } from "@/components/forms/ObjectiveForm"
import { createClient } from "@/lib/supabase/client"
import { useEmployee } from "@/lib/employee-context"

// ── Status Badge Renderer ──
function StatusBadge({ status }: { status: ObjectiveStatus }) {
  switch (status) {
    case "Achieved":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400">Achieved</Badge>
    case "On Track":
      return <Badge className="bg-primary/20 text-blue-800 hover:bg-primary/20 dark:bg-blue-900/40 dark:text-blue-400">On Track</Badge>
    case "At Risk":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400">At Risk</Badge>
    case "Off Track":
      return <Badge className="bg-destructive/20 text-rose-800 hover:bg-destructive/20 dark:bg-rose-900/40 dark:text-rose-400">Off Track</Badge>
  }
}

export default function ObjectiveDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const supabase = createClient()
  const employee = useEmployee()
  const [activeTab, setActiveTab] = useState<"plan" | "progress" | "kpis" | "history">("plan")
  const [objective, setObjective] = useState<ObjectiveFormData | null>(null)
  const [approvalLogs, setApprovalLogs] = useState<any[]>([])
  const [cycleStatus, setCycleStatus] = useState<string | null>(null)
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [availableKpis, setAvailableKpis] = useState<{name: string, processName: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [isEditingPlanRequest, setIsEditingPlanRequest] = useState(false)
  const [updateDataPending, setUpdateDataPending] = useState<ObjectiveFormData | null>(null)
  const [justification, setJustification] = useState("")
  const [showJustificationModal, setShowJustificationModal] = useState(false)
  const [departmentId, setDepartmentId] = useState<string>("")

  useEffect(() => {
    async function fetchObjective() {
      const { data, error } = await supabase
        .from("objective_definitions")
        .select("*")
        .eq("id", id)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      setDepartmentId(data.department_id || "")

      let currentWorkflowStatus: "Draft" | "Pending Approval" | "Published" | "Rejected" = "Draft"
      let currentStepIndex = 0

      
      if (data.department_id) {
        // Fetch workflow template steps
        const { data: wf } = await supabase.from("workflow_templates").select("steps").eq("department_id", data.department_id).maybeSingle()
        if (wf && wf.steps) setWorkflowSteps((wf.steps as any[]).map(s => s.label || s))

        // Fetch KPIs for linking
        const { data: kpis } = await supabase.from("kpi_definitions").select("kpi_name, processes(name)").eq("department_id", data.department_id)
        if (kpis) {
          setAvailableKpis(kpis.map((k: any) => ({
            name: k.kpi_name,
            processName: k.processes?.name || "Unknown Process"
          })))
        }

        // Fetch processes
        const { data: procs } = await supabase.from("processes").select("id, name").eq("department_id", data.department_id)
        if (procs) setProcesses(procs)

        const { data: cycle } = await supabase
          .from("report_cycles")
          .select("id, workflow_status, current_step_index")
          .eq("department_id", data.department_id)
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
      setObjective({
        id: data.id,
        period: "Q1 2026",
        processName: meta.processName ?? "",
        name: data.objective_description,
        description: meta.description ?? "",
        successCriteria: data.success_criteria ?? "",
        targetDate: "Q1 2026",
        linkedKpis: meta.linkedKpis ?? [],
        status: "On Track",
        workflowStatus: currentWorkflowStatus,
        currentStepIndex: currentStepIndex,
      })
      setLoading(false)
    }
    fetchObjective()
  }, [id, supabase])

  if (loading) {
    return (
      <DetailSkeleton />
    )
  }

  if (!objective) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[50vh]">
        <Target className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">Objective Not Found</h2>
        <p className="text-muted-foreground text-sm mt-2">The objective you are looking for does not exist or was deleted.</p>
        <Button variant="outline" className="mt-6" onClick={() => router.push("/department/objectives")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Objectives
        </Button>
      </div>
    )
  }

  const isLocked = objective.is_active === true // Rule: Once approved, it is locked



  const handleUpdate = async (updatedData: ObjectiveFormData) => {
    setSaving(true)
    
    // Instead of updating directly, we create an approval request
    const { error } = await supabase
      .from("approval_requests")
      .insert({
        department_id: departmentId,
        entity_type: "objective",
        entity_id: objective.id,
        requested_by: employee?.id || null,
        status: "PENDING_APPROVAL",
        current_step_index: 1,
        custom_metadata: {
          change_type: "UPDATE",
          proposed_changes: JSON.stringify(updatedData)
        }
      })

    setSaving(false)
    if (error) { toast.error(`Save failed: ${error.message}`); return }
    
    toast.success("Edit submitted for approval.")
  }

  return (
    <div className="flex-1 p-4 md:p-6 w-full max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/department/objectives")}
            className="shrink-0 mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge variant="outline" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground bg-muted dark:bg-zinc-900">
                {objective.processName}
              </Badge>
              <StatusBadge status={objective.status} />
              {isLocked && (
                <Badge variant="outline" className="text-[11px] border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400 gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {objective.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              {objective.description || "No description provided."}
            </p>
          </div>
        </div>
      </div>

      <WorkflowStepper 
        steps={workflowSteps}
        currentStepIndex={objective.currentStepIndex ?? 0}
        status={objective.workflowStatus ?? "Draft"}
        canApprove={objective.workflowStatus === "Pending Approval"}
        onApprove={() => handleUpdate({ ...objective, currentStepIndex: (objective.currentStepIndex || 0) + 1 })}
        onReject={() => handleUpdate({ ...objective, workflowStatus: "Rejected", currentStepIndex: 0 })}
      />

      <div className="border-b border-border dark:border-zinc-800">
        <div className="flex items-center justify-between overflow-x-auto w-full"><div className="flex gap-6">
          <button
            onClick={() => setActiveTab("plan")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "plan" 
                ? "border-blue-600 text-primary dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <Target className="h-4 w-4" />
            Objective Plan
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "progress" 
                ? "border-blue-600 text-primary dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <Pulse className="h-4 w-4" />
            Progress & Audit
          </button>
          <button
            onClick={() => setActiveTab("kpis")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "kpis" 
                ? "border-blue-600 text-primary dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            Linked KPIs ({objective.linkedKpis.length})
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
          {activeTab === "plan" && isLocked && !isEditingPlanRequest && (
            <Button variant="outline" size="sm" onClick={() => setIsEditingPlanRequest(true)}>
              Request Edit
            </Button>
          )}
          {activeTab === "plan" && isEditingPlanRequest && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditingPlanRequest(false)}>
              Cancel Edit
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-xl p-5 md:p-8 shadow-sm">
        
        {activeTab === "plan" && (
          <ObjectiveForm
            key={`plan-${objective.id}`}
            initialData={objective}
            mode={isLocked && !isEditingPlanRequest ? "view-all" : "edit-plan"}
            readOnly={isLocked && !isEditingPlanRequest}
            processes={processes}
            availableKpis={availableKpis}
            onSubmit={onFormSubmit}
            onCancel={() => router.push("/department/objectives")}
          />
        )}

        {activeTab === "progress" && (
          <ObjectiveForm
            key={`progress-${objective.id}`}
            initialData={objective}
            mode={isLocked ? "view-all" : "review-progress"}
            readOnly={isLocked && !isEditingPlanRequest}
            processes={processes}
            availableKpis={availableKpis}
            onSubmit={onFormSubmit}
            onCancel={() => router.push("/department/objectives")}
          />
        )}

        {activeTab === "kpis" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Linked Qualitative KPIs</h3>
              <p className="text-sm text-muted-foreground mt-1">
                These key performance indicators measure the success of this objective.
              </p>
            </div>
            
            {objective.linkedKpis.length === 0 ? (
              <div className="p-8 border border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                <LinkIcon className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No Linked KPIs</p>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  You haven&apos;t linked any KPIs to this objective yet. Edit the Objective Plan to link KPIs.
                </p>
                {!isLocked && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveTab("plan")}>
                    Link KPIs
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {objective.linkedKpis.map(kpi => (
                  <div key={kpi} className="p-4 border rounded-lg bg-muted dark:bg-zinc-900/30 flex items-center gap-3">
                    <div className="p-2 bg-primary/20 text-primary dark:bg-blue-900/40 dark:text-blue-400 rounded-md shrink-0">
                      <Pulse className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{kpi}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Audit History Log</h3>
              <p className="text-sm text-muted-foreground mt-1">
                System-generated log of all changes made to this objective.
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
                    {log.action === "REJECTED" ? <XCircle className="w-4 h-4" /> : <Target className="w-4 h-4" />}
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
      <AlertDialog 
        open={showJustificationModal} 
        title="Justification Required" 
        description="You are requesting to edit an objective that you did not author. Please provide a brief justification."
        onConfirm={() => {
          if (!justification.trim()) {
            toast.error("Justification note is required.")
            return
          }
          if (updateDataPending) {
            handleUpdate(updateDataPending, justification.trim())
          }
        }} 
        onCancel={() => { setShowJustificationModal(false); setUpdateDataPending(null); setJustification(""); }}
        confirmLabel="Submit Change Request" 
      >
        <div className="space-y-2">
          <textarea
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
            placeholder="Why are you requesting this change?"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </div>
      </AlertDialog>
    </div>
  )
}
