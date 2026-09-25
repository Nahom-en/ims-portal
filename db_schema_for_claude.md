# Supabase Schema Design

This is the fully normalized PostgreSQL schema optimized for Supabase. You can paste this directly into your Supabase SQL Editor to instantly generate your entire database.

```sql
-- =========================================================================
-- IMS PORTAL SUPABASE SCHEMA
-- =========================================================================

-- 1. ENUMS
CREATE TYPE employee_role AS ENUM ('SYSTEM_ADMIN', 'DEPARTMENT_MANAGER', 'CONTRIBUTOR', 'VIEWER');
CREATE TYPE workflow_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
CREATE TYPE analysis_frequency AS ENUM ('MONTHLY', 'QUARTERLY', 'BI_YEARLY', 'YEARLY');
CREATE TYPE treatment_effectiveness AS ENUM ('MAINTAIN', 'CORRECTION', 'IMPROVEMENT');
CREATE TYPE workflow_action AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- 2. CORE ORGANIZATION
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- Links to Supabase auth.users
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role employee_role NOT NULL DEFAULT 'VIEWER',
    phone_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true, -- Soft delete for employees who leave
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WORKFLOW CONFIGURATION
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    steps JSONB NOT NULL DEFAULT '["Writer", "Published"]', -- Dynamic routing array
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(department_id)
);

-- 4. PROCESSES & PROCEDURES
CREATE TABLE processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    process_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE risk_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    procedure_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DEFINITIONS (Static Goals)
CREATE TABLE objective_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    objective_description TEXT NOT NULL,
    success_criteria TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    custom_metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
    kpi_name VARCHAR(255) NOT NULL,
    target_value VARCHAR(255) NOT NULL,
    unit VARCHAR(50) DEFAULT '',
    source VARCHAR(255) NOT NULL,
    analysis_frequency analysis_frequency NOT NULL,
    custom_metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE objective_kpi_mapping (
    objective_id UUID REFERENCES objective_definitions(id) ON DELETE CASCADE,
    kpi_id UUID REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (objective_id, kpi_id)
);

CREATE TABLE risk_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID REFERENCES risk_procedures(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    affected_assets TEXT NOT NULL,
    threat TEXT NOT NULL,
    vulnerability TEXT NOT NULL,
    risk_statement TEXT NOT NULL,
    treatment_solution TEXT NOT NULL,
    baseline_severity INTEGER NOT NULL,
    baseline_likelihood INTEGER NOT NULL,
    custom_metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REPORT CYCLES & WORKFLOW TRACKING
CREATE TABLE report_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    reporting_period VARCHAR(50) NOT NULL, -- e.g., "Q1 2026"
    workflow_status workflow_status NOT NULL DEFAULT 'DRAFT',
    current_step_index INTEGER NOT NULL DEFAULT 0, -- Tracks progress through workflow_templates.steps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(department_id, reporting_period)
);

CREATE TABLE approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_cycle_id UUID REFERENCES report_cycles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    action workflow_action NOT NULL,
    step_name VARCHAR(100) NOT NULL, -- e.g., "IMS Manager"
    comment TEXT, -- Mandatory if rejected
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PERIODIC MEASUREMENTS (Linked to Report Cycles)
CREATE TABLE objective_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID REFERENCES objective_definitions(id) ON DELETE CASCADE,
    report_cycle_id UUID REFERENCES report_cycles(id) ON DELETE CASCADE,
    status_vs_target VARCHAR(255),
    evidence_of_achievement TEXT,
    reasons_for_deviation TEXT,
    followup_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(objective_id, report_cycle_id)
);

CREATE TABLE kpi_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    report_cycle_id UUID REFERENCES report_cycles(id) ON DELETE CASCADE,
    period_start DATE,
    period_end DATE,
    status VARCHAR(50), -- e.g., "Achieved", "Off Track"
    actual_value VARCHAR(255),
    justification_for_deviation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kpi_id, report_cycle_id)
);

CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID REFERENCES risk_definitions(id) ON DELETE CASCADE,
    report_cycle_id UUID REFERENCES report_cycles(id) ON DELETE CASCADE,
    residual_severity INTEGER,
    residual_likelihood INTEGER,
    treatment_effectiveness treatment_effectiveness,
    evidence_for_solutions TEXT,
    reason_for_deviation TEXT,
    followup_measure TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(risk_id, report_cycle_id)
);
```
