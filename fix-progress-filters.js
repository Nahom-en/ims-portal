const fs = require('fs');
let code = fs.readFileSync('src/app/department/progress/page.tsx', 'utf8');

// 1. Add Search state and icon import
if (!code.includes('MagnifyingGlass')) {
  code = code.replace(/import \{ Check,/, 'import { MagnifyingGlass, Check,');
}
if (!code.includes('const [search, setSearch]')) {
  code = code.replace(/const \[loading, setLoading\] = useState\(true\)/, "const [loading, setLoading] = useState(true)\n  const [search, setSearch] = useState('')");
}

// 2. Add the filter bar JSX
const filterJSX = `
      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search requests..." 
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          </div>
        </div>
      </div>
`;

// Insert the filters before the Detail Table
code = code.replace(/\{\/\* ── Detail Table ── \*\/\}/, filterJSX + '\n      {/* ── Detail Table ── */}');

// 3. Apply search filter to the rendered data
code = code.replace(/data\.map\(\(row\) => \{/g, "data.filter(row => {\n              if (!search) return true\n              const term = search.toLowerCase()\n              const entityName = row.entity_type === 'objective' ? 'Objective' : row.entity_type === 'kpi' ? 'KPI' : 'Risk'\n              return entityName.toLowerCase().includes(term) || (row.status || '').toLowerCase().includes(term)\n            }).map((row) => {");

fs.writeFileSync('src/app/department/progress/page.tsx', code);
