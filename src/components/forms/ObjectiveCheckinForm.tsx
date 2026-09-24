/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useEmployee } from "@/lib/employee-context"

export interface ObjectiveCheckinFormData {
  status_vs_target: "On Track" | "At Risk" | "Off Track" | "Completed" | ""
  evidence_of_achievement: string
  reasons_for_deviation?: string
  followup_action?: string
}

interface ObjectiveCheckinFormProps {
  objectiveId: string
  objectiveName: string
  onSubmitSuccess?: () => void
  onCancel?: () => void
}

export function ObjectiveCheckinForm({ objectiveId, objectiveName, onSubmitSuccess, onCancel }: ObjectiveCheckinFormProps) {
  const supabase = createClient()
  const employee = useEmployee()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ObjectiveCheckinFormData>({
    status_vs_target: "",
    evidence_of_achievement: "",
    reasons_for_deviation: "",
    followup_action: ""
  })

  const handleSubmit = async () => {
    if (!formData.status_vs_target) {
      toast.error("Please select a status.")
      return
    }
    if (!formData.evidence_of_achievement) {
      toast.error("Please provide a narrative update/evidence.")
      return
    }
    if ((formData.status_vs_target === "At Risk" || formData.status_vs_target === "Off Track") && !formData.reasons_for_deviation) {
      toast.error("Reason for deviation is required for At Risk / Off Track statuses.")
      return
    }

    if (!employee) {
      toast.error("User context missing.")
      return
    }

    setLoading(true)
    try {
      // Create approval request instead of directly inserting
      const { error } = await supabase.from('approval_requests').insert({
        entity_type: 'objective',
        entity_id: objectiveId,
        department_id: employee.department_id,
        requested_by: employee.id,
        status: 'PENDING_APPROVAL',
        custom_metadata: {
          change_type: 'CHECKIN',
          title: `Progress Check-in: ${objectiveName}`,
          proposed_changes: formData
        }
      })

      if (error) throw error

      toast.success("Check-in submitted for approval!")
      if (onSubmitSuccess) onSubmitSuccess()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to submit check-in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Current Status <span className="text-destructive">*</span></Label>
        <Select value={formData.status_vs_target} onValueChange={(val: string) => setFormData(prev => ({ ...prev, status_vs_target: val }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="On Track">On Track</SelectItem>
            <SelectItem value="At Risk">At Risk</SelectItem>
            <SelectItem value="Off Track">Off Track</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Progress Narrative / Evidence <span className="text-destructive">*</span></Label>
        <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y" 
          placeholder="Describe the progress made during this period..." 
          value={formData.evidence_of_achievement}
          onChange={(e) => setFormData(prev => ({ ...prev, evidence_of_achievement: e.target.value }))}
          rows={3}
        />
      </div>

      {(formData.status_vs_target === "At Risk" || formData.status_vs_target === "Off Track") && (
        <div className="space-y-4 bg-red-50/50 p-4 rounded-lg border border-red-100">
          <div className="space-y-2">
            <Label className="text-red-800">Reason for Deviation <span className="text-destructive">*</span></Label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y" 
              placeholder="Why is this objective missing its targets?" 
              value={formData.reasons_for_deviation}
              onChange={(e) => setFormData(prev => ({ ...prev, reasons_for_deviation: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-red-800">Follow-up Action</Label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y" 
              placeholder="What steps are being taken to recover?" 
              value={formData.followup_action}
              onChange={(e) => setFormData(prev => ({ ...prev, followup_action: e.target.value }))}
              rows={2}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        )}
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Submitting..." : "Submit for Approval"}
        </Button>
      </div>
    </div>
  )
}
