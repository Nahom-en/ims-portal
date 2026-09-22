const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// Replace the data passing
code = code.replace(/<DepartmentUsageList data=\{deptAdoption\} \/>/, '<DepartmentUsageList departments={deptOptions} />');

// Remove deptAdoption logic since it's now handled by the client component
const startStr = '// ── 5. Department Adoption ──';
const endStr = 'const deptOptions = depts?.map((d: any) => ({ id: d.id, name: d.department_name })) || []';
if (code.includes(startStr) && code.includes(endStr)) {
  const startIndex = code.indexOf(startStr);
  const endIndex = code.indexOf(endStr);
  code = code.slice(0, startIndex) + code.slice(endIndex);
}

fs.writeFileSync('src/app/admin/page.tsx', code);
