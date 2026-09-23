/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CircleNotch } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { DetailSkeleton } from "@/components/shared/DetailSkeleton"
import KpiForm, { KpiFormData } from "@/components/forms/KpiForm"
import { createClient } from "@/lib/supabase/client"
import { useEmployee } from "@/lib/employee-context"

export default function NewKpiPage() {
  const router = useRouter()
  const supabase = createClient()
  const employee = useEmployee()
  const employeeId = employee?.id
  const userDepartmentId = employee?.department_id
  const canOverrideDepartment = employee?.role === 'SYSTEM_ADMIN'

  const [saving, setSaving] = useState(false)
  const [processes, setProcesses] = useState<{id: string, name: string}[]>([])
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([])
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [showConfirmProcess, setShowConfirmProcess] = useState(false)
  const [pendingData, setPendingData] = useState<KpiFormData | null>(null)

  useEffect(() => {
    async function fetchLookups() {
      if (!employee) return

      // Fetch processes
      let procQuery = supabase.from("processes").select("id, process_name").order("process_name")
      if (!canOverrideDepartment) {
        procQuery = procQuery.eq('department_id', userDepartmentId)
      }
      const { data: procRows } = await procQuery
      if (procRows) {
        setProcesses(procRows.map((p: any) => ({ id: p.id, name: p.process_name })))
      }
      
      // Fetch departments
      const { data: deptRows } = await supabase.from('departments').select('id, department_name').order('department_name')
      if (deptRows) {
        setDepartments(deptRows.map((d: any) => ({ id: d.id, name: d.department_name })))
      }
      
      setLoadingLookups(false)
    }
    fetchLookups()
  }, [supabase, employee, canOverrideDepartment, userDepartmentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const executeCreate = async (data: KpiFormData, processId: string) => {
    const targetDeptId = data.departmentId || userDepartmentId
    if (!employeeId || !targetDeptId) {
      toast.error("Current user context not found.")
      setSaving(false)
      return
    }

    // 1. Insert KPI
    const { data: kpi, error } = await supabase.from("kpi_definitions").insert({
      process_id: processId,
      kpi_name: data.name,
      target_value: data.target,
      unit: "",
      source: data.dataSource ?? "Manual",
      analysis_frequency: "MONTHLY",
      custom_metadata: {
        responsibility: data.responsibility,
        analysisMethodology: data.analysisMethodology,
        customFields: data.customFields ?? [],
      },
    }).select('id').single()

    if (error || !kpi) {
      console.error("Supabase INSERT error:", error)
      toast.error(`Failed to save KPI: ${error?.message}`)
      setSaving(false)
      return
    }

    // 2. Submit to Approval Engine
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SUBMIT',
        entityType: 'kpi',
        entityId: kpi.id,
        departmentId: targetDeptId,
        requestedBy: employeeId
      })
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(`Workflow engine error: ${err.error}`)
      setSaving(false)
      return
    }

    setSaving(false)
    toast.success(`"${data.name}" submitted for approval successfully.`)
    router.push("/department/kpis")
  }

  const handleCreate = async (data: KpiFormData) => {
    const proc = processes.find((p) => p.name.toLowerCase() === data.processName.toLowerCase().trim())
    
    if (!proc) {
      setPendingData(data)
      setShowConfirmProcess(true)
      return
    }

    setSaving(true)
    await executeCreate(data, proc.id)
  }

  const handleConfirmNewProcess = async () => {
    const targetDeptId = pendingData?.departmentId || userDepartmentId
    if (!pendingData || !targetDeptId) return
    setShowConfirmProcess(false)
    setSaving(true)

    const { data: newProc, error } = await supabase.from('processes').insert({
      process_name: pendingData.processName.trim(),
      department_id: targetDeptId
    }).select('id').single()

    if (error || !newProc) {
      toast.error(`Failed to create process: ${error?.message}`)
      setSaving(false)
      return
    }

    await executeCreate(pendingData, newProc.id)
  }

  if (loadingLookups) return <DetailSkeleton />

  return (
    <div className="flex-1 p-4 md:p-6 w-full max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/department/kpis")}
          className="shrink-0"
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New KPI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define a new Key Performance Indicator for this reporting cycle.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <KpiForm
          mode="create"
          processes={processes.map((p) => p.name)}
          departments={departments}
          userDepartmentId={userDepartmentId}
          canOverrideDepartment={canOverrideDepartment}
          onSubmit={handleCreate}
          onCancel={() => router.push("/department/kpis")}
        />
        {saving && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CircleNotch className="h-4 w-4 animate-spin" />
            Saving and submitting for approval...
          </div>
        )}
      </div>

      {/* Custom Alert Dialog for New Process */}
      {showConfirmProcess && pendingData && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold tracking-tight mb-2">Create New Process</h2>
            <p className="text-sm text-muted-foreground mb-6">
              The process <strong className="text-slate-900 dark:text-slate-100">&quot;{pendingData.processName.trim()}&quot;</strong> does not exist in your department yet. Do you want to create it?
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirmProcess(false)}>
                Cancel
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleConfirmNewProcess}>
                Create & Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

