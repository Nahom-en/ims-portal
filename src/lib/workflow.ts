import { SupabaseClient } from '@supabase/supabase-js'

export async function submitForApproval(
  supabase: SupabaseClient,
  params: {
    entityType: string
    entityId?: string // Optional if it's a new item pending creation
    departmentId: string
    requestedBy: string
    payload?: Record<string, unknown> // The proposed data
  }
) {
  // 1. Fetch the department's workflow template (JSONB steps)
  let steps: Record<string, unknown>[] = []
  if (params.departmentId) {
    const { data: template } = await supabase
      .from('workflow_templates')
      .select('steps')
      .eq('department_id', params.departmentId)
      .maybeSingle()

    if (template && Array.isArray(template.steps) && template.steps.length > 0) {
      steps = template.steps
    }
  }

  // Fallback 1: check for any global/default workflow template
  if (steps.length === 0) {
    const { data: defaultTmpl } = await supabase
      .from('workflow_templates')
      .select('steps')
      .is('department_id', null)
      .maybeSingle()
    if (defaultTmpl && Array.isArray(defaultTmpl.steps) && defaultTmpl.steps.length > 0) {
      steps = defaultTmpl.steps
    }
  }

  // Check department & manager delegation
  let deptManagerId: string | null = null
  if (params.departmentId) {
    const { data: dept } = await supabase
      .from('departments')
      .select('manager_id')
      .eq('id', params.departmentId)
      .maybeSingle()
    deptManagerId = dept?.manager_id || null
  }

  // Fallback 2: Dynamic fallback steps based on manager or system admin
  if (steps.length === 0) {
    if (deptManagerId) {
      steps = [{ label: 'Department Manager Review', approverId: deptManagerId, roleId: null }]
    } else {
      steps = [{ label: 'System Admin Review', role: 'SYSTEM_ADMIN' }]
    }
  }

  const isDelegated = !!(deptManagerId && deptManagerId !== params.requestedBy)
  const initialIndex = isDelegated ? -1 : 0
  const finalEntityId = params.entityId || crypto.randomUUID()

  // 2. Create the staging approval request with the snapshotted steps
  const { data: request, error: reqErr } = await supabase
    .from('approval_requests')
    .insert({
      entity_type: params.entityType,
      entity_id: finalEntityId,
      department_id: params.departmentId,
      requested_by: params.requestedBy,
      payload: params.payload || {},
      current_step_index: initialIndex,
      status: 'PENDING_APPROVAL',
      chain_snapshot: steps,
      is_delegated: isDelegated
    })
    .select('id')
    .single()

  if (reqErr) throw new Error(`Failed to create approval request: ${reqErr.message}`)

  // 3. Log Submission
  await supabase.from('approval_actions').insert({
    approval_request_id: request.id,
    actor_id: params.requestedBy,
    action: 'SUBMITTED',
    step_index: initialIndex,
    step_label: isDelegated ? 'Staff Submission' : 'Submission',
    comment: 'Submitted for approval'
  })

  // 4. Notify
  if (isDelegated) {
    await supabase.from('notifications').insert({
      recipient_id: dept.manager_id,
      approval_request_id: request.id,
      type: 'ACTION_REQUIRED',
      title: `Pre-Approval Required: ${params.entityType.toUpperCase()}`,
      message: `A delegated ${params.entityType} requires your manager pre-approval.`
    })
  } else {
    await notifyApproversAtStep(supabase, request.id, params.departmentId, steps[0], params.entityType)
  }

  return request
}

