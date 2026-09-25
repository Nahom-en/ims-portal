-- Enable RLS and permissive READ policies for all tracking tables just in case they are missing
ALTER TABLE public.report_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read report_cycles" ON public.report_cycles;
DROP POLICY IF EXISTS "Allow read objective_tracking" ON public.objective_tracking;
DROP POLICY IF EXISTS "Allow read kpi_measurements" ON public.kpi_measurements;
DROP POLICY IF EXISTS "Allow read risk_assessments" ON public.risk_assessments;
DROP POLICY IF EXISTS "Allow read objective_definitions" ON public.objective_definitions;
DROP POLICY IF EXISTS "Allow read kpi_definitions" ON public.kpi_definitions;
DROP POLICY IF EXISTS "Allow read risk_definitions" ON public.risk_definitions;

CREATE POLICY "Allow read report_cycles" ON public.report_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read objective_tracking" ON public.objective_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read kpi_measurements" ON public.kpi_measurements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read risk_assessments" ON public.risk_assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read objective_definitions" ON public.objective_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read kpi_definitions" ON public.kpi_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read risk_definitions" ON public.risk_definitions FOR SELECT TO authenticated USING (true);

DO $$
DECLARE
  dept_it_id UUID := '11111111-1111-1111-1111-111111111111';
  proc_it_dev UUID;
  risk_proc_it UUID;
  obj_it_1 UUID;
  obj_it_2 UUID;
  kpi_uptime UUID;
  risk_breach UUID;
  v_cycle_id UUID;
BEGIN
  -- Grab the IT entities seeded in Turn 3
  SELECT id INTO proc_it_dev FROM public.processes WHERE department_id = dept_it_id LIMIT 1;
  SELECT id INTO risk_proc_it FROM public.risk_procedures WHERE department_id = dept_it_id LIMIT 1;
  SELECT id INTO obj_it_1 FROM public.objective_definitions WHERE department_id = dept_it_id AND objective_description LIKE 'Migrate%' LIMIT 1;
  SELECT id INTO obj_it_2 FROM public.objective_definitions WHERE department_id = dept_it_id AND objective_description LIKE 'Achieve ISO%' LIMIT 1;
  SELECT id INTO kpi_uptime FROM public.kpi_definitions WHERE process_id = proc_it_dev LIMIT 1;
  SELECT id INTO risk_breach FROM public.risk_definitions WHERE procedure_id = risk_proc_it LIMIT 1;

  -- 1. Get or Create Report Cycle for Q3 2026
  SELECT id INTO v_cycle_id FROM public.report_cycles WHERE department_id = dept_it_id AND reporting_period = 'Q3 2026' LIMIT 1;
  IF v_cycle_id IS NULL THEN
    v_cycle_id := gen_random_uuid();
    INSERT INTO public.report_cycles (id, department_id, reporting_period, current_step_index, workflow_status)
    VALUES (v_cycle_id, dept_it_id, 'Q3 2026', 0, 'DRAFT');
  END IF;

  -- Clear existing tracking for this cycle to avoid dupes if re-run
  DELETE FROM public.objective_tracking WHERE report_cycle_id = v_cycle_id;
  DELETE FROM public.kpi_measurements WHERE report_cycle_id = v_cycle_id;
  DELETE FROM public.risk_assessments WHERE report_cycle_id = v_cycle_id;

  -- 2. Seed Objective Tracking
  IF obj_it_1 IS NOT NULL THEN
    INSERT INTO public.objective_tracking (id, objective_id, report_cycle_id, status_vs_target)
    VALUES (gen_random_uuid(), obj_it_1, v_cycle_id, 'On Track');
  END IF;

  IF obj_it_2 IS NOT NULL THEN
    INSERT INTO public.objective_tracking (id, objective_id, report_cycle_id, status_vs_target)
    VALUES (gen_random_uuid(), obj_it_2, v_cycle_id, 'Not Achieved');
  END IF;

  -- 3. Seed KPI Measurements
  IF kpi_uptime IS NOT NULL THEN
    INSERT INTO public.kpi_measurements (id, kpi_id, report_cycle_id, status, actual_value)
    VALUES (gen_random_uuid(), kpi_uptime, v_cycle_id, 'Achieved', '99.99%');
  END IF;

  -- 4. Seed Risk Assessments (This feeds the Heatmap and High/Med/Low)
  IF risk_breach IS NOT NULL THEN
    INSERT INTO public.risk_assessments (id, risk_id, report_cycle_id, residual_severity, residual_likelihood, treatment_effectiveness)
    VALUES (gen_random_uuid(), risk_breach, v_cycle_id, 4, 4, 'MAINTAIN'); -- Score 16 -> High
  END IF;

END $$;
