/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CircleNotch } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { DetailSkeleton } from "@/components/shared/DetailSkeleton"
import RiskForm, { RiskFormData, AvailableObjective } from "@/components/forms/RiskForm"
import { createClient } from "@/lib/supabase/client"

export default function CreateRiskPage() {
  const router = useRouter()
  const supabase = createClient()

  const [processes, setProcesses] = useState<{ id: string; name: string }[]>([])
  const [availableObjectives, setAvailableObjectives] = useState<AvailableObjective[]>([])
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchLookups() {
      // Fetch risk_procedures (these are the "processes" for the Risk form)
      const { data: procRows } = await supabase
        .from("risk_procedures")
        .select("id, procedure_name")
        .order("procedure_name")
      if (procRows) {
        setProcesses(procRows.map((p: any) => ({ id: p.id, name: p.procedure_name })))
      }

      // Fetch objective names to populate the "Linked Objective" picker
      const { data: objRows } = await supabase
        .from("objective_definitions")
        .select("id, objective_description, departments ( department_name )")
      if (objRows) {
        setAvailableObjectives(
          objRows.map((o: any) => ({
            name: o.objective_description,
            processName: o.departments?.department_name ?? "General",
          }))
        )
      }

      setLoadingLookups(false)
    }
    fetchLookups()
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (data: RiskFormData) => {
    setSaving(true)

    // Resolve the procedure_id from the selected process name
    const proc = processes.find((p) => p.name === data.processName)
    if (!proc) {
      toast.error("Could not find the selected procedure. Please try again.")
      setSaving(false)
      return
    }

    const { error } = await supabase.from("risk_definitions").insert({
      procedure_id: proc.id,
      risk_statement: data.title,
      affected_assets: data.description,
      threat: data.description,              // both map to description until form is expanded
      vulnerability: data.description,
      treatment_solution: data.mitigationStrategy,
      baseline_likelihood: data.likelihood,
      baseline_severity: data.severity,
      custom_metadata: {
        linkedObjective: data.linkedObjective,
        customFields: data.customFields ?? [],
      },
      is_active: true,
    })

    setSaving(false)

    if (error) {
      console.error("Supabase INSERT error:", error)
      toast.error(`Failed to save: ${error.message}`)
      return
    }

    toast.success(`"${data.title}" has been logged successfully.`)
    router.push("/department/risks")
  }

  if (loadingLookups) return <DetailSkeleton />

  return (
    <div className="flex-1 p-4 md:p-6 w-full max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/department/risks")}
          className="shrink-0"
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log New Risk</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Identify and assess a new risk for this reporting cycle.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <RiskForm
          mode="create"
          processes={processes.map((p) => p.name)}
          availableObjectives={availableObjectives}
          onSubmit={handleCreate}
          onCancel={() => router.push("/department/risks")}
        />
        {saving && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CircleNotch className="h-4 w-4 animate-spin" />
            Saving to database...
          </div>
        )}
      </div>
    </div>
  )
}

