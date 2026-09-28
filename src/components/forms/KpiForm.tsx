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
import { Stack, Plus, Trash, Target, Pulse, Warning } from "@phosphor-icons/react"

export type KpiStatus = "Achieved" | "Deviated" | "Pending"

import { WorkflowStatus } from "@/types/workflow"

export interface KpiFormData {
  id?: string;
  departmentId?: string;
  period: string;
  workflowStatus?: WorkflowStatus;
  currentStepIndex?: number;
  processName: string;
  name: string;
  target: string;
  dataSource?: string;
  analysisFrequency?: string;
  analysisMethodology?: string;
  responsibility?: string;
  actual?: string;
  achievementPercentage?: string;
  evidence?: string;
  status: KpiStatus;
  justification?: string;
  customFields?: { id: string; name: string; value: string }[]
}

export type KpiFormMode = "create" | "edit-plan" | "review-progress" | "view-all"

interface KpiFormProps {
  initialData?: KpiFormData | null;
  mode?: KpiFormMode;
  readOnly?: boolean;
  processes?: string[]; // Injected by the parent page — department-specific
  departments?: {id: string; name: string}[];
  userDepartmentId?: string;
  canOverrideDepartment?: boolean;
  onSubmit: (data: KpiFormData) => void;
  onCancel: () => void;
}

