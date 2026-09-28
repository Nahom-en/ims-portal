import { SupabaseClient } from '@supabase/supabase-js'

export async function getCurrentEmployee(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*, departments!employees_department_id_fkey(department_name)')
    .eq('auth_user_id', user.id)
    .single()

  if (error) {
    console.error("Error fetching employee:", error)
  }


  let is_approver = false
  if (employee && employee.role === 'SYSTEM_ADMIN') {
    is_approver = true
  } else if (employee) {
    // Check if user is head of any department
    const { data: managedDepts } = await supabase
      .from('departments')
      .select('id')
      .eq('manager_id', employee.id)
      .limit(1)

    if (managedDepts && managedDepts.length > 0) {
      is_approver = true
    }

    if (!is_approver) {
      const { data: templates } = await supabase.from('workflow_templates').select('steps')
      if (templates) {
        for (const t of templates) {
          const steps = Array.isArray(t.steps) ? t.steps : []
          for (const step of steps) {
            const approverId = step.approverId || step.approver_id
            const roleId = step.roleId || step.role_id
            if (approverId === employee.id || (roleId && roleId === employee.company_role_id)) {
              is_approver = true
              break
            }
          }
          if (is_approver) break
        }
      }
    }
  }

  return employee ? { ...employee, is_approver } : null
}


export async function requireSystemAdmin(supabase: SupabaseClient) {
  const employee = await getCurrentEmployee(supabase)
  if (!employee || employee.role !== 'SYSTEM_ADMIN') {
    throw new Error('Unauthorized: System Admin required')
  }
  return employee
}