export async function approveStep(
  supabase: SupabaseClient,
  params: { requestId: string, actorId: string, comment?: string }
) {
  const { data: request, error } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('id', params.requestId)
    .single()
    
  if (error || !request) throw new Error("Request not found")
  
  let steps = Array.isArray(request.chain_snapshot) ? request.chain_snapshot : []
  if (steps.length === 0 && request.department_id) {
    const { data: tmpl } = await supabase.from('workflow_templates').select('steps').eq('department_id', request.department_id).maybeSingle()
    if (tmpl && Array.isArray(tmpl.steps) && tmpl.steps.length > 0) {
      steps = tmpl.steps
      await supabase.from('approval_requests').update({ chain_snapshot: steps }).eq('id', request.id)
    }
  }
  const currentIndex = request.current_step_index
  
  // STRICT AUTHORIZATION CHECK
  const { data: actor } = await supabase.from('employees').select('id, company_role_id, role').eq('id', params.actorId).single()
  if (!actor) throw new Error("Actor not found")

  // System Admin can bypass
  if (actor.role !== 'SYSTEM_ADMIN') {
    if (currentIndex === -1) {
      const { data: dept } = await supabase.from('departments').select('manager_id').eq('id', request.department_id).single()
      if (dept?.manager_id !== params.actorId) {
        throw new Error("Unauthorized: Only the department manager can pre-approve this request.")
      }
    } else {
      const currentStep = steps[currentIndex]
      const stepApproverId = currentStep?.approverId || currentStep?.approver_id
      const stepRoleId = currentStep?.roleId || currentStep?.role_id
      let authorized = false
      if (stepApproverId && stepApproverId === params.actorId) {
        authorized = true
      } else if (stepRoleId && stepRoleId === actor.company_role_id) {
        authorized = true
      }
      
      if (!authorized) {
        throw new Error("Unauthorized: You are not configured as the approver for this step.")
      }
    }
  }

  if (currentIndex === -1) {
    await supabase.from('approval_requests').update({ current_step_index: 0 }).eq('id', request.id)
    await supabase.from('approval_actions').insert({
      approval_request_id: request.id, actor_id: params.actorId, action: 'APPROVED',
      step_index: -1, step_label: 'Pre-Approval', comment: params.comment || 'Approved'
    })
    await notifyApproversAtStep(supabase, request.id, request.department_id, steps[0], request.entity_type)
    return
  }

  const currentStep = steps[currentIndex]
  const isLastStep = currentIndex === steps.length - 1

  await supabase.from('approval_actions').insert({
    approval_request_id: request.id, actor_id: params.actorId, action: 'APPROVED',
    step_index: currentIndex, step_label: currentStep?.label || `Step ${currentIndex + 1}`, comment: params.comment || 'Approved'
  })

  if (isLastStep) {
    await supabase.from('approval_requests').update({ status: 'PUBLISHED' }).eq('id', request.id)
    await supabase.from('notifications').insert({
      recipient_id: request.requested_by, approval_request_id: request.id, type: 'WORKFLOW_APPROVED',
      title: `${request.entity_type} Approved`, message: `Your ${request.entity_type} has been fully approved.`
    })
    await applyPublishedChanges(supabase, request)
  } else {
    const nextIndex = currentIndex + 1
    await supabase.from('approval_requests').update({ current_step_index: nextIndex }).eq('id', request.id)
    await notifyApproversAtStep(supabase, request.id, request.department_id, steps[nextIndex], request.entity_type)
  }
}

export async function rejectStep(
  supabase: SupabaseClient,
  params: { requestId: string, actorId: string, comment: string }
) {
  if (!params.comment) throw new Error("Rejection comment required")
  
  const { data: request } = await supabase.from('approval_requests').select('*').eq('id', params.requestId).single()
  if (!request) throw new Error("Not found")

  let steps = Array.isArray(request.chain_snapshot) ? request.chain_snapshot : []
  if (steps.length === 0 && request.department_id) {
    const { data: tmpl } = await supabase.from('workflow_templates').select('steps').eq('department_id', request.department_id).maybeSingle()
    if (tmpl && Array.isArray(tmpl.steps) && tmpl.steps.length > 0) {
      steps = tmpl.steps
    }
  }
  const stepLabel = request.current_step_index === -1 ? 'Pre-Approval' : (steps[request.current_step_index]?.label || 'Review')

  await supabase.from('approval_requests').update({ status: 'REJECTED' }).eq('id', params.requestId)
  await supabase.from('approval_actions').insert({
    approval_request_id: params.requestId, actor_id: params.actorId, action: 'REJECTED',
    step_index: request.current_step_index, step_label: stepLabel, comment: params.comment
  })
  // 1. Notify the requester
  const notifications = [{
    recipient_id: request.requested_by,
    approval_request_id: params.requestId,
    type: 'WORKFLOW_REJECTED',
    title: `${request.entity_type} Rejected`,
    message: `Rejected at "${stepLabel}". Reason: ${params.comment}`
  }]

  // 2. Notify all upstream approvers who already approved
  const { data: previousActions } = await supabase
    .from('approval_actions')
    .select('actor_id')
    .eq('approval_request_id', params.requestId)
    .eq('action', 'APPROVED')

  if (previousActions && previousActions.length > 0) {
    const upstreamApprovers = [...new Set(previousActions.map(a => a.actor_id))]
    const filteredApprovers = upstreamApprovers.filter(id => id !== request.requested_by)
    
    filteredApprovers.forEach(approverId => {
      if (approverId) {
        notifications.push({
          recipient_id: approverId,
          approval_request_id: params.requestId,
          type: 'WORKFLOW_REJECTED',
          title: `${request.entity_type} Rejected Downstream`,
          message: `An item you approved was later rejected at "${stepLabel}". Reason: ${params.comment}`
        })
      }
    })
  }

  // 3. Insert all notifications
  await supabase.from('notifications').insert(notifications)

}

