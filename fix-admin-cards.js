const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

if (!code.includes('import { Badge }')) {
  code = code.replace(/import \{ Button \} from "@\/components\/ui\/button"/, 'import { Button } from "@/components/ui/button"\nimport { Badge } from "@/components/ui/badge"');
}
if (!code.includes('import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }')) {
  code = code.replace(/import \{ Button \} from "@\/components\/ui\/button"/, 'import { Button } from "@/components/ui/button"\nimport { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"');
}

// Ensure Info is imported
if (!code.includes('Info')) {
  code = code.replace(/ArrowRight,/, 'ArrowRight,\n  Info,');
}

const patternUsers = `
        {/* Users & Roles */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users & Roles</CardTitle>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground" /></span>}></TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">Total active users in the system, broken down by their assigned access level.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold tracking-tight">{activeUsers.length}</span>
              {newUsersCount > 0 && (
                <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  <ArrowUp className="h-3 w-3" weight="bold" />
                  {newUsersCount} new
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {roleCounts.SYSTEM_ADMIN} Admin · {roleCounts.WRITER} Writer{roleCounts.WRITER !== 1 ? "s" : ""} · {roleCounts.VIEWER} Viewer{roleCounts.VIEWER !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
`.trim();

const patternWorkflow = `
        {/* Workflow Setup */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workflow Setup</CardTitle>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground" /></span>}></TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">Departments that have a configured approval chain for processing submissions.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{deptsWithWorkflow.length}</span>
                <span className="text-sm text-muted-foreground">/ {totalDepts}</span>
              </div>
              {deptsWithoutWorkflow.length > 0 ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                  {deptsWithoutWorkflow.length} unconfigured
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  All linked ✓
                </Badge>
              )}
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              {deptsWithoutWorkflow.length > 0 ? "Some departments lack approval chains" : "All departments can process submissions"}
            </p>
          </CardContent>
        </Card>
`.trim();

const patternPending = `
        {/* Pending Approvals */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground" /></span>}></TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">Total waiting approval requests. Stalled requests have been pending for over 14 days.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold tracking-tight">{pendingCount}</span>
              {stalledCount > 0 && (
                <Badge variant="outline" className="gap-1 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                  <ArrowDown className="h-3 w-3" weight="bold" />
                  {stalledCount} stalled
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{pendingCount} waiting across all departments</p>
          </CardContent>
        </Card>
`.trim();

const patternGaps = `
        {/* Data Gaps */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Data Gaps</CardTitle>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground" /></span>}></TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">KPIs or Risks missing a parent link (Process or Procedure) won't appear in dashboards.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold tracking-tight">{totalGaps}</span>
              {totalGaps === 0 ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  All linked ✓
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                  Action required
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {(orphanedKpis || 0)} KPI{(orphanedKpis || 0) !== 1 ? "s" : ""} · {(orphanedRisks || 0)} Risk{(orphanedRisks || 0) !== 1 ? "s" : ""} unlinked
            </p>
          </CardContent>
        </Card>
`.trim();

code = code.replace(/\{\/\* Users & Roles \*\/\}[\s\S]*?(?=\{\/\* ── Chart \+ Pipeline Breakdown ── \*\/)/, 
  patternUsers + '\n\n' + patternWorkflow + '\n\n' + patternPending + '\n\n' + patternGaps + '\n      </div>\n\n      '
);

fs.writeFileSync('src/app/admin/page.tsx', code);
