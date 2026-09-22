const fs = require('fs');
let code = fs.readFileSync('src/app/department/objectives/page.tsx', 'utf8');
code = code.replace(/name: o\.objective_description,/g, "name: o.objective_description,\n          department_id: o.department_id,");
code = code.replace(/department_id: departmentId,/g, "department_id: objToDelete.department_id || departmentId,");
fs.writeFileSync('src/app/department/objectives/page.tsx', code);
