/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle } from "@phosphor-icons/react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export interface KpiMeasurementFormData {
  actual_value: string
  status: "Achieved" | "Off Track" | "No Data" | ""
  justification_for_deviation?: string
  period_start?: string
  period_end?: string
}

interface KpiMeasurementFormProps {
  kpiId: string
  kpiName: string
  targetValue: string
  onSubmitSuccess?: () => void
  onCancel?: () => void
}

export function KpiMeasurementForm({ kpiId, kpiName, targetValue, onSubmitSuccess, onCancel }: KpiMeasurementFormProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<KpiMeasurementFormData>({
    actual_value: "",
    status: "",
    justification_for_deviation: "",
    period_end: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async () => {
    if (!formData.actual_value || !formData.status) {
      toast.error("Please provide actual value and status.")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('kpi_measurements').insert({
        kpi_id: kpiId,
        actual_value: formData.actual_value,
        status: formData.status,
        justification_for_deviation: formData.justification_for_deviation,
        period_end: formData.period_end || null
      })

      if (error) throw error

      toast.success("KPI Measurement logged successfully!")
      if (onSubmitSuccess) onSubmitSuccess()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to log measurement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg border border-border">
        <h3 className="font-medium text-sm text-muted-foreground mb-1">Target for {kpiName}</h3>
        <p className="text-lg font-semibold">{targetValue}</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Actual Value <span className="text-destructive">*</span></Label>
            <Input 
              placeholder="e.g. 98.5%, 1500" 
              value={formData.actual_value}
              onChange={(e) => setFormData(prev => ({ ...prev, actual_value: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Status <span className="text-destructive">*</span></Label>
            <Select value={formData.status} onValueChange={(val: string) => setFormData(prev => ({ ...prev, status: val }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Achieved">Achieved</SelectItem>
                <SelectItem value="Off Track">Off Track</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Measurement Date</Label>
          <Input 
            type="date" 
            value={formData.period_end}
            onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes / Justification</Label>
          <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y" 
            placeholder="Optional context for this measurement..." 
            value={formData.justification_for_deviation}
            onChange={(e) => setFormData(prev => ({ ...prev, justification_for_deviation: e.target.value }))}
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        )}
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Log Measurement"}
        </Button>
      </div>
    </div>
  )
}
