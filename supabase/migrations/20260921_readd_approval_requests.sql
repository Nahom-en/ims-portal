CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'OBJECTIVE', 'KPI', 'RISK', etc.
    entity_id UUID, -- For tracking updates/deletes to existing records
    payload JSONB, -- The proposed data changes staging area
    workflow_status workflow_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    current_step_index INTEGER NOT NULL DEFAULT 0,
    chain_snapshot JSONB NOT NULL, -- Solves Turn 2: Freezes the workflow steps at submission
    is_delegated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE approval_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    action workflow_action NOT NULL,
    step_index INTEGER NOT NULL,
    step_label VARCHAR(100) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
