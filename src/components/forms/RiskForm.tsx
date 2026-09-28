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
import { Stack, Plus, Trash, ShieldWarning, Pulse } from "@phosphor-icons/react"
import { toast } from "sonner"

// ── Types ──

export type RiskStatus = "Open" | "Mitigating" | "Closed"

import { WorkflowStatus } from "@/types/workflow"

export interface RiskFormData {
  id?: string
  period?: string
  workflowStatus?: WorkflowStatus
  currentStepIndex?: number
  processId?: string
  processName: string
  title: string
  description: string
  ownerId?: string
  ownerName?: string
  likelihood: number            // 1–5
  severity: number              // 1–5
  riskScore: number             // auto: likelihood × severity
  riskRating?: string           // Low, Medium, High, Critical
  mitigationStrategy?: string
  riskResponse?: string         // Mitigate, Avoid, Transfer, Accept
  status?: RiskStatus
  linkedObjective?: string      // Objective name from the same process
  customFields?: { id: string; name: string; value: string }[]
}

export interface AvailableObjective {
  id?: string
  name: string
  processName?: string
}

export interface AvailableEmployee {
  id: string
  name: string
  role?: string
}

export interface ProcessItem {
  id: string
  name: string
}

export type RiskFormMode = "create" | "edit-plan" | "review-progress" | "view-all"

interface RiskFormProps {
  initialData?: RiskFormData | null
  mode?: RiskFormMode
  readOnly?: boolean
  processes?: (string | ProcessItem)[]
  employees?: AvailableEmployee[]
  availableObjectives?: AvailableObjective[]
  onSubmit: (data: RiskFormData) => void
  onCancel: () => void
}

// ── Score Helpers ──

