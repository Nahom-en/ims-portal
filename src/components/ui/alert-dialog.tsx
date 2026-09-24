"use client"
import * as React from "react"
import { Button } from "./button"

interface AlertDialogProps {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  variant?: "destructive" | "default"
  children?: React.ReactNode
}

export function AlertDialog({ open, title, description, onConfirm, onCancel, confirmLabel = "Delete", cancelLabel = "Cancel", variant = "destructive", children }: AlertDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-background p-6 shadow-xl border">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {children && <div className="mb-6">{children}</div>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant === "destructive" ? "destructive" : "default"} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
