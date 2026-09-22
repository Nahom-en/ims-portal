"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useEmployee } from "@/lib/employee-context"
import { DepartmentFilter } from "@/components/shared/DepartmentFilter"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, ArrowRight, CircleDashed, CaretUp, CaretDown } from "@phosphor-icons/react"

export default function ProgressPage() {
  const employee = useEmployee()
  const [data, setData] = useState<any[]>([])

  const currentDate = new Date()
  const actualQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`
  const actualYear = currentDate.getFullYear().toString()
  const [activeQuarter, setActiveQuarter] = useState(actualQuarter)
  const [activeYear, setActiveYear] = useState(actualYear)
  
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }
  const [loading, setLoading] = useState(true)
  const [departmentFilter, setDepartmentFilter] = useState<string | 'ALL' | null>(null)
  
  // Set default once employee is loaded
  useEffect(() => {
    if (employee && departmentFilter === null) {
      setDepartmentFilter(employee.department_id || 'ALL')
    }
  }, [employee, departmentFilter])

  useEffect(() => {
    async function fetchData() {
      if (!employee) return
      const supabase = createClient()
      
      let query = supabase
        .from('approval_requests')
        .select(`
          id,
          entity_type,
          entity_id,
          status,
          current_step_index,
          created_at,
          department_id,
          workflow_templates (
             workflow_template_steps ( step_order, label, company_role_id )
          )
        `)
        .order('created_at', { ascending: false })

      if (employee.role !== 'SYSTEM_ADMIN') {
        query = query
      }
      
      const { data: requests } = await query
      if (requests) setData(requests)
      setLoading(false)
    }
    fetchData()
  }, [employee])

  if (loading) return <div className="p-8 text-muted-foreground">Loading progress...</div>

  
  // Standardized workflow stages
  const stages = [
    { label: "Submitted", index: 0 },
    { label: "Under Review", index: 1 },
    { label: "Approved", index: 2 },
    { label: "Completed", index: 3 }
  ];

  const countsByStage = stages.map(st => {
    return data.filter(d => {
      const status = d.status?.toUpperCase() || '';
      if (st.index === 0) return status === 'PENDING_APPROVAL' && (d.current_step_index === 0 || d.current_step_index === 1);
      if (st.index === 1) return status === 'PENDING_APPROVAL' && d.current_step_index > 1;
      if (st.index === 2) return status === 'APPROVED';
      if (st.index === 3) return status === 'COMPLETED';
      return false;
    }).length;
  });

  return (
    <div className="flex-1 p-4 md:p-6 space-y-8 w-full max-w-[1600px] mx-auto relative">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Approval Workflow Pipeline</h1>
        
      </div>

      {/* ── Stepper Visual ── */}
      {!loading && stages.length > 0 && (
        <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between w-full">
            {stages.map((stage, i) => {
              const count = countsByStage[i];
              const isLast = i === stages.length - 1;
              return (
                <div key={stage.label} className="flex items-center w-full">
                  <div className="flex flex-col items-center gap-2 relative z-10 w-32">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-full border-2 ${count > 0 ? 'border-primary bg-primary/10 text-primary' : 'border-muted bg-muted/20 text-muted-foreground'}`}>
                      {count > 0 ? <span className="font-bold">{count}</span> : <CircleDashed className="h-5 w-5" />}
                    </div>
                    <span className="text-xs font-medium text-center">{stage.label}</span>
                  </div>
                  {!isLast && (
                    <div className="flex-1 h-[2px] bg-muted/50 mx-2 flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Detail Table ── */}
      <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-zinc-900/50">
            <TableRow>
              <TableHead className="h-10">Entity</TableHead>
              <TableHead className="h-10">Current Stage</TableHead>
              <TableHead className="h-10">Status</TableHead>
              <TableHead className="h-10">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={4} rows={3} />
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No approval requests found.</TableCell></TableRow>
            ) : (
              data.map((row) => {
                const entityName = row.entity_type === 'objective' ? 'Objective' : row.entity_type === 'kpi' ? 'KPI' : 'Risk'
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{entityName} Record</TableCell>
                    <TableCell>
                      {row.status?.toUpperCase() === 'COMPLETED' ? 'Completed' : 
                       row.status?.toUpperCase() === 'APPROVED' ? 'Approved' : 
                       row.current_step_index > 1 ? 'Under Review' : 
                       'Submitted'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'Approved' ? 'default' : row.status === 'Rejected' ? 'destructive' : 'outline'}
                             className={row.status === 'Approved' ? "bg-emerald-100 text-emerald-800" : ""}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(row.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