export function getScoreColor(score: number) {
  if (score >= 15) return { bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800", label: "Critical" }
  if (score >= 10) return { bg: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800", label: "High" }
  if (score >= 5)  return { bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", label: "Medium" }
  return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", label: "Low" }
}

export function ScoreBadgePreview({ score }: { score: number }) {
  const color = getScoreColor(score)
  return (
    <Badge className={`${color.bg} border font-semibold tabular-nums text-xs`}>
      {score} · {color.label}
    </Badge>
  )
}

const LIKELIHOOD_OPTIONS = [
  { value: 1, label: "1 — Rare" },
  { value: 2, label: "2 — Unlikely" },
  { value: 3, label: "3 — Possible" },
  { value: 4, label: "4 — Likely" },
  { value: 5, label: "5 — Almost Certain" },
]

const SEVERITY_OPTIONS = [
  { value: 1, label: "1 — Insignificant" },
  { value: 2, label: "2 — Minor" },
  { value: 3, label: "3 — Moderate" },
  { value: 4, label: "4 — Major" },
  { value: 5, label: "5 — Severe" },
]

const RESPONSE_OPTIONS = [
  { value: "Mitigate", label: "Mitigate" },
  { value: "Avoid", label: "Avoid" },
  { value: "Transfer", label: "Transfer" },
  { value: "Accept", label: "Accept" },
]

export default function RiskForm({
  initialData,
  mode = "create",
  readOnly = false,
  processes = [],
  employees = [],
  availableObjectives = [],
  onSubmit,
  onCancel,
}: RiskFormProps) {
  const [formData, setFormData] = useState<RiskFormData>(() => {
    if (initialData) return initialData
    return {
      period: "Q1 2026",
      workflowStatus: "Draft",
      currentStepIndex: 0,
      processId: "",
      processName: "",
      title: "",
      description: "",
      ownerId: "",
      ownerName: "",
      likelihood: 1,
      severity: 1,
      riskScore: 1, // 1 * 1
      riskRating: "Low",
      mitigationStrategy: "",
      riskResponse: "Mitigate",
      status: "Open",
      linkedObjective: "",
      customFields: [],
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Normalize processes to array of { id, name }
  const normalizedProcesses: ProcessItem[] = processes.map((p) => {
    if (typeof p === "string") return { id: p, name: p }
    return p
  })

  const handleStatusChange = (status: RiskStatus) => {
    setFormData({ ...formData, status })
  }

  // Filter available objectives to the selected process if selected
  const filteredObjectives = formData.processName
    ? availableObjectives.filter(obj => !obj.processName || obj.processName === formData.processName || obj.processName === "General")
    : availableObjectives

  // Auto-calculate risk score helper
  const updateScore = (updates: Partial<RiskFormData>) => {
    const nextData = { ...formData, ...updates }
    nextData.riskScore = nextData.likelihood * nextData.severity
    nextData.riskRating = getScoreColor(nextData.riskScore).label
    setFormData(nextData)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) {
      newErrors.title = "Risk title is required"
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }
    if (mode === "create" && !formData.ownerId) {
      newErrors.ownerId = "Risk owner is required"
    }
    if (!formData.likelihood || formData.likelihood < 1 || formData.likelihood > 5) {
      newErrors.likelihood = "Likelihood is required (1-5)"
    }
    if (!formData.severity || formData.severity < 1 || formData.severity > 5) {
      newErrors.severity = "Severity is required (1-5)"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error("Please fill in all required fields.")
      return
    }

    const score = formData.likelihood * formData.severity
    const rating = getScoreColor(score).label
    onSubmit({
      ...formData,
      riskScore: score,
      riskRating: rating
    })
  }

  const isEditMode = mode !== "create"
  const showPhase1 = mode === "create" || mode === "edit-plan" || mode === "view-all" || readOnly
  const showPhase2 = (mode === "review-progress" || mode === "view-all" || readOnly) && mode !== "create"

  return (
    <div className="space-y-6">

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── PHASE 1: RISK IDENTIFICATION & ASSESSMENT ─────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {showPhase1 && (
        <div className="space-y-5 rounded-xl border border-border dark:border-zinc-800 bg-card p-5">
          <div className="flex items-center justify-between border-b border-border dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive dark:bg-rose-950/40 dark:text-rose-400">
                <ShieldWarning className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Phase 1: Risk Identification & Assessment
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define the risk, assess its impact, and assign accountability.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium bg-muted/40">
              Profile
            </Badge>
          </div>

          {/* 1. Process */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Process <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            {isEditMode ? (
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Stack className="h-4 w-4 text-muted-foreground" />
                {formData.processName || "None"}
              </div>
            ) : normalizedProcesses.length > 0 ? (
              <Select
                value={formData.processId || "none"}
                onValueChange={(val) => {
                  if (val === "none") {
                    setFormData({ ...formData, processId: "", processName: "" })
                  } else {
                    const proc = normalizedProcesses.find(p => p.id === val)
                    setFormData({ ...formData, processId: val, processName: proc?.name || "" })
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Stack className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select process">
                      {formData.processName || "None"}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {normalizedProcesses.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="e.g., Service Delivery (optional)"
                value={formData.processName}
                onChange={(e) => setFormData({ ...formData, processName: e.target.value })}
              />
            )}
          </div>

          {/* 2. Risk Title */}
          <div className="space-y-1.5">
            <Label htmlFor="risk-title" className="text-sm font-medium">
              Risk Title <span className="text-destructive">*</span>
            </Label>
            {isEditMode ? (
              <div className="font-semibold text-foreground text-sm">{formData.title}</div>
            ) : (
              <div>
                <Input
                  id="risk-title"
                  placeholder="e.g., Core Router Failure"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value })
                    if (errors.title) setErrors(prev => ({ ...prev, title: "" }))
                  }}
                  className={errors.title ? "border-destructive focus-visible:ring-destructive/20" : ""}
                />
                {errors.title && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.title}</p>
                )}
              </div>
            )}
          </div>

          {/* 3. Description */}
          <div className="space-y-1.5">
            <Label htmlFor="risk-desc" className="text-sm font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">{formData.description || "—"}</p>
            ) : (
              <div>
                <textarea
                  id="risk-desc"
                  className={`flex min-h-[75px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none ${
                    errors.description ? "border-destructive focus-visible:ring-destructive/20" : "border-input"
                  }`}
                  placeholder="Describe the risk event, cause, and potential consequence..."
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value })
                    if (errors.description) setErrors(prev => ({ ...prev, description: "" }))
                  }}
                />
                {errors.description && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.description}</p>
                )}
              </div>
            )}
          </div>

          {/* 4. Risk Owner */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Risk Owner <span className="text-destructive">*</span>
            </Label>
            {readOnly ? (
              <p className="text-sm text-foreground">{formData.ownerName || "Unassigned"}</p>
            ) : employees.length > 0 ? (
              <div>
                <Select
                  value={formData.ownerId || ""}
                  onValueChange={(val) => {
                    const emp = employees.find(e => e.id === val)
                    setFormData({ ...formData, ownerId: val, ownerName: emp?.name || "" })
                    if (errors.ownerId) setErrors(prev => ({ ...prev, ownerId: "" }))
                  }}
                >
                  <SelectTrigger className={`w-full ${errors.ownerId ? "border-destructive focus:ring-destructive/20" : ""}`}>
                    <SelectValue placeholder="Select risk owner">
                      {formData.ownerName || "Select risk owner"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} {e.role ? `(${e.role})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ownerId && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.ownerId}</p>
                )}
              </div>
            ) : (
              <Input
                placeholder="e.g., IT Security Head"
                value={formData.ownerName || ""}
                onChange={(e) => {
                  setFormData({ ...formData, ownerName: e.target.value, ownerId: e.target.value })
                  if (errors.ownerId) setErrors(prev => ({ ...prev, ownerId: "" }))
                }}
              />
            )}
          </div>

          <div className="border-t border-border pt-4"></div>

          {/* 5. Assessment Matrix: Likelihood, Severity, Calculated Score */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg border border-border">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Likelihood <span className="text-destructive">*</span></Label>
              {readOnly ? (
                <div className="text-sm font-semibold">
                  {LIKELIHOOD_OPTIONS.find(o => o.value === formData.likelihood)?.label || formData.likelihood}
                </div>
              ) : (
                <Select
                  value={formData.likelihood.toString()}
                  onValueChange={(val) => updateScore({ likelihood: Number(val) })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIKELIHOOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Severity <span className="text-destructive">*</span></Label>
              {readOnly ? (
                <div className="text-sm font-semibold">
                  {SEVERITY_OPTIONS.find(o => o.value === formData.severity)?.label || formData.severity}
                </div>
              ) : (
                <Select
                  value={formData.severity.toString()}
                  onValueChange={(val) => updateScore({ severity: Number(val) })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2 flex flex-col justify-between">
              <Label className="text-xs font-semibold">Calculated Score</Label>
              <div className="h-9 flex items-center">
                <ScoreBadgePreview score={formData.riskScore} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4"></div>

          {/* 6. Linked Objective */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Linked Objective <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">{formData.linkedObjective || "—"}</p>
            ) : (
              <Select
                value={formData.linkedObjective || "none"}
                onValueChange={(val) => setFormData({ ...formData, linkedObjective: val === "none" ? "" : val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select the affected objective">
                    {formData.linkedObjective || "None"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-muted-foreground italic">None</SelectItem>
                  {filteredObjectives.map((obj) => (
                    <SelectItem key={obj.id || obj.name} value={obj.name}>{obj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 7. Risk Response / Treatment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Risk Response / Treatment <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            {readOnly ? (
              <p className="text-sm text-foreground">{formData.riskResponse || "—"}</p>
            ) : (
              <Select
                value={formData.riskResponse || "Mitigate"}
                onValueChange={(val) => setFormData({ ...formData, riskResponse: val, mitigationStrategy: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select response" />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Detail mode only: custom requirements */}
          {mode !== "create" && (
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <Label>Department Requirements</Label>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
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

              {(formData.customFields?.length || 0) > 0 && (
                <div className="space-y-3 mt-3">
                  {formData.customFields?.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <Input
                          placeholder="Field Name"
                          value={field.name}
                          readOnly={readOnly}
                          onChange={(e) => {
                            const newFields = [...(formData.customFields || [])]
                            newFields[index].name = e.target.value
                            setFormData({ ...formData, customFields: newFields })
                          }}
                        />
                        <Input
                          placeholder="Value"
                          value={field.value}
                          readOnly={readOnly}
                          onChange={(e) => {
                            const newFields = [...(formData.customFields || [])]
                            newFields[index].value = e.target.value
                            setFormData({ ...formData, customFields: newFields })
                          }}
                        />
                      </div>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
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
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── PHASE 2: MITIGATION & AUDIT (Only for Detail/Edit) ──── */}
      {/* ────────────────────────────────────────────────────────── */}
      {showPhase2 && (
        <div className="space-y-5 rounded-xl border border-border dark:border-zinc-800 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Pulse className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Phase 2: Mitigation & Audit
                </h3>
                <p className="text-xs text-muted-foreground">
                  Update the mitigation plan and status of the risk.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium bg-muted">
              Action
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk-mitigation">Mitigation Strategy</Label>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">{formData.mitigationStrategy || "—"}</p>
            ) : (
              <textarea
                id="risk-mitigation"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="How will this risk be controlled?"
                value={formData.mitigationStrategy}
                onChange={(e) => setFormData({ ...formData, mitigationStrategy: e.target.value })}
              />
            )}
          </div>

          <div className="space-y-3">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={formData.status === "Open" ? "default" : "outline"}
                className={`px-3 py-1 transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"} ${formData.status === "Open" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800" : "text-muted-foreground"}`}
                onClick={() => !readOnly && handleStatusChange("Open")}
              >
                Open
              </Badge>
              <Badge
                variant={formData.status === "Mitigating" ? "default" : "outline"}
                className={`px-3 py-1 transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"} ${formData.status === "Mitigating" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" : "text-muted-foreground"}`}
                onClick={() => !readOnly && handleStatusChange("Mitigating")}
              >
                Mitigating
              </Badge>
              <Badge
                variant={formData.status === "Closed" ? "default" : "outline"}
                className={`px-3 py-1 transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"} ${formData.status === "Closed" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" : "text-muted-foreground"}`}
                onClick={() => !readOnly && handleStatusChange("Closed")}
              >
                Closed
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        {readOnly ? (
          <Button variant="outline" onClick={onCancel} className="w-full">Close Record</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => handleSubmit()} className="bg-primary hover:bg-primary/90 text-white">
              {mode === "create" ? "Log Risk" : mode === "edit-plan" ? "Save Risk Profile" : "Log Mitigation Update"}
            </Button>
          </>
        )}
      </div>

    </div>
  )
}
