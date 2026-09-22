"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Target, ChartBar, ShieldWarning } from "@phosphor-icons/react"

interface ReportFormProps {
  period: string
  initialSummary?: string
  readOnly?: boolean
  onSaveDraft: (summary: string) => void
  onPublish: (summary: string) => void
  onCancel: () => void
}

export default function ReportForm({
  period,
  initialSummary = "",
  readOnly = false,
  onSaveDraft,
  onPublish,
  onCancel,
}: ReportFormProps) {
  const [summary, setSummary] = useState(initialSummary)

  return (
    <div className="space-y-8">
      
      {/* ── Auto-Generated Snapshot ── */}
      <div className="space-y-3">
        <Label className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">
          Data Snapshot ({period})
        </Label>
        <div className="grid grid-cols-1 gap-3">
          {/* Objectives Summary */}
          <div className="flex items-center justify-between p-3 rounded-md border bg-muted dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 dark:bg-blue-900/30 text-primary dark:text-blue-400 rounded-md">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Objectives Status</p>
                <p className="text-xs text-muted-foreground">3 On Track, 1 At Risk, 0 Off Track</p>
              </div>
            </div>
          </div>
          
          {/* KPIs Summary */}
          <div className="flex items-center justify-between p-3 rounded-md border bg-muted dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md">
                <ChartBar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">KPI Performance</p>
                <p className="text-xs text-muted-foreground">4 On Target, 1 Deviated</p>
              </div>
            </div>
          </div>
          
          {/* Risks Summary */}
          <div className="flex items-center justify-between p-3 rounded-md border bg-muted dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/20 dark:bg-rose-900/30 text-destructive dark:text-rose-400 rounded-md">
                <ShieldWarning className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Risks</p>
                <p className="text-xs text-muted-foreground">1 Critical, 2 Medium, 2 Low</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic">
          * Snapshot data is automatically pulled from current department records.
        </p>
      </div>

      {/* ── Executive Summary ── */}
      <div className="space-y-3">
        <Label htmlFor="exec-summary" className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">
          Executive Summary <span className="text-destructive">*</span>
        </Label>
        {readOnly ? (
          <div className="p-4 rounded-md border bg-muted dark:bg-zinc-900/50 text-sm whitespace-pre-wrap">
            {summary || "No executive summary provided."}
          </div>
        ) : (
          <textarea
            id="exec-summary"
            className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            placeholder="Provide a narrative summary of department performance this period. Explain any KPI deviations, highlight key objective achievements, and summarize critical risk mitigations..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        )}
      </div>

      {/* ── Sign-off ── */}
      <div className="space-y-3">
        <Label className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">
          Prepared By
        </Label>
        <div className="p-3 rounded-md border bg-muted dark:bg-zinc-900/50 text-sm font-medium">
          Nahom (Frontend Lead)
        </div>
      </div>

      {/* ── Footer Actions ── */}
      <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t dark:border-zinc-800">
        {readOnly ? (
          <Button variant="outline" onClick={onCancel} className="w-full">
            Close Report
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => onSaveDraft(summary)}>
              Save Draft
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onPublish(summary)}
              disabled={!summary.trim()}
            >
              Publish Report
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