export async function resubmit(supabase: SupabaseClient, params: { requestId: string, actorId: string }) {
  const { data: request } = await supabase.from('approval_requests').select('*').eq('id', params.requestId).single()
  if (!request || request.status !== 'REJECTED') throw new Error("Invalid request")

  await supabase.from('approval_requests').update({ current_step_index: 0, status: 'PENDING_APPROVAL' }).eq('id', params.requestId)
  await supabase.from('approval_actions').insert({
    approval_request_id: params.requestId, actor_id: params.actorId, action: 'SUBMITTED',
    step_index: 0, step_label: 'Resubmission', comment: 'Resubmitted'
  })
  
  const steps = Array.isArray(request.chain_snapshot) ? request.chain_snapshot : []
  await notifyApproversAtStep(supabase, request.id, request.department_id, steps[0], request.entity_type)
}

async function notifyApproversAtStep(supabase: SupabaseClient, requestId: string, departmentId: string, step: { roleId: string | null }, entityType: string) {
  let approverIds: string[] = []
  if (typeof step === 'string') {
    const { data } = await supabase.from('employees').select('id').eq('department_id', departmentId).eq('role', step).eq('is_active', true)
    if (data) approverIds = data.map(d => d.id)
  } else if (step?.approverId) {
    approverIds = [step.approverId]
  } else if (step?.role) {
    const { data } = await supabase.from('employees').select('id').eq('department_id', departmentId).eq('role', step.role).eq('is_active', true)
    if (data) approverIds = data.map(d => d.id)
  }
  
  if (approverIds.length > 0) {
    const notifications = approverIds.map(id => ({
      recipient_id: id, approval_request_id: requestId, type: 'ACTION_REQUIRED',
      title: `Approval Required: ${entityType}`, message: `Review required.`
    }))
    await supabase.from('notifications').insert(notifications)
  }
}

