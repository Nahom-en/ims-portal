-- =========================================================================
-- TURN 3: CORE BUSINESS DATA SEED
-- Run this in the Supabase SQL Editor.
-- This script creates Departments, Processes, Procedures, Objectives,
-- KPIs, Risks, and Workflow templates.
-- NOTE: User seeding (auth.users and employees) is handled in the Turn 4 script.
-- =========================================================================

DO $$
DECLARE
  dept_it_id UUID := '11111111-1111-1111-1111-111111111111';
  dept_hr_id UUID := '22222222-2222-2222-2222-222222222222';
  dept_ops_id UUID := '33333333-3333-3333-3333-333333333333';

  proc_it_dev UUID := gen_random_uuid();
  proc_it_sec UUID := gen_random_uuid();
  proc_hr_rec UUID := gen_random_uuid();
  
  risk_proc_it UUID := gen_random_uuid();
  risk_proc_ops UUID := gen_random_uuid();

  -- We define standard UUIDs for the users that will be created in Turn 4
  uid_sysadmin  UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  uid_it_mgr    UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  uid_it_staff  UUID := 'aaaaaaaa-0000-0000-0000-000000000003';
  uid_hr_mgr    UUID := 'aaaaaaaa-0000-0000-0000-000000000004';
  uid_qms_coord UUID := 'aaaaaaaa-0000-0000-0000-000000000005';
  uid_exec_vp   UUID := 'aaaaaaaa-0000-0000-0000-000000000006';

BEGIN
  -- 1. DEPARTMENTS
  INSERT INTO public.departments (id, department_name) VALUES
    (dept_it_id, 'Information Technology'),
    (dept_hr_id, 'Human Resources'),
    (dept_ops_id, 'Operations')
  ON CONFLICT DO NOTHING;

  -- 2. WORKFLOW TEMPLATES (Using the Turn 4 user UUIDs)
  INSERT INTO public.workflow_templates (department_id, steps) VALUES
    (dept_it_id, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'label', 'Technical Review', 'approverId', uid_it_staff),
      jsonb_build_object('id', gen_random_uuid(), 'label', 'IT Director Approval', 'approverId', uid_it_mgr)
    )),
    (dept_hr_id, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'label', 'HR Director Approval', 'approverId', uid_hr_mgr)
    )),
    (dept_ops_id, jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'label', 'QMS Review', 'approverId', uid_qms_coord),
      jsonb_build_object('id', gen_random_uuid(), 'label', 'Executive Approval', 'approverId', uid_exec_vp)
    ))
  ON CONFLICT (department_id) DO UPDATE SET steps = EXCLUDED.steps;

  -- 3. PROCESSES
  INSERT INTO public.processes (id, department_id, process_name) VALUES
    (proc_it_dev, dept_it_id, 'Software Development Lifecycle'),
    (proc_it_sec, dept_it_id, 'Cybersecurity & Compliance'),
    (proc_hr_rec, dept_hr_id, 'Talent Acquisition')
  ON CONFLICT DO NOTHING;

  -- 4. RISK PROCEDURES
  INSERT INTO public.risk_procedures (id, department_id, procedure_name) VALUES
    (risk_proc_it, dept_it_id, 'IT Disaster Recovery'),
    (risk_proc_ops, dept_ops_id, 'Supply Chain Logistics')
  ON CONFLICT DO NOTHING;

  -- 5. OBJECTIVES
  INSERT INTO public.objective_definitions (department_id, objective_description, success_criteria, start_date, end_date, is_active, custom_metadata) VALUES
    (dept_it_id, 'Migrate on-premise infrastructure to AWS Cloud', '100% of legacy servers decommissioned', '2026-01-01', '2026-12-31', true, '{"status": "On Track", "processName": "Cybersecurity & Compliance"}'),
    (dept_it_id, 'Achieve ISO 27001 Certification', 'Zero major non-conformances in Stage 2 audit', '2026-01-01', '2026-12-31', true, '{"status": "At Risk", "processName": "Cybersecurity & Compliance"}'),
    (dept_hr_id, 'Reduce employee turnover by 15%', 'Annual turnover rate drops below 10%', '2026-01-01', '2026-12-31', true, '{"status": "Completed", "processName": "Talent Acquisition"}'),
    (dept_ops_id, 'Optimize supply chain delivery times', 'Average delivery time reduced to 2 days', '2026-01-01', '2026-12-31', true, '{"status": "On Track", "processName": "Supply Chain Logistics"}')
  ON CONFLICT DO NOTHING;

  -- 6. KPIs
  INSERT INTO public.kpi_definitions (process_id, kpi_name, target_value, source, analysis_frequency, is_active, custom_metadata) VALUES
    (proc_it_dev, 'System Uptime', '99.99%', 'AWS CloudWatch', 'MONTHLY', true, '{"status": "Achieved", "achievementPercentage": "100"}'),
    (proc_it_sec, 'Critical Vulnerabilities Unpatched', '0', 'Nessus Scanner', 'MONTHLY', true, '{"status": "Below Target", "achievementPercentage": "45"}'),
    (proc_hr_rec, 'Time to Hire', '30 Days', 'Workday ATS', 'QUARTERLY', true, '{"status": "Achieved", "achievementPercentage": "85"}')
  ON CONFLICT DO NOTHING;

  -- 7. RISKS
  INSERT INTO public.risk_definitions (procedure_id, risk_statement, affected_assets, threat, vulnerability, treatment_solution, baseline_severity, baseline_likelihood, is_active) VALUES
    (risk_proc_it, 'Data breach due to unpatched legacy systems', 'Customer Database', 'Ransomware', 'Outdated OS', 'Isolate network and accelerate cloud migration', 5, 4, true),
    (risk_proc_ops, 'Supplier bankruptcy causing inventory shortage', 'Raw Materials', 'Market Volatility', 'Single-source dependency', 'Identify secondary suppliers for top 10 materials', 4, 3, true)
  ON CONFLICT DO NOTHING;

END $$;
