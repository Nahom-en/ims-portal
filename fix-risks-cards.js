const fs = require('fs');
let code = fs.readFileSync('src/app/department/risks/page.tsx', 'utf8');

if (!code.includes('ShieldWarning')) {
  code = code.replace(/import \{ Warning /, 'import { Warning, ShieldWarning, WarningCircle, Clock ');
}

const cardsPattern = `        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Risks</CardTitle>
              <ShieldWarning className="h-4 w-4 text-primary opacity-70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active registered risks</p>
            </CardContent>
          </Card>
          
          <Card className={data.filter(d => d.riskScore >= 15).length > 0 ? "bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/20" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className={"text-sm font-medium " + (data.filter(d => d.riskScore >= 15).length > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground')}>High/Critical Risks</CardTitle>
              <WarningCircle className={"h-4 w-4 opacity-70 " + (data.filter(d => d.riskScore >= 15).length > 0 ? 'text-red-600 dark:text-red-500' : 'text-muted-foreground')} />
            </CardHeader>
            <CardContent>
              <div className={"text-2xl font-bold " + (data.filter(d => d.riskScore >= 15).length > 0 ? 'text-red-700 dark:text-red-400' : '')}>
                {data.filter(d => d.riskScore >= 15).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Requires immediate mitigation</p>
            </CardContent>
          </Card>
          
          <Card className={data.filter(d => d.status === 'Overdue').length > 0 ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/20" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className={"text-sm font-medium " + (data.filter(d => d.status === 'Overdue').length > 0 ? 'text-amber-700 dark:text-amber-500' : 'text-muted-foreground')}>Overdue for Review</CardTitle>
              <Clock className={"h-4 w-4 opacity-70 " + (data.filter(d => d.status === 'Overdue').length > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground')} />
            </CardHeader>
            <CardContent>
              <div className={"text-2xl font-bold " + (data.filter(d => d.status === 'Overdue').length > 0 ? 'text-amber-700 dark:text-amber-500' : '')}>
                {data.filter(d => d.status === 'Overdue').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Action required</p>
            </CardContent>
          </Card>
        </div>`;

code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-3 gap-3">[\s\S]*?<\/div>\n      <\/div>/, cardsPattern + '\n      </div>');

fs.writeFileSync('src/app/department/risks/page.tsx', code);
