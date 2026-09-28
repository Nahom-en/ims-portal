/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ShieldWarning, Pulse, ClockCounterClockwise, Lock } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { DetailSkeleton } from "@/components/shared/DetailSkeleton"
import { Badge } from "@/components/ui/badge"
import RiskForm, { RiskFormData, RiskStatus } from "@/components/forms/RiskForm"
import { createClient } from "@/lib/supabase/client"
import { useEmployee } from "@/lib/employee-context"
import { submitForApproval } from "@/lib/workflow"

function getScoreColor(score: number) {
  if (score >= 15) return { bg: "bg-destructive/20 dark:bg-rose-900/40", text: "text-rose-800 dark:text-rose-400", label: "Critical" }
  if (score >= 5)  return { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-400", label: "Medium" }
  return { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-400", label: "Low" }
}

function StatusBadge({ status }: { status: RiskStatus }) {
  switch (status) {
    case "Open":
      return <Badge className="bg-destructive/20 text-rose-800 hover:bg-destructive/20 dark:bg-rose-900/40 dark:text-rose-400">Open</Badge>
    case "Mitigating":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400">Mitigating</Badge>
    case "Closed":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400">Closed</Badge>
  }
}

export default function RiskDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const supabase = createClient()
  const employee = useEmployee()
  const [activeTab, setActiveTab] = useState<"profile" | "mitigation" | "history">("profile")
  const [risk, setRisk] = useState<RiskFormData | null>(null)
  const [cycleStatus, setCycleStatus] = useState<string | null>(null)
  const [availableObjectives, setAvailableObjectives] = useState<{name: string, processName: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [processes, setProcesses] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    async function fetchRisk() {
      const { data, error } = await supabase
        .from("risk_definitions")
        .select("*, risk_procedures ( procedure_name, department_id )")
        .eq("id", id)
        .single()

      if (error || !data) { setLoading(false); return }

      const deptId = (data.risk_procedures as any)?.department_id
      
      if (deptId) {
        // Fetch Objectives for linking
        const { data: objs } = await supabase.from("objective_definitions").select("objective_description, processes(name)").eq("department_id", deptId)
        if (objs) {
          setAvailableObjectives(objs.map((o: any) => ({
            name: o.objective_description,
            processName: o.processes?.name || "Unknown Process"
          })))
        }

        // Fetch processes
        const { data: procs } = await supabase.from("processes").select("id, name").eq("department_id", deptId)
        if (procs) setProcesses(procs)

        const { data: cycle } = await supabase
          .from("report_cycles")
          .select("id, workflow_status")
          .eq("department_id", deptId)
          .eq("reporting_period", "Q1 2026")
          .maybeSingle()

        if (cycle) {
          setCycleStatus(cycle.workflow_status)
        }
      }

      const meta = data.custom_metadata as any ?? {}
      const l = data.baseline_likelihood ?? 1
      const s = data.baseline_severity ?? 1
      setRisk({
        id: data.id,
        period: "Q1 2026",
        processName: (data.risk_procedures as any)?.procedure_name ?? "",
        title: data.risk_statement,
        description: data.affected_assets ?? "",
        likelihood: l,
        severity: s,
        riskScore: l * s,
        mitigationStrategy: data.treatment_solution ?? "",
        status: "Mitigating",
        linkedObjective: meta.linkedObjective ?? "",
        customFields: meta.customFields ?? [],
      })
      setLoading(false)
    }
    fetchRisk()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <DetailSkeleton />
    )
  }

  if (!risk) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[50vh]">
        <ShieldWarning className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">Risk Not Found</h2>
        <p className="text-muted-foreground text-sm mt-2">The risk you are looking for does not exist or was deleted.</p>
        <Button variant="outline" className="mt-6" onClick={() => router.push("/department/risks")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Risks
        </Button>
      </div>
    )
  }

  // A risk is locked if it is Closed or if the reporting cycle is in review/approved
  const isLocked = risk.status === "Closed" || cycleStatus === "PENDING_APPROVAL" || cycleStatus === "APPROVED"


  const handleUpdate = async (updatedData: RiskFormData) => {
    try {
      await submitForApproval(supabase, {
        entityType: "risk",
        entityId: id,
        departmentId: employee?.department_id || "",
        requestedBy: employee?.id || "",
        payload: {
          id: id,
          risk_statement: updatedData.title,
          affected_assets: updatedData.description,
          threat: updatedData.description,
          vulnerability: updatedData.description,
          treatment_solution: updatedData.mitigationStrategy,
          baseline_likelihood: updatedData.likelihood,
          baseline_severity: updatedData.severity,
          custom_metadata: {
            linkedObjective: updatedData.linkedObjective,
            treatmentType: updatedData.treatmentType,
            change_type: "UPDATE",
            proposed_changes: updatedData,
            author_id: employee?.id,
          },
        },
      })
      toast.success(`Edit request for "${updatedData.title}" submitted for approval.`)
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`)
    }
  }

  const scoreColor = getScoreColor(risk.riskScore)

  return (
    <div className="flex-1 p-4 md:p-6 w-full max-w-[1400px] mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/department/risks")}
            className="shrink-0 mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge variant="outline" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground bg-muted dark:bg-zinc-900">
                {risk.processName}
              </Badge>
              <StatusBadge status={risk.status} />
              <Badge className={`${scoreColor.bg} ${scoreColor.text} hover:${scoreColor.bg} font-semibold text-[11px] tabular-nums`}>
                Score: {risk.riskScore} · {scoreColor.label}
              </Badge>
              {isLocked && (
                <Badge variant="outline" className="text-[11px] border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400 gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {risk.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              {risk.description || "No description provided."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="border-b border-border dark:border-zinc-800">
        <div className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "profile" 
                ? "border-blue-600 text-primary dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <ShieldWarning className="h-4 w-4" />
            Risk Profile
          </button>
          <button
            onClick={() => setActiveTab("mitigation")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "mitigation" 
                ? "border-blue-600 text-primary dark:border-blue-500 dark:text-blue-400" 
                : "border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            <Pulse className="h-4 w-4" />
            Mitigation Plan
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
        
        {activeTab === "profile" && (
          <RiskForm
            key={`profile-${risk.id}`}
            initialData={risk}
            mode={isLocked ? "view-all" : "edit-plan"}
            readOnly={isLocked}
            processes={processes.map((p: {id: string, name: string}) => p.name)}
            availableObjectives={availableObjectives}
            onSubmit={handleUpdate}
            onCancel={() => router.push("/department/risks")}
          />
        )}

        {activeTab === "mitigation" && (
          <RiskForm
            key={`mitigation-${risk.id}`}
            initialData={risk}
            mode={isLocked ? "view-all" : "review-progress"}
            readOnly={isLocked}
            processes={processes.map((p: {id: string, name: string}) => p.name)}
            availableObjectives={availableObjectives}
            onSubmit={handleUpdate}
            onCancel={() => router.push("/department/risks")}
          />
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Audit History Log</h3>
              <p className="text-sm text-muted-foreground mt-1">
                System-generated log of all changes made to this risk.
              </p>
            </div>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-zinc-800 before:to-transparent">
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 bg-destructive/20 text-destructive dark:bg-rose-900 dark:text-rose-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  <ShieldWarning className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border dark:border-zinc-800 bg-muted/50 dark:bg-zinc-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Risk Logged</span>
                    <span className="text-xs text-muted-foreground">Jan 12, 2026</span>
                  </div>
                  <p className="text-xs text-muted-foreground">System Admin identified the risk and set initial severity.</p>
                </div>
              </div>
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  <Pulse className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border dark:border-zinc-800 bg-muted/50 dark:bg-zinc-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Mitigation Updated</span>
                    <span className="text-xs text-muted-foreground">Feb 01, 2026</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Status set to {risk.status}. Mitigation plan revised.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
