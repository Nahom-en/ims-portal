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
  const { data: template, error: tmplErr } = await supabase
    .from('workflow_templates')
    .select('steps')
    .eq('department_id', params.departmentId)
    .single()

  if (tmplErr || !template) throw new Error("Workflow template not found for this department")

  // Ensure steps is a valid array
  const steps = Array.isArray(template.steps) ? template.steps : []
  if (steps.length === 0) throw new Error("Department has no configured workflow steps")

  // Check delegation
  const { data: dept } = await supabase.from('departments').select('manager_id').eq('id', params.departmentId).single()
  // Note: Your pristine schema doesn't have manager_id natively, but if it exists we use it. If not, isDelegated is false.
  const isDelegated = dept?.manager_id && dept.manager_id !== params.requestedBy
  const initialIndex = isDelegated ? -1 : 0

  // 2. Create the staging approval request with the snapshotted steps
  const { data: request, error: reqErr } = await supabase
    .from('approval_requests')
    .insert({
      entity_type: params.entityType,
      entity_id: params.entityId || null,
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
