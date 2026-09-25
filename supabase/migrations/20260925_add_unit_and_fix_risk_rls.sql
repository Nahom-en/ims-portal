-- =====================================================================
-- Migration: Add unit column to kpi_definitions and ensure RLS policies
-- =====================================================================

-- 1. Add unit column to kpi_definitions
ALTER TABLE public.kpi_definitions 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT '';

-- 2. Ensure RLS is enabled and allows authenticated operations
ALTER TABLE public.risk_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_procedures ENABLE ROW LEVEL SECURITY;

-- 3. Permissive policies for risk_definitions
DROP POLICY IF EXISTS "Allow authenticated users to read risk_definitions" ON public.risk_definitions;
CREATE POLICY "Allow authenticated users to read risk_definitions" 
ON public.risk_definitions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert risk_definitions" ON public.risk_definitions;
CREATE POLICY "Allow authenticated users to insert risk_definitions" 
ON public.risk_definitions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update risk_definitions" ON public.risk_definitions;
CREATE POLICY "Allow authenticated users to update risk_definitions" 
ON public.risk_definitions FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete risk_definitions" ON public.risk_definitions;
CREATE POLICY "Allow authenticated users to delete risk_definitions" 
ON public.risk_definitions FOR DELETE TO authenticated USING (true);

-- 4. Permissive policies for kpi_definitions
DROP POLICY IF EXISTS "Allow authenticated users to read kpi_definitions" ON public.kpi_definitions;
CREATE POLICY "Allow authenticated users to read kpi_definitions" 
ON public.kpi_definitions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert kpi_definitions" ON public.kpi_definitions;
CREATE POLICY "Allow authenticated users to insert kpi_definitions" 
ON public.kpi_definitions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update kpi_definitions" ON public.kpi_definitions;
CREATE POLICY "Allow authenticated users to update kpi_definitions" 
ON public.kpi_definitions FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete kpi_definitions" ON public.kpi_definitions;
CREATE POLICY "Allow authenticated users to delete kpi_definitions" 
ON public.kpi_definitions FOR DELETE TO authenticated USING (true);

-- 5. Permissive policies for objective_definitions
DROP POLICY IF EXISTS "Allow authenticated users to read objective_definitions" ON public.objective_definitions;
CREATE POLICY "Allow authenticated users to read objective_definitions" 
ON public.objective_definitions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert objective_definitions" ON public.objective_definitions;
CREATE POLICY "Allow authenticated users to insert objective_definitions" 
ON public.objective_definitions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update objective_definitions" ON public.objective_definitions;
CREATE POLICY "Allow authenticated users to update objective_definitions" 
ON public.objective_definitions FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete objective_definitions" ON public.objective_definitions;
CREATE POLICY "Allow authenticated users to delete objective_definitions" 
ON public.objective_definitions FOR DELETE TO authenticated USING (true);

-- 6. Permissive policies for risk_procedures
DROP POLICY IF EXISTS "Allow authenticated users to read risk_procedures" ON public.risk_procedures;
CREATE POLICY "Allow authenticated users to read risk_procedures" 
ON public.risk_procedures FOR SELECT TO authenticated USING (true);
