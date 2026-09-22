const fs = require('fs');
let code = fs.readFileSync('src/app/department/progress/page.tsx', 'utf8');

const fetchQuery = `
      let query = supabase
        .from('approval_requests')
        .select(\`
          id,
          entity_type,
          entity_id,
          status,
          current_step_index,
          created_at,
          department_id
        \`)
        .order('created_at', { ascending: false })

      if (employee.role !== 'SYSTEM_ADMIN' && departmentFilter && departmentFilter !== 'ALL') {
        query = query.eq('department_id', departmentFilter)
      }
      
      const { data: requests } = await query
      if (requests) setData(requests)
      
      // Fetch department's workflow template to build the pipeline
      if (departmentFilter && departmentFilter !== 'ALL') {
        const { data: tmpl } = await supabase.from('workflow_templates').select('steps').eq('department_id', departmentFilter).single()
        if (tmpl && tmpl.steps) {
          const rawSteps = Array.isArray(tmpl.steps) ? tmpl.steps : []
          const mapped = rawSteps.map((s, i) => ({ label: s.label || \`Step \${i+1}\`, index: i + 1 }))
          setDynamicStages([
            { label: "Submitted", index: 0 },
            ...mapped,
            { label: "Approved", index: mapped.length + 1 }
          ])
        } else {
          setDynamicStages(defaultStages)
        }
      } else {
        setDynamicStages(defaultStages)
      }
      
      setLoading(false)
`;

code = code.replace(/let query = supabase[\s\S]*?setLoading\(false\)/, fetchQuery.trim());

// Add dynamic stages state
if (!code.includes('const [dynamicStages')) {
  code = code.replace(/const \[data, setData\] = useState<any\[\]>\(\[\]\)/, "const [data, setData] = useState<any[]>([])\n  const defaultStages = [\n    { label: \"Submitted\", index: 0 },\n    { label: \"Under Review\", index: 1 },\n    { label: \"Approved\", index: 2 }\n  ]\n  const [dynamicStages, setDynamicStages] = useState(defaultStages)");
}

// Replace the hardcoded stages definition
code = code.replace(/\/\/ Standardized workflow stages[\s\S]*?\];/, "const stages = dynamicStages;");

// Fix the countsByStage logic to match dynamic stages
const countsLogic = `
  const countsByStage = stages.map(st => {
    return data.filter(d => {
      const status = d.status?.toUpperCase() || '';
      const isApproved = status === 'APPROVED' || status === 'COMPLETED';
      
      // First stage: Submitted but not yet at step 1
      if (st.index === 0) return !isApproved && d.current_step_index <= 1;
      
      // Last stage: Approved/Completed
      if (st.index === stages.length - 1) return isApproved;
      
      // Intermediate stages
      return !isApproved && d.current_step_index === (st.index + 1);
    }).length;
  });
`;

code = code.replace(/const countsByStage = stages\.map\(st => \{[\s\S]*?\}\);/, countsLogic.trim());

fs.writeFileSync('src/app/department/progress/page.tsx', code);