export default function KpiForm({ 
  initialData, 
  mode = "create", 
  readOnly = false, 
  processes = [], 
  departments = [],
  userDepartmentId,
  canOverrideDepartment = false,
  onSubmit, 
  onCancel 
}: KpiFormProps) {
  const [formData, setFormData] = useState<KpiFormData>(() => {
    if (initialData) return initialData;
    return {
      departmentId: userDepartmentId || "",
      period: "Q1 2026",
      workflowStatus: "Draft",
      currentStepIndex: 0,
      processName: processes[0] ?? "",
      name: "",
      target: "",
      dataSource: "",
      analysisFrequency: "MONTHLY",
      analysisMethodology: "",
      responsibility: "",
      actual: "",
      achievementPercentage: "",
      evidence: "",
      status: "Pending",
      justification: "",
      customFields: [],
    };
  })

  const handleStatusChange = (status: KpiStatus) => {
    setFormData({ ...formData, status })
  }

  const isEditMode = mode !== "create"
  const showPhase1 = mode === "create" || mode === "edit-plan" || mode === "view-all" || readOnly
  const showPhase2 = mode === "review-progress" || mode === "view-all" || readOnly
  const isDeviationRequired = formData.status === "Deviated"

  return (
    <div className="space-y-8">

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── PHASE 1: KPI DEFINITION ────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {showPhase1 && (
        <div className="space-y-5 rounded-xl border border-border dark:border-zinc-800 bg-muted/50 dark:bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between border-b border-border dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20 text-primary dark:bg-blue-900/40 dark:text-blue-400">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Phase 1: KPI Definition
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define the core metric and the target success criteria.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium bg-white dark:bg-zinc-950">
              Definition
            </Badge>
          </div>

          {/* Department Override (Phase 5) */}
          {(canOverrideDepartment || isEditMode) && departments.length > 0 && (
            <div className="space-y-2 mb-4">
              <Label>
                Department <span className="text-destructive">*</span>
              </Label>
              {isEditMode ? (
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {departments.find(d => d.id === formData.departmentId)?.name || "—"}
                </div>
              ) : (
                <Select
                  key={departments.length > 0 ? "loaded" : "loading"}
                  value={formData.departmentId}
                  onValueChange={(val) => setFormData({ ...formData, departmentId: val, processName: "" })}
                  disabled={readOnly || !canOverrideDepartment}
                >
                  <SelectTrigger className="bg-white dark:bg-zinc-950 w-full">
                    <SelectValue placeholder="Select department">
                      {formData.departmentId
                        ? departments.find(d => d.id === formData.departmentId)?.name || formData.departmentId
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Process */}
          <div className="space-y-2">
            <Label>
              Process <span className="text-destructive">*</span>
            </Label>
            {isEditMode ? (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Stack className="h-4 w-4 text-muted-foreground" />
                {formData.processName || "—"}
              </div>
            ) : (
              <div className="relative">
                <Stack className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  list="kpi-process-list"
                  placeholder="Type to search or create a new process..."
                  value={formData.processName}
                  onChange={(e) => setFormData({ ...formData, processName: e.target.value })}
                  className="pl-9 bg-white dark:bg-zinc-950"
                  disabled={readOnly}
                />
                <datalist id="kpi-process-list">
                  {processes.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            )}
          </div>

          {/* KPI Description */}
          <div className="space-y-2">
            <Label htmlFor="kpi-name">
              KPI Description <span className="text-destructive">*</span>
            </Label>
            {isEditMode ? (
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{formData.name}</div>
            ) : (
              <Input
                id="kpi-name"
                placeholder="e.g., Customer Churn Rate"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white dark:bg-zinc-950"
              />
            )}
          </div>

          {/* Target Value */}
          <div className="space-y-2">
            <Label htmlFor="kpi-target">
              Target Value <span className="text-destructive">*</span>
            </Label>
            {readOnly ? (
              <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{formData.target}</div>
            ) : (
              <Input
                id="kpi-target"
                placeholder="e.g., < 5%"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                className="bg-white dark:bg-zinc-950"
              />
            )}
          </div>

          {/* Data Source */}
          <div className="space-y-2">
            <Label htmlFor="kpi-source">Required Data / Source</Label>
            {readOnly ? (
              <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{formData.dataSource || "—"}</div>
            ) : (
              <Input
                id="kpi-source"
                placeholder="e.g., Story points from Scrum Board"
                value={formData.dataSource}
                onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                className="bg-white dark:bg-zinc-950"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Analysis Frequency */}
            <div className="space-y-2">
              <Label htmlFor="kpi-frequency">Analysis Frequency</Label>
              {readOnly ? (
                <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                  {formData.analysisFrequency === "MONTHLY" ? "Monthly" :
                   formData.analysisFrequency === "QUARTERLY" ? "Quarterly" :
                   formData.analysisFrequency === "BI_YEARLY" ? "Bi-Yearly" :
                   formData.analysisFrequency === "YEARLY" ? "Yearly" : formData.analysisFrequency || "—"}
                </div>
              ) : (
                <Select
                  value={formData.analysisFrequency || "MONTHLY"}
                  onValueChange={(val) => setFormData({ ...formData, analysisFrequency: val ?? "MONTHLY" })}
                >
                  <SelectTrigger id="kpi-frequency" className="w-full bg-white dark:bg-zinc-950">
                    <SelectValue placeholder="Select frequency">
                      {formData.analysisFrequency === "MONTHLY" ? "Monthly" :
                       formData.analysisFrequency === "QUARTERLY" ? "Quarterly" :
                       formData.analysisFrequency === "BI_YEARLY" ? "Bi-Yearly" :
                       formData.analysisFrequency === "YEARLY" ? "Yearly" : "Select frequency"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="BI_YEARLY">Bi-Yearly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Responsibility */}
            <div className="space-y-2">
              <Label htmlFor="kpi-responsibility">Responsibility</Label>
              {readOnly ? (
                <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{formData.responsibility || "—"}</div>
              ) : (
                <Input
                  id="kpi-responsibility"
                  placeholder="e.g., Scrum Master"
                  value={formData.responsibility}
                  onChange={(e) => setFormData({ ...formData, responsibility: e.target.value })}
                  className="bg-white dark:bg-zinc-950"
                />
              )}
            </div>
          </div>

          {/* Analysis Methodology */}
          <div className="space-y-2">
            <Label htmlFor="kpi-methodology">Analysis Methodology</Label>
            {readOnly ? (
              <p className="text-sm text-slate-900 dark:text-slate-100">{formData.analysisMethodology || "—"}</p>
            ) : (
              <textarea
                id="kpi-methodology"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-white dark:bg-zinc-950 px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="e.g., Sum(Tasks Completed) / Number of Tasks"
                value={formData.analysisMethodology}
                onChange={(e) => setFormData({ ...formData, analysisMethodology: e.target.value })}
              />
            )}
          </div>

          {/* ── Dynamic Department Requirements ── */}
          <div className="space-y-3 pt-4 border-t border-border/80 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <Label>Department Requirements</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                </p>
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 bg-white dark:bg-zinc-950"
                  onClick={() => {
                    const newField = { id: Math.random().toString(36).substring(7), name: "", value: "" }
                    setFormData({ ...formData, customFields: [...(formData.customFields || []), newField] })
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </Button>
              )}
            </div>

            {(formData.customFields?.length || 0) > 0 ? (
              <div className="space-y-3 mt-3">
                {formData.customFields?.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div>
                        <Input
                          placeholder="Field Name (e.g. Data Source)"
                          value={field.name}
                          readOnly={readOnly}
                          onChange={(e) => {
                            const newFields = [...(formData.customFields || [])]
                            newFields[index].name = e.target.value
                            setFormData({ ...formData, customFields: newFields })
                          }}
                          className={readOnly ? "bg-slate-100 dark:bg-zinc-900 border-dashed" : "bg-white dark:bg-zinc-950"}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Value"
                          value={field.value}
                          readOnly={readOnly}
                          onChange={(e) => {
                            const newFields = [...(formData.customFields || [])]
                            newFields[index].value = e.target.value
                            setFormData({ ...formData, customFields: newFields })
                          }}
                          className={readOnly ? "bg-slate-100 dark:bg-zinc-900 border-dashed" : "bg-white dark:bg-zinc-950"}
                        />
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-rose-950 shrink-0"
                        onClick={() => {
                          const newFields = formData.customFields?.filter((_, i) => i !== index)
                          setFormData({ ...formData, customFields: newFields })
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              readOnly && (
                <p className="text-sm text-muted-foreground italic">No custom requirements added.</p>
              )
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── PHASE 2: PERFORMANCE MEASUREMENT ────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {showPhase2 && (
        <div className="space-y-5 rounded-xl border border-border dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                <Pulse className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Phase 2: Performance Measurement
                </h3>
                <p className="text-xs text-muted-foreground">
                  Log the actual results and any required deviation justifications.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium bg-muted dark:bg-zinc-900">
              Measurement
            </Badge>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <Label>Current Status</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={formData.status === "Achieved" ? "default" : "outline"}
                className={`px-3 py-1 transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"} ${formData.status === "Achieved" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/70 shadow-none border-transparent" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"}`}
                onClick={() => !readOnly && handleStatusChange("Achieved")}
              >
                Achieved
              </Badge>
              <Badge
                variant={formData.status === "Deviated" ? "default" : "outline"}
                className={`px-3 py-1 transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"} ${formData.status === "Deviated" ? "bg-destructive/20 text-rose-800 hover:bg-rose-200 dark:bg-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-900/70 shadow-none border-transparent" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"}`}
                onClick={() => !readOnly && handleStatusChange("Deviated")}
              >
                Deviated
              </Badge>
              <Badge
                variant={formData.status === "Pending" ? "default" : "outline"}
                className={`px-3 py-1 transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"} ${formData.status === "Pending" ? "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 shadow-none border-transparent" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"}`}
                onClick={() => !readOnly && handleStatusChange("Pending")}
              >
                Pending
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Actual Value */}
            <div className="space-y-2">
              <Label htmlFor="kpi-actual">Actual Recorded Value</Label>
              {readOnly ? (
                <p className="text-sm font-medium">{formData.actual || "—"}</p>
              ) : (
                <Input
                  id="kpi-actual"
                  value={formData.actual || ""}
                  placeholder="e.g., 4.2%"
                  onChange={(e) => setFormData({ ...formData, actual: e.target.value })}
                />
              )}
            </div>

            {/* Achievement Percentage */}
            <div className="space-y-2">
              <Label htmlFor="kpi-achievement">Achievement %</Label>
              {readOnly ? (
                <p className="text-sm font-medium">{formData.achievementPercentage || "—"}</p>
              ) : (
                <Input
                  id="kpi-achievement"
                  value={formData.achievementPercentage || ""}
                  placeholder="e.g., 100%"
                  onChange={(e) => setFormData({ ...formData, achievementPercentage: e.target.value })}
                />
              )}
            </div>
          </div>

          {/* Justification for Deviation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isDeviationRequired && <Warning className="h-4 w-4 text-amber-500" />}
                <Label htmlFor="kpi-justification">
                  Justification for Deviation
                  {isDeviationRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
              </div>
              {isDeviationRequired && (
                <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-300">
                  Required
                </Badge>
              )}
            </div>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">{formData.justification || "—"}</p>
            ) : (
              <textarea
                id="kpi-justification"
                className={`flex min-h-[70px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none ${isDeviationRequired ? "border-amber-400 dark:border-amber-600/60 bg-amber-50/30 dark:bg-amber-950/10" : "border-input"}`}
                placeholder={isDeviationRequired ? "Explain why the target was missed..." : "Optional context..."}
                value={formData.justification || ""}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              />
            )}
          </div>

          {/* Evidence */}
          <div className="space-y-2">
            <Label htmlFor="kpi-evidence">Evidence / Proof</Label>
            {readOnly ? (
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{formData.evidence || "—"}</p>
            ) : (
              <Input
                id="kpi-evidence"
                value={formData.evidence || ""}
                placeholder="e.g., GitHub PRs, Jira Dashboard Link"
                onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
              />
            )}
          </div>

        </div>
      )}

      {/* Footer */}
      <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t dark:border-zinc-800">
        {readOnly ? (
          <Button variant="outline" onClick={onCancel} className="w-full">Close Record</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSubmit(formData)} className="bg-primary hover:bg-primary/90 text-white">
              {mode === "create" ? "Create KPI" : mode === "edit-plan" ? "Save KPI Definition" : "Log Measurement"}
            </Button>
          </>
        )}
      </div>

    </div>
  )
}
