/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CircleNotch } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { DetailSkeleton } from "@/components/shared/DetailSkeleton"
import ObjectiveForm, { ObjectiveFormData, AvailableKpi } from "@/components/forms/ObjectiveForm"
import { createClient } from "@/lib/supabase/client"
import { submitForApproval } from "@/lib/workflow"

// ── Quarter string → ISO date range ─────────────────────────────────────────
// e.g. "Q2 2026" → { start: "2026-04-01", end: "2026-06-30" }
function quarterToDateRange(quarter: string): { start: string; end: string } {
  const [q, yearStr] = quarter.split(" ")
  const year = parseInt(yearStr ?? String(new Date().getFullYear()), 10)
  const starts: Record<string, string> = {
    Q1: `${year}-01-01`, Q2: `${year}-04-01`,
    Q3: `${year}-07-01`, Q4: `${year}-10-01`,
  }
  const ends: Record<string, string> = {
    Q1: `${year}-03-31`, Q2: `${year}-06-30`,
    Q3: `${year}-09-30`, Q4: `${year}-12-31`,
  }
  return { start: starts[q] ?? `${year}-01-01`, end: ends[q] ?? `${year}-12-31` }
}

export default function CreateObjectivePage() {
  const router = useRouter()
  const supabase = createClient()

  // ── Lookup state ─────────────────────────────────────────────────────────────
  const [processes, setProcesses] = useState<string[]>([])
  const [availableKpis, setAvailableKpis] = useState<AvailableKpi[]>([])
  const [departmentId, setDepartmentId] = useState<string | null>(null)
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchLookups() {
      // Placeholder: use first dept until Auth (Brick 3) gives us a real session
      const { data: dept } = await supabase
        .from("departments")
        .select("id")
        .limit(1)

      if (dept && dept.length > 0) {
        setDepartmentId(dept[0].id)
      } else {
        console.error("Department lookup failed — RLS may be blocking anon reads on the departments table.")
      }

      const { data: procRows } = await supabase
        .from("processes")
        .select("process_name")
        .order("process_name")

      if (procRows) setProcesses(procRows.map((p: any) => p.process_name))

      const { data: kpiRows } = await supabase
        .from("kpi_definitions")
        .select("kpi_name, processes ( process_name )")

      if (kpiRows) {
        setAvailableKpis(
          kpiRows.map((k: any) => ({
            name: k.kpi_name,
            processName: k.processes?.process_name ?? "General",
          }))
        )
      }

      setLoadingLookups(false)
    }
    fetchLookups()
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Supabase INSERT ──────────────────────────────────────────────────────────
  const handleCreate = async (data: ObjectiveFormData) => {
    if (!departmentId) {
      toast.error("No department found. Please contact your system administrator.")
      return
    }
    
    if (!employee) {
      toast.error("Employee context not loaded.")
      return
    }

    setSaving(true)

    const { start, end } = quarterToDateRange(data.targetDate ?? "Q1 2026")
    
    const payload = {
      department_id: departmentId,
      objective_description: data.name,
      success_criteria: data.successCriteria ?? null,
      start_date: start,
      end_date: end,
      custom_metadata: {
        processName: data.processName,
        description: data.description,
        linkedKpis: data.linkedKpis,
        customFields: data.customFields ?? [],
        change_type: 'CREATE'
      },
      is_active: false // Only becomes active when approved
    }

    try {
      await submitForApproval(supabase, {
        entityType: 'objective',
        departmentId: departmentId,
        requestedBy: employee.id,
        payload: payload
      })

      toast.success(`Objective submitted for approval.`)
      router.push("/department/objectives")
    } catch (error: any) {
      console.error("Workflow submission error:", error)
      toast.error(`Failed to submit: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loadingLookups) return <DetailSkeleton />

  return (
    <div className="flex-1 p-4 md:p-6 w-full max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/department/objectives")}
          className="shrink-0"
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Objective</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define a new departmental objective for this reporting cycle.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <ObjectiveForm
          mode="create"
          processes={processes}
          availableKpis={availableKpis}
          onSubmit={handleCreate}
          onCancel={() => router.push("/department/objectives")}
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
