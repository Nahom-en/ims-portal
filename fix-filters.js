const fs = require('fs');
const files = ['src/app/department/risks/page.tsx', 'src/app/department/kpis/page.tsx', 'src/app/department/objectives/page.tsx'];

const filterBlock = `        <div className="flex flex-wrap items-center gap-3">
          {departmentFilter !== null && (
            <DepartmentFilter value={departmentFilter} onChange={setDepartmentFilter} />
          )}
          <div className="flex items-center gap-2">
            <Select value={activeQuarter} onValueChange={(v) => v && setActiveQuarter(v)}>
              <SelectTrigger className="w-[80px] h-9 text-sm bg-muted dark:bg-zinc-900 border-border dark:border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Q1","Q2","Q3","Q4"].map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeYear} onValueChange={(v) => v && setActiveYear(v)}>
              <SelectTrigger className="w-[90px] h-9 text-sm bg-muted dark:bg-zinc-900 border-border dark:border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>`;

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Replace the entire block from <div className="flex ... gap-2"> {departmentFilter ... up to the <Button
  const regex = /<div className="flex (?:flex-wrap )?items-center gap-2">\s*(?:\{departmentFilter !== null && \(\s*<DepartmentFilter[\s\S]*?onChange=\{setDepartmentFilter(?:[^}]*)\}\s*\/>\s*\)\})[\s\S]*?<Select value=\{activeQuarter\}[\s\S]*?<\/Select>\s*<Select value=\{activeYear\}[\s\S]*?<\/Select>/;
  
  code = code.replace(regex, filterBlock);
  fs.writeFileSync(file, code);
}
