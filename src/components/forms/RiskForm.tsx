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

// ── Types ──

export type RiskStatus = "Open" | "Mitigating" | "Closed"

import { WorkflowStatus } from "@/types/workflow"

export interface RiskFormData {
  id?: string
  period: string
  workflowStatus?: WorkflowStatus
  currentStepIndex?: number
  processName: string
  title: string
  description: string
  likelihood: number            // 1–5
  severity: number              // 1–5
  riskScore: number             // auto: likelihood × severity
  mitigationStrategy: string
  status: RiskStatus
  linkedObjective: string       // Objective name from the same process
  customFields?: { id: string; name: string; value: string }[]
}

export interface AvailableObjective {
  name: string
  processName: string
}

export type RiskFormMode = "create" | "edit-plan" | "review-progress" | "view-all"

interface RiskFormProps {
  initialData?: RiskFormData | null
  mode?: RiskFormMode
  readOnly?: boolean
  processes?: string[]
  availableObjectives?: AvailableObjective[]
  onSubmit: (data: RiskFormData) => void
  onCancel: () => void
}

// ── Score Helpers ──

function getScoreColor(score: number) {
  if (score >= 15) return { bg: "bg-destructive/20 dark:bg-rose-900/40", text: "text-rose-800 dark:text-rose-400", label: "Critical" }
  if (score >= 5)  return { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-400", label: "Medium" }
  return { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-400", label: "Low" }
}

function ScoreBadgePreview({ score }: { score: number }) {
  const color = getScoreColor(score)
  return (
    <Badge className={`${color.bg} ${color.text} hover:${color.bg} font-semibold tabular-nums`}>
      {score} · {color.label}
    </Badge>
  )
}

export default function RiskForm({
  initialData,
  mode = "create",
  readOnly = false,
  processes = [],
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
      processName: processes[0] ?? "",
      title: "",
      description: "",
      likelihood: 1,
      severity: 1,
      riskScore: 1, // 1 * 1
      mitigationStrategy: "",
      status: "Open",
      linkedObjective: "",
      customFields: [],
    }
  })

  const handleStatusChange = (status: RiskStatus) => {
    setFormData({ ...formData, status })
  }

  // Filter available objectives to the selected process
  const filteredObjectives = availableObjectives.filter(
    obj => obj.processName === formData.processName
  )

  // Auto-calculate risk score helper
  const updateScore = (updates: Partial<RiskFormData>) => {
    const nextData = { ...formData, ...updates }
    nextData.riskScore = nextData.likelihood * nextData.severity
    setFormData(nextData)
  }

  const isEditMode = mode !== "create"
  const showPhase1 = mode === "create" || mode === "edit-plan" || mode === "view-all" || readOnly
  const showPhase2 = mode === "review-progress" || mode === "view-all" || readOnly

  return (
    <div className="space-y-8">

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── PHASE 1: RISK IDENTIFICATION ──────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {showPhase1 && (
        <div className="space-y-5 rounded-xl border border-border dark:border-zinc-800 bg-muted/50 dark:bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between border-b border-border dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-destructive/20 text-destructive dark:bg-rose-900/40 dark:text-rose-400">
                <ShieldWarning className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Phase 1: Risk Identification
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define the risk, assess its impact, and link it to objectives.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium bg-white dark:bg-zinc-950">
              Profile
            </Badge>
          </div>

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
            ) : processes.length > 0 ? (
              <Select
                value={formData.processName}
                onValueChange={(val) => setFormData({ ...formData, processName: val ?? "", linkedObjective: "" })}
              >
                <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
                  <div className="flex items-center gap-2">
                    <Stack className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select a process">{formData.processId ? processes.find(p => p.id === formData.processId)?.name || formData.processId : undefined}</SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {processes.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="e.g., Service Delivery"
                value={formData.processName}
                onChange={(e) => setFormData({ ...formData, processName: e.target.value })}
                className="bg-white dark:bg-zinc-950"
              />
            )}
          </div>

          {/* Risk Title */}
          <div className="space-y-2">
            <Label htmlFor="risk-title">
              Risk Title <span className="text-destructive">*</span>
            </Label>
            {isEditMode ? (
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{formData.title}</div>
            ) : (
              <Input
                id="risk-title"
                placeholder="e.g., Core Router Failure"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white dark:bg-zinc-950"
              />
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="risk-desc">Description</Label>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">{formData.description || "—"}</p>
            ) : (
              <textarea
                id="risk-desc"
                className="flex min-h-[60px] w-full rounded-md border bg-white dark:bg-zinc-950 px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none border-input"
                placeholder="Describe the nature of the risk..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            )}
          </div>

          {/* Assessment Matrix */}
          <div className="grid grid-cols-3 gap-4 bg-white dark:bg-zinc-950 p-4 rounded-lg border border-border dark:border-zinc-800 shadow-sm">
            <div className="space-y-2">
              <Label>Likelihood (1-5)</Label>
              {readOnly ? (
                <div className="text-sm font-semibold">{formData.likelihood}</div>
              ) : (
                <Select
                  value={formData.likelihood.toString()}
                  onValueChange={(val) => updateScore({ likelihood: Number(val) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Severity (1-5)</Label>
              {readOnly ? (
                <div className="text-sm font-semibold">{formData.severity}</div>
              ) : (
                <Select
                  value={formData.severity.toString()}
                  onValueChange={(val) => updateScore({ severity: Number(val) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2 flex flex-col justify-between">
              <Label>Calculated Score</Label>
              <div className="h-9 flex items-center">
                <ScoreBadgePreview score={formData.riskScore} />
              </div>
            </div>
          </div>

          {/* Linked Objective */}
          <div className="space-y-2">
            <Label>Linked Objective</Label>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">{formData.linkedObjective || "—"}</p>
            ) : (
              <Select
                key={availableObjectives.length > 0 ? "loaded" : "loading"}
                value={formData.linkedObjective}
                onValueChange={(val) => setFormData({ ...formData, linkedObjective: val === "none" ? "" : (val || "") })}
              >
                <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
                  <SelectValue placeholder="Select the threatened objective">{formData.linkedObjective ? availableObjectives.find(o => o.name === formData.linkedObjective)?.name || formData.linkedObjective : undefined}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-muted-foreground italic">None</SelectItem>
                  {filteredObjectives.map((obj) => (
                    <SelectItem key={obj.name} value={obj.name}>{obj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!readOnly && filteredObjectives.length === 0 && formData.processName && (
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                No objectives found for {formData.processName}.
              </p>
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
                          placeholder="Field Name (e.g. Impact Area)"
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
      {/* ── PHASE 2: MITIGATION & AUDIT ────────── */}
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
                  Phase 2: Mitigation & Audit
                </h3>
                <p className="text-xs text-muted-foreground">
                  Update the mitigation plan and status of the risk.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium bg-muted dark:bg-zinc-900">
              Action
            </Badge>
          </div>

          {/* Mitigation Strategy */}
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

          {/* Status */}
          <div className="space-y-3">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={formData.status === "Open" ? "default" : "outline"}
                className={`px-3 py-1 transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"} ${formData.status === "Open" ? "bg-destructive/20 text-rose-800 hover:bg-rose-200 dark:bg-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-900/70 shadow-none border-transparent" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"}`}
                onClick={() => !readOnly && handleStatusChange("Open")}
              >
                Open
              </Badge>
              <Badge
                variant={formData.status === "Mitigating" ? "default" : "outline"}
                className={`px-3 py-1 transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"} ${formData.status === "Mitigating" ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-900/70 shadow-none border-transparent" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"}`}
                onClick={() => !readOnly && handleStatusChange("Mitigating")}
              >
                Mitigating
              </Badge>
              <Badge
                variant={formData.status === "Closed" ? "default" : "outline"}
                className={`px-3 py-1 transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"} ${formData.status === "Closed" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/70 shadow-none border-transparent" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"}`}
                onClick={() => !readOnly && handleStatusChange("Closed")}
              >
                Closed
              </Badge>
            </div>
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
              {mode === "create" ? "Log Risk" : mode === "edit-plan" ? "Save Risk Profile" : "Log Mitigation Update"}
            </Button>
          </>
        )}
      </div>

    </div>
  )
}
