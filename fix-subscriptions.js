const fs = require('fs');
let code = fs.readFileSync('src/app/department/page.tsx', 'utf8');

const newSubs = `
    const channel = supabase.channel('dashboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kpi_measurements' },
        () => setRefreshKey(prev => prev + 1)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'objective_tracking' },
        () => setRefreshKey(prev => prev + 1)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'risk_assessments' },
        () => setRefreshKey(prev => prev + 1)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'approval_requests' },
        () => setRefreshKey(prev => prev + 1)
      )
      .subscribe()
`;

code = code.replace(/const channel = supabase\.channel\('dashboard-live'\)[\s\S]*?\.subscribe\(\)/, newSubs.trim());

fs.writeFileSync('src/app/department/page.tsx', code);
