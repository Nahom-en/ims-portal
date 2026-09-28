/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CircleNotch } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { DetailSkeleton } from "@/components/shared/DetailSkeleton"
import RiskForm, { RiskFormData, AvailableObjective, AvailableEmployee, ProcessItem } from "@/components/forms/RiskForm"
import { createClient } from "@/lib/supabase/client"
import { useEmployee } from "@/lib/employee-context"
import { submitForApproval } from "@/lib/workflow"

export default function CreateRiskPage() {
  const router = useRouter()
  const supabase = createClient()
  const employee = useEmployee()

  const [processes, setProcesses] = useState<ProcessItem[]>([])
  const [employees, setEmployees] = useState<AvailableEmployee[]>([])
  const [availableObjectives, setAvailableObjectives] = useState<AvailableObjective[]>([])
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchLookups() {
      // 1. Fetch risk_procedures & processes (combined for comprehensive selection)
      const { data: procRows } = await supabase
        .from("risk_procedures")
        .select("id, procedure_name")
        .order("procedure_name")

      const { data: generalProcRows } = await supabase
        .from("processes")
        .select("id, process_name")
        .order("process_name")

      const processMap = new Map<string, ProcessItem>()
      if (procRows) {
        procRows.forEach((p: any) => {
          processMap.set(p.id, { id: p.id, name: p.procedure_name })
        })
      }
      if (generalProcRows) {
        generalProcRows.forEach((p: any) => {
          if (!processMap.has(p.id)) {
            processMap.set(p.id, { id: p.id, name: p.process_name })
          }
        })
      }
      setProcesses(Array.from(processMap.values()))

      // 2. Fetch employees for the Risk Owner picker
      const { data: empRows } = await supabase
        .from("employees")
        .select("id, firstname, lastname, role")
        .order("firstname")

      if (empRows) {
        setEmployees(
          empRows.map((e: any) => ({
            id: e.id,
            name: `${e.firstname} ${e.lastname}`.trim(),
            role: e.role,
          }))
        )
      }

      // 3. Fetch objectives for the Linked Objective picker
      const { data: objRows } = await supabase
        .from("objective_definitions")
        .select("id, objective_description, departments ( department_name )")

      if (objRows) {
        setAvailableObjectives(
          objRows.map((o: any) => ({
            id: o.id,
            name: o.objective_description,
            processName: o.departments?.department_name ?? "General",
          }))
        )
      }

      setLoadingLookups(false)
    }
    fetchLookups()
  }, [supabase])

  const handleCreate = async (data: RiskFormData) => {
    if (!employee) {
      toast.error("Employee context not loaded.")
      return
    }

    setSaving(true)

    const ownerName = employees.find((e) => e.id === data.ownerId)?.name || data.ownerName || ""
    const targetDeptId = employee.department_id || ""
    const entityId = crypto.randomUUID()

    const payload = {
      id: entityId,
      procedure_id: data.processId || null,
      owner_id: data.ownerId || employee.id,
      risk_statement: data.title,
      affected_assets: data.description,
      threat: data.description,
      vulnerability: data.description,
      treatment_solution: data.riskResponse || data.mitigationStrategy || "Mitigate",
      baseline_likelihood: data.likelihood,
      baseline_severity: data.severity,
      custom_metadata: {
        department_id: targetDeptId,
        description: data.description,
        processId: data.processId,
        processName: data.processName,
        ownerId: data.ownerId,
        ownerName: ownerName,
        linkedObjective: data.linkedObjective,
        riskResponse: data.riskResponse || "Mitigate",
        riskRating: data.riskRating,
        actionStatus: "Pending",
        change_type: "CREATE",
        author_id: employee.id,
      },
      is_active: false,
    }

    try {
      await submitForApproval(supabase, {
        entityType: "risk",
        entityId: entityId,
        departmentId: targetDeptId,
        requestedBy: employee.id,
        payload: payload,
      })

      toast.success(`"${data.title}" submitted for approval.`)
      router.push("/department/risks")
    } catch (err: any) {
      console.error("Workflow submission error:", err)
      toast.error(`Failed to submit: ${err.message || "Approval submission failed"}`)
    } finally {
      setSaving(false)
    }
  }

  if (loadingLookups || !employee) return <DetailSkeleton />

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

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <RiskForm
          mode="create"
          processes={processes}
          employees={employees}
          availableObjectives={availableObjectives}
          onSubmit={handleCreate}
          onCancel={() => router.push("/department/risks")}
        />
        {saving && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CircleNotch className="h-4 w-4 animate-spin" />
            Saving risk to database...
          </div>
        )}
      </div>
    </div>
  )
}
