const fs = require('fs');
let code = fs.readFileSync('src/app/department/risks/page.tsx', 'utf8');
code = code.replace(/useEffect\(\(\) => \{\n  \}, \[employee, departmentFilter\]\)/g, `useEffect(() => {\n    if (employee && departmentFilter === null) {\n      setDepartmentFilter(employee.department_id || 'ALL')\n    }\n  }, [employee, departmentFilter])`);
fs.writeFileSync('src/app/department/risks/page.tsx', code);
