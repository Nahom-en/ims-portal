import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ScrollableTableWrapperProps {
  children: ReactNode
  className?: string
  heightClass?: string
}

export function ScrollableTableWrapper({ children, className, heightClass = "max-h-[calc(100vh-300px)]" }: ScrollableTableWrapperProps) {
  return (
    <div className={cn("bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-lg overflow-y-auto relative shadow-sm", heightClass, className)}>
      {children}
    </div>
  )
}
