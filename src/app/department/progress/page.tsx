"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useEmployee } from "@/lib/employee-context"
import { DepartmentFilter } from "@/components/shared/DepartmentFilter"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { ScrollableTableWrapper } from "@/components/shared/ScrollableTableWrapper"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MagnifyingGlass, Check, ArrowRight, CircleDashed, CaretUp, CaretDown } from "@phosphor-icons/react"

export default function ProgressPage() {
  const employee = useEmployee()
  const [data, setData] = useState<any[]>([])
  const defaultStages = [
    { label: "Submitted", index: 0 },
    { label: "Under Review", index: 1 },
    { label: "Approved", index: 2 }
  ]
  const [dynamicStages, setDynamicStages] = useState(defaultStages)

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
  const [search, setSearch] = useState('')
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
          department_id
        `)
        .order('created_at', { ascending: false })

      if (employee.role !== 'SYSTEM_ADMIN' && departmentFilter && departmentFilter !== 'ALL') {
        query = query.eq('department_id', departmentFilter)
      }
      
      const { data: requests } = await query
      if (requests) setData(requests)
      
      // Fetch department's workflow template to build the pipeline
      if (departmentFilter && departmentFilter !== 'ALL') {
        const { data: tmpl } = await supabase.from('workflow_templates').select('steps').eq('department_id', departmentFilter).single()
        if (tmpl && tmpl.steps) {
          const rawSteps = Array.isArray(tmpl.steps) ? tmpl.steps : []
          const mapped = rawSteps.map((s, i) => ({ label: s.label || `Step ${i+1}`, index: i + 1 }))
          setDynamicStages([
            { label: "Submitted", index: 0 },
            ...mapped,
            { label: "Approved", index: mapped.length + 1 }
          ])
        } else {
          setDynamicStages(defaultStages)
        }
      } else {
        setDynamicStages(defaultStages)
      }
      
      setLoading(false)
    }
    fetchData()
  }, [employee])

  if (loading) return <div className="p-8 text-muted-foreground">Loading progress...</div>

  
  const stages = dynamicStages;

  const countsByStage = stages.map(st => {
    return data.filter(d => {
      const status = d.status?.toUpperCase() || '';
      const isApproved = status === 'APPROVED' || status === 'COMPLETED';
      
      // First stage: Submitted but not yet at step 1
      if (st.index === 0) return !isApproved && d.current_step_index <= 1;
      
      // Last stage: Approved/Completed
      if (st.index === stages.length - 1) return isApproved;
      
      // Intermediate stages
      return !isApproved && d.current_step_index === (st.index + 1);
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

      
      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search requests..." 
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {departmentFilter !== null && (
            <DepartmentFilter value={departmentFilter} onChange={setDepartmentFilter} />
          )}
          <div className="flex items-center gap-2">
            <Select value={activeQuarter} onValueChange={(v) => v && setActiveQuarter(v)}>
              <SelectTrigger className="w-[80px] h-9 text-sm bg-muted dark:bg-zinc-900 border-border dark:border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Q1","Q2","Q3","Q4"].map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeYear} onValueChange={(v) => v && setActiveYear(v)}>
              <SelectTrigger className="w-[90px] h-9 text-sm bg-muted dark:bg-zinc-900 border-border dark:border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Detail Table ── */}
      <ScrollableTableWrapper>
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-zinc-900/50 sticky top-0 z-10 shadow-sm outline outline-1 outline-border">
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
              data.filter(row => {
              if (!search) return true
              const term = search.toLowerCase()
              const entityName = row.entity_type === 'objective' ? 'Objective' : row.entity_type === 'kpi' ? 'KPI' : 'Risk'
              return entityName.toLowerCase().includes(term) || (row.status || '').toLowerCase().includes(term)
            }).map((row) => {
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
      </ScrollableTableWrapper>
    </div>
  )
}
