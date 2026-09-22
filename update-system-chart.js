const fs = require('fs');
let code = fs.readFileSync('src/components/admin/SystemActivityChart.tsx', 'utf8');

if (!code.includes('selectedYear')) {
  code = code.replace(/const \[selectedDept, setSelectedDept\] = useState\("ALL"\)/, 
    'const [selectedDept, setSelectedDept] = useState("ALL")\n  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())\n  const [selectedQuarter, setSelectedQuarter] = useState("ALL")'
  );
}

if (!code.includes('cycleQ = cycleQ.like("reporting_period"')) {
  code = code.replace(/if \(selectedDept !== "ALL"\) \{\n        cycleQ = cycleQ\.eq\("department_id", selectedDept\)\n      \}/, 
    `if (selectedDept !== "ALL") {
        cycleQ = cycleQ.eq("department_id", selectedDept)
      }
      if (selectedYear !== "ALL") {
        cycleQ = cycleQ.like("reporting_period", \`%\${selectedYear}%\`)
      }
      if (selectedQuarter !== "ALL") {
        cycleQ = cycleQ.like("reporting_period", \`%\${selectedQuarter}%\`)
      }`
  );
}

if (!code.includes('selectedYear, selectedQuarter')) {
  code = code.replace(/\[selectedDept, supabase\]/, '[selectedDept, selectedYear, selectedQuarter, supabase]');
}

const filterUI = `
        <div className="flex items-center gap-2">
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="Quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Qs</SelectItem>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Yrs</SelectItem>
              {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
`.trim();

code = code.replace(/<Select value=\{selectedDept\}[\s\S]*?<\/Select>/, filterUI);

fs.writeFileSync('src/components/admin/SystemActivityChart.tsx', code);
