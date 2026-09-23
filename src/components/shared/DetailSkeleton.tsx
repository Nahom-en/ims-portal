import { Skeleton } from "@/components/ui/skeleton"

export function DetailSkeleton() {
  return (
    <div className="flex-1 p-4 md:p-6 w-full max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
        <div className="space-y-3 flex-1 max-w-2xl">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
      <div className="space-y-4 pt-6">
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    </div>
  )
}
