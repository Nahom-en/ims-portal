const fs = require('fs');
let code = fs.readFileSync('src/app/department/objectives/page.tsx', 'utf8');

// Add dependencies to useEffect
code = code.replace(/}, \[employee, supabase, departmentFilter\]\)/, '}, [employee, supabase, departmentFilter, activeQuarter, activeYear])');

const replacement = `
      if (objs) {
        // 1. Get cycle IDs for the active period
        const periodStr = \`\${activeQuarter} \${activeYear}\`
        const { data: cycles } = await supabase.from('report_cycles').select('id').eq('reporting_period', periodStr)
        const cycleIds = cycles?.map(c => c.id) || []
        
        let trackingData = []
        if (cycleIds.length > 0 && objs.length > 0) {
          const objIds = objs.map(o => o.id)
          const { data: tr } = await supabase.from('objective_tracking')
            .select('objective_id, status_vs_target')
            .in('objective_id', objIds)
            .in('report_cycle_id', cycleIds)
          if (tr) trackingData = tr
        }
        
        setData(objs.map(o => {
          const track = trackingData.find((t: any) => t.objective_id === o.id)
          return {
            id: o.id,
            name: o.objective_description,
            department_id: o.department_id,
            process: (o.custom_metadata as any)?.processName || 'N/A',
            status: track ? track.status_vs_target : 'No Data',
            targetDate: o.end_date || 'N/A',
          }
        }))
      }
`;

code = code.replace(/if \(objs\) \{[\s\S]*?\}\)\)\)\n      \}/, replacement.trim());

fs.writeFileSync('src/app/department/objectives/page.tsx', code);
