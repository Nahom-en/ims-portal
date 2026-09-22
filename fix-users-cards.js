const fs = require('fs');
let code = fs.readFileSync('src/app/admin/users/page.tsx', 'utf8');

if (!code.includes('import { Tooltip')) {
  code = code.replace(/import \{ Badge \} from "@\/components\/ui\/badge"/, 'import { Badge } from "@/components/ui/badge"\nimport { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"');
}

if (!code.includes('Info')) {
  code = code.replace(/MagnifyingGlass,/, 'MagnifyingGlass,\n  Info,');
}

const pattern = `
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Total number of registered user accounts in the system.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{data.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned Departments</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Users without a department assigned. They cannot participate in department-specific workflows.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold tracking-tight">{data.filter(u => !u.departmentId).length}</div>
                {data.filter(u => !u.departmentId).length > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                    Action required
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Missing System Roles</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Users with the default Viewer role or no role assigned, meaning they lack edit permissions.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold tracking-tight">{data.filter(u => !u.systemRole || u.systemRole === "VIEWER").length}</div>
              </div>
            </CardContent>
          </Card>
        </div>
`.trim();

code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-3 gap-4">[\s\S]*?<\/div>\n      <\/div>/, pattern + '\n      </div>');

fs.writeFileSync('src/app/admin/users/page.tsx', code);
