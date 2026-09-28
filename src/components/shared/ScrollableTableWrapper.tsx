import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ScrollableTableWrapperProps {
  children: ReactNode
  className?: string
  heightClass?: string
}

export function ScrollableTableWrapper({ 
  children, 
  className, 
  heightClass = "flex-1 min-h-0" 
}: ScrollableTableWrapperProps) {
  return (
    <div className={cn("bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-lg overflow-auto w-full relative shadow-xs", heightClass, className)}>
      {children}
    </div>
  )
}