async function applyPublishedChanges(supabase: SupabaseClient, request: Record<string, unknown>) {
  try {
    const entityType = ((request.entity_type as string) || '').toLowerCase()
    const entityId = request.entity_id as string
    if (!entityId) return

    const payload = (request.payload as Record<string, unknown>) || {}
    const meta = (request.custom_metadata as Record<string, unknown>) || (payload.custom_metadata as Record<string, unknown>) || {}
    const changeType = (((meta.change_type as string) || 'CREATE')).toUpperCase()

    if (changeType === 'DELETE') {
      if (entityType === 'objective') {
        await supabase.from('objective_definitions').update({ is_active: false }).eq('id', entityId)
      } else if (entityType === 'kpi') {
        await supabase.from('kpi_definitions').update({ is_active: false }).eq('id', entityId)
      } else if (entityType === 'risk') {
        await supabase.from('risk_definitions').update({ is_active: false }).eq('id', entityId)
      }
      return
    }

    if (changeType === 'UPDATE') {
      let proposed = meta.proposed_changes
      if (typeof proposed === 'string') {
        try { proposed = JSON.parse(proposed) } catch { proposed = {} }
      }
      const dataToApply = proposed || payload

      if (entityType === 'objective') {
        await supabase.from('objective_definitions').update({
          objective_description: dataToApply.name || dataToApply.objective_description,
          success_criteria: dataToApply.successCriteria || dataToApply.success_criteria,
          custom_metadata: {
            ...meta,
            processNames: dataToApply.processNames,
            description: dataToApply.description,
            linkedKpis: dataToApply.linkedKpis,
          },
          updated_at: new Date().toISOString()
        }).eq('id', entityId)
      } else if (entityType === 'kpi') {
        await supabase.from('kpi_definitions').update({
          kpi_name: dataToApply.name || dataToApply.kpi_name,
          target_value: dataToApply.target || dataToApply.target_value,
          unit: dataToApply.unit ?? '',
          source: dataToApply.dataSource || dataToApply.source || 'Manual',
          custom_metadata: {
            ...meta,
            responsibility: dataToApply.responsibility,
            analysisMethodology: dataToApply.analysisMethodology,
            customFields: dataToApply.customFields ?? [],
          },
          updated_at: new Date().toISOString()
        }).eq('id', entityId)
      } else if (entityType === 'risk') {
        await supabase.from('risk_definitions').update({
          risk_statement: dataToApply.title || dataToApply.risk_statement,
          affected_assets: dataToApply.description || dataToApply.affected_assets,
          threat: dataToApply.description || dataToApply.threat,
          vulnerability: dataToApply.description || dataToApply.vulnerability,
          treatment_solution: dataToApply.mitigationStrategy || dataToApply.treatment_solution,
          baseline_likelihood: dataToApply.likelihood || dataToApply.baseline_likelihood,
          baseline_severity: dataToApply.severity || dataToApply.baseline_severity,
          custom_metadata: {
            ...meta,
            linkedObjective: dataToApply.linkedObjective,
            treatmentType: dataToApply.treatmentType,
          },
          updated_at: new Date().toISOString()
        }).eq('id', entityId)
      }
      return
    }

    // Default: CREATE
    if (entityType === 'objective') {
      const { data: existing } = await supabase.from('objective_definitions').select('id').eq('id', entityId).maybeSingle()
      if (existing) {
        await supabase.from('objective_definitions').update({ is_active: true }).eq('id', entityId)
      } else {
        await supabase.from('objective_definitions').insert({
          id: entityId,
          department_id: request.department_id,
          objective_description: payload.objective_description || payload.name || 'New Objective',
          success_criteria: payload.success_criteria || null,
          start_date: payload.start_date || '2026-01-01',
          end_date: payload.end_date || '2026-12-31',
          custom_metadata: payload.custom_metadata || meta,
          is_active: true
        })
      }
    } else if (entityType === 'kpi') {
      const { data: existing } = await supabase.from('kpi_definitions').select('id').eq('id', entityId).maybeSingle()
      if (existing) {
        await supabase.from('kpi_definitions').update({ is_active: true }).eq('id', entityId)
      } else {
        await supabase.from('kpi_definitions').insert({
          id: entityId,
          process_id: payload.process_id || null,
          kpi_name: payload.kpi_name || payload.name || 'New KPI',
          target_value: payload.target_value || payload.target || '100',
          unit: payload.unit || '',
          source: payload.source || 'Manual',
          analysis_frequency: payload.analysis_frequency || 'MONTHLY',
          custom_metadata: payload.custom_metadata || meta,
          is_active: true
        })
      }
    } else if (entityType === 'risk') {
      const { data: existing } = await supabase.from('risk_definitions').select('id').eq('id', entityId).maybeSingle()
      if (existing) {
        await supabase.from('risk_definitions').update({ is_active: true }).eq('id', entityId)
      } else {
        await supabase.from('risk_definitions').insert({
          id: entityId,
          procedure_id: payload.procedure_id || null,
          owner_id: payload.owner_id || null,
          risk_statement: payload.risk_statement || payload.title || 'New Risk',
          affected_assets: payload.affected_assets || payload.description || 'Assets',
          threat: payload.threat || payload.description || 'Threat',
          vulnerability: payload.vulnerability || payload.description || 'Vulnerability',
          treatment_solution: payload.treatment_solution || payload.mitigationStrategy || '',
          baseline_likelihood: payload.baseline_likelihood || payload.likelihood || 3,
          baseline_severity: payload.baseline_severity || payload.severity || 3,
          custom_metadata: payload.custom_metadata || meta,
          is_active: true
        })
      }
    }
  } catch (pubErr) {
    console.error('Failed to apply published changes:', pubErr)
  }
}
