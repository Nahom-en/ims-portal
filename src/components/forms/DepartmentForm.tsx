"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash, GitMerge, ArrowUp, ArrowDown } from "@phosphor-icons/react"
import { SearchableDropdown } from "./SearchableDropdown"
import { toast } from "sonner"

export type DepartmentStatus = "Active" | "Inactive"

export interface WorkflowStepData {
  id?: string
  roleId?: string
  approverId?: string
  label: string
}

export interface DepartmentFormData {
  id?: string
  name: string
  code: string
  description: string
  headOfDepartment: string
  status: DepartmentStatus
  workflowSteps: WorkflowStepData[]
}

interface DepartmentFormProps {
  initialData?: DepartmentFormData | null
  isEditMode?: boolean
  availableUsers?: { id: string; name: string }[]
  companyRoles?: { id: string; title: string }[]
  onSubmit: (data: DepartmentFormData) => void
  onCancel: () => void
}

export default function DepartmentForm({
  initialData,
  isEditMode = false,
  availableUsers = [],
  companyRoles = [],
  onSubmit,
  onCancel,
}: DepartmentFormProps) {
  const [formData, setFormData] = useState<DepartmentFormData>(() => {
    if (initialData) return initialData
    return {
      name: "",
      code: "",
      description: "",
      headOfDepartment: "",
      status: "Active",
      workflowSteps: [],
    }
  })

  const addWorkflowStep = () => {
    const steps = [...formData.workflowSteps]
    steps.push({ roleId: "", label: "New Step" })
    setFormData({ ...formData, workflowSteps: steps })
  }

  const removeWorkflowStep = (index: number) => {
    const steps = [...formData.workflowSteps]
    steps.splice(index, 1)
    setFormData({ ...formData, workflowSteps: steps })
  }

  const updateWorkflowStepLabel = (index: number, label: string) => {
    const steps = [...formData.workflowSteps]
    steps[index].label = label
    setFormData({ ...formData, workflowSteps: steps })
  }

  const updateWorkflowStepApprover = (index: number, approverId: string) => {
    const steps = [...formData.workflowSteps]
    steps[index].approverId = approverId
    setFormData({ ...formData, workflowSteps: steps })
  }

  const updateWorkflowStepRole = (index: number, roleId: string) => {
    const steps = [...formData.workflowSteps]
    steps[index].roleId = roleId
    setFormData({ ...formData, workflowSteps: steps })
  }

  const moveWorkflowStepUp = (index: number) => {
    if (index === 0) return
    const steps = [...formData.workflowSteps]
    const temp = steps[index - 1]
    steps[index - 1] = steps[index]
    steps[index] = temp
    setFormData({ ...formData, workflowSteps: steps })
  }

  const moveWorkflowStepDown = (index: number) => {
    if (index === formData.workflowSteps.length - 1) return
    const steps = [...formData.workflowSteps]
    const temp = steps[index + 1]
    steps[index + 1] = steps[index]
    steps[index] = temp
    setFormData({ ...formData, workflowSteps: steps })
  }

  
  const validateWorkflow = () => {
    if (formData.workflowSteps.length === 0) {
      toast.error("Workflow must have at least one step.")
      return false
    }

    for (let i = 0; i < formData.workflowSteps.length; i++) {
      const step = formData.workflowSteps[i]
      if (!step.approverId) {
        toast.error(`Step ${i + 1} is missing an assigned approver.`)
        return false
      }
      
      if (i > 0 && formData.workflowSteps[i-1].approverId === step.approverId) {
        toast.error(`Step ${i} and Step ${i + 1} cannot have the same approver consecutively.`)
        return false
      }
    }
    
    return true
  }

  const handleSubmit = (data: DepartmentFormData) => {
    if (!validateWorkflow()) return
    onSubmit(data)
  }

  return (
    <div className="space-y-6">
      
      {/* Department Name & Code */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="dept-name">
            Department Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dept-name"
            placeholder="e.g., Human Resources"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dept-code">
            Code <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dept-code"
            placeholder="e.g., HR"
            className="uppercase"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="dept-desc">Description</Label>
        <textarea
          id="dept-desc"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
          placeholder="Briefly describe the department's function..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      {/* Head of Department & Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Head of Department</Label>
          <SearchableDropdown
            value={formData.headOfDepartment || null}
            onChange={(val) => setFormData({ ...formData, headOfDepartment: val === "unassigned" ? "" : val })}
            options={[
              { id: "unassigned", label: "Unassigned" },
              ...availableUsers.map(u => ({ id: u.id, label: u.name }))
            ]}
            placeholder="Assign a department head"
            searchPlaceholder="Search users..."
            emptyMessage="No user found"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex bg-muted/50 p-1 rounded-md border border-input">
            <Button
              type="button"
              variant={formData.status === "Active" ? "default" : "ghost"}
              className={`flex-1 h-8 text-xs ${formData.status === "Active" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-muted-foreground"}`}
              onClick={() => setFormData({ ...formData, status: "Active" })}
            >
              Active
            </Button>
            <Button
              type="button"
              variant={formData.status === "Inactive" ? "default" : "ghost"}
              className={`flex-1 h-8 text-xs ${formData.status === "Inactive" ? "bg-slate-600 hover:bg-slate-700 text-white" : "text-muted-foreground"}`}
              onClick={() => setFormData({ ...formData, status: "Inactive" })}
            >
              Inactive
            </Button>
          </div>
        </div>
      </div>

      {/* ── Workflow JSON Array Builder ── */}
      <div className="space-y-3 pt-4 border-t dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-1.5">
              <GitMerge className="h-4 w-4 text-primary" />
              Approval Routing Workflow
            </Label>
            <p className="text-xs text-muted-foreground">
              Define the multi-step sequence for KPI and Objective approvals in this department.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addWorkflowStep} className="h-8 gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add Step
          </Button>
        </div>
        
        <div className="bg-muted dark:bg-zinc-900/50 border border-border dark:border-zinc-800 rounded-md p-3 space-y-2">
          {formData.workflowSteps.length === 0 && (
            <div className="text-sm text-center py-4 text-muted-foreground">
              No workflow steps defined.
            </div>
          )}
          {formData.workflowSteps.map((step, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-200 dark:bg-zinc-800 text-xs font-medium text-muted-foreground shrink-0">
                {index + 1}
              </div>
              
              <Input 
                value={step.label}
                placeholder="Step Label (e.g. IMS Review)"
                className="h-8 text-sm flex-1"
                onChange={(e) => updateWorkflowStepLabel(index, e.target.value)}
              />

              <div className="w-[300px]">
                <SearchableDropdown
                  value={step.approverId || null}
                  onChange={(val) => updateWorkflowStepApprover(index, val)}
                  options={availableUsers.map(u => ({ id: u.id, label: u.name }))}
                  placeholder="Search Approver..."
                  searchPlaceholder="Search users..."
                  emptyMessage="No user found"
                />
              </div>

              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  disabled={index === 0}
                  onClick={() => moveWorkflowStepUp(index)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  disabled={index === formData.workflowSteps.length - 1}
                  onClick={() => moveWorkflowStepDown(index)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeWorkflowStep(index)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-center py-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              End of Workflow
            </div>
          </div>
        </div>
      </div>


      {/* Footer */}
      <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t dark:border-zinc-800">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => handleSubmit(formData)} className="bg-primary hover:bg-primary/90 text-white">
          {isEditMode ? "Save Changes" : "Create Department"}
        </Button>
      </div>
    </div>
  )
}
