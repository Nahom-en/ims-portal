const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://glvtcogqtxgkymskmthf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdnRjb2dxdHhna3ltc2ttdGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDg3NTksImV4cCI6MjEwNDUyNDc1OX0.4YhfPD36V-Wt3iDPN8UlXIwvQHTxJj56kI6gv4xUfHM'
);

async function run() {
  const { data: user, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'admin@ims.local',
    password: 'password123'
  });
  console.log("Login:", loginErr || "Success");

  const { data: objs, error: objErr } = await supabase.from('objective_definitions').select('*').eq('is_active', true);
  console.log("Objectives:", objErr ? objErr : objs.length + " rows");

  const { data: kpis, error: kpiErr } = await supabase.from('kpi_definitions').select(`
    id, kpi_name, target_value, unit, processes!inner(process_name, department_id)
  `);
  console.log("KPIs:", kpiErr ? kpiErr : kpis.length + " rows");
  
  const { data: risks, error: riskErr } = await supabase.from('risk_definitions').select(`
    id, risk_statement, baseline_likelihood, baseline_severity, risk_procedures!inner(procedure_name, department_id)
  `);
  console.log("Risks:", riskErr ? riskErr : risks.length + " rows");
}
run();
