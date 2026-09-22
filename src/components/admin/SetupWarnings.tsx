"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Warning, CheckCircle, X } from "@phosphor-icons/react"

type WarningItem = {
  id: string
  message: string
  action?: { label: string; href: string }
}

export function SetupWarnings({ warnings }: { warnings: WarningItem[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = warnings.filter((w) => !dismissed.has(w.id))

  const dismissOne = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id))
  }

  const dismissAll = () => {
    setDismissed(new Set(warnings.map((w) => w.id)))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-lg">Setup Warnings</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Configuration issues detected from live data. Warnings auto-resolve when the underlying issue is fixed.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>Configuration issues that need attention</CardDescription>
          </div>
          {visible.length > 1 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={dismissAll}>
              Dismiss All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
            <CheckCircle weight="fill" className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
              All systems healthy — no issues detected.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((w) => (
              <div
                key={w.id}
                className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/20 group"
              >
                <Warning weight="fill" className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-800 dark:text-amber-400">{w.message}</p>
                  {w.action && (
                    <a
                      href={w.action.href}
                      className="text-xs font-medium text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 mt-1 inline-block"
                    >
                      {w.action.label} →
                    </a>
                  )}
                </div>
                <button
                  onClick={() => dismissOne(w.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30"
                >
                  <X className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
