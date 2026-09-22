'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEmployee } from '@/lib/employee-context'

export function DepartmentFilter({ 
  value, 
  onChange 
}: { 
  value: string | 'ALL';
  onChange: (val: string | 'ALL') => void;
}) {
  const employee = useEmployee()
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    async function fetchDepts() {
      if (employee?.role !== 'SYSTEM_ADMIN' && employee?.visibility_scope === 'OWN') return
      
      const supabase = createClient()
      const { data } = await supabase.from('departments').select('id, department_name').order('department_name')
      if (data) {
        setDepartments(data.map(d => ({ id: d.id, name: d.department_name })))
      }
    }
    fetchDepts()
  }, [employee])

  // Allow if system admin, or if visibility_scope allows other departments
  const vScope = employee?.visibility_scope;
  const hasAccess = employee?.role === 'SYSTEM_ADMIN' || vScope === 'ALL' || (Array.isArray(vScope) && vScope.length > 0);
  
  if (!hasAccess) {
    return null
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px] bg-white dark:bg-zinc-950">
        <SelectValue placeholder="Select Department" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL" className="font-semibold text-primary">All Departments</SelectItem>
        {employee?.department_id && (
          <SelectItem value={employee.department_id} className="font-medium">
            My Department
          </SelectItem>
        )}
        {departments
          .filter(d => d.id !== employee?.department_id)
          .filter(d => employee?.role === 'SYSTEM_ADMIN' || employee?.visibility_scope === 'ALL' || (Array.isArray(employee?.visibility_scope) && employee.visibility_scope.includes(d.id)))
          .map(dept => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
