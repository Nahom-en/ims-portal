"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Buildings, Trash, CaretLeft, CaretRight, MagnifyingGlass,
  Info, CaretUp, CaretDown } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { TableSkeleton } from "@/components/shared/TableSkeleton"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import SlideOutSheet from "@/components/shared/SlideOutSheet"
import DepartmentForm, { DepartmentFormData } from "@/components/forms/DepartmentForm"

export default function DepartmentsPage() {
  const [data, setData] = useState<DepartmentFormData[]>([])
  const [loading, setLoading] = useState(true)
  const [mockUsers, setMockUsers] = useState<{id: string, name: string}[]>([])
  const supabase = createClient()

  const [companyRolesList, setCompanyRolesList] = useState<{id: string, title: string}[]>([])

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    async function fetchData() {
      const roles = [{id: 'DEPARTMENT_MANAGER', title: 'Department Manager'}, {id: 'SYSTEM_ADMIN', title: 'System Admin'}];
      setCompanyRolesList(roles);

      const { data: depts } = await supabase
        .from('departments')
        .select(`
          id,
          department_name,
          manager_id,
          workflow_templates(
            id,
            steps
          )
        `)
      
      const { data: emps } = await supabase.from('employees').select('id, firstname, lastname')

      if (emps) {
        setMockUsers(emps.map((e: any) => ({ id: e.id, name: `${e.firstname} ${e.lastname}` })))
      }

      if (depts) {
        const mapped = depts.map((d: any) => {
          const templates = Array.isArray(d.workflow_templates) ? d.workflow_templates[0] : d.workflow_templates;
          
          let stepsArr: any[] = []
          if (templates && templates.steps) {
            const rawSteps = Array.isArray(templates.steps) ? templates.steps : [];
            stepsArr = rawSteps.map((s, i) => ({
              id: s.id || `step-${Date.now()}-${i}`,
              label: s.label || s,
              roleId: s.roleId || s.role || null,
              approverId: s.approverId || null
            }))
          }
          
          return {
            id: d.id,
            name: d.department_name,
            code: d.department_name.substring(0, 3).toUpperCase(),
            description: "Managed via Supabase",
            headOfDepartment: d.manager_id || "",
            status: "Active",
            workflowSteps: stepsArr
          }
        })
        setData(mapped as any)
      }
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  const [deptToDelete, setDeptToDelete] = useState<DepartmentFormData | null>(null)
  const [deptToEdit, setDeptToEdit] = useState<DepartmentFormData | null>(null)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  const filteredData = data.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.code.toLowerCase().includes(search.toLowerCase())
  )

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0
    let aVal: any = (a as any)[sortKey]
    let bVal: any = (b as any)[sortKey]
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleCreate = async (formData: DepartmentFormData) => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Department Name and Code are required.")
      return
    }

    const { data: newDept, error: deptErr } = await supabase
      .from('departments')
      .insert({
        department_name: formData.name,
        manager_id: formData.headOfDepartment || null
      })
      .select('id, department_name, manager_id')
      .single()

    if (deptErr || !newDept) {
      toast.error(`Failed to create department: ${deptErr?.message}`)
      return
    }

    const { data: newTemplate, error: tplErr } = await supabase
      .from('workflow_templates')
      .insert({
        department_id: newDept.id
      })
      .select('id')
      .single()

    if (!tplErr && newTemplate && formData.workflowSteps.length > 0) {
      const insertPayload = formData.workflowSteps.map((step) => ({
        id: step.id,
        label: step.label,
        roleId: step.roleId || null,
        approverId: step.approverId || null
      }))

      await supabase.from('workflow_templates').update({ steps: insertPayload }).eq('id', newTemplate.id)
    }

    const created: DepartmentFormData = {
      ...formData,
      id: newDept.id,
    }
    setData([...data, created])
    setIsCreateSheetOpen(false)
    toast.success(`Department "${created.name}" has been created.`)
  }

  const handleUpdate = async (formData: DepartmentFormData) => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Department Name and Code are required.")
      return
    }

    if (!formData.id?.startsWith("dept-")) {
      const deptId = formData.id

      const { error: deptErr } = await supabase
        .from('departments')
        .update({
          department_name: formData.name,
          manager_id: formData.headOfDepartment || null
        })
        .eq('id', deptId)
        
      if (deptErr) {
        toast.error(`Failed to update department: ${deptErr.message}`)
        return
      }

      const { data: template } = await supabase
        .from('workflow_templates')
        .select('id')
        .eq('department_id', deptId)
        .single()

      const insertPayload = formData.workflowSteps.map((step) => ({
        id: step.id,
        label: step.label,
        roleId: step.roleId || null,
        approverId: step.approverId || null
      }))

      if (template) {
        const { error: stepsError } = await supabase
          .from('workflow_templates')
          .update({ steps: insertPayload })
          .eq('id', template.id)

        if (stepsError) {
          toast.error(`Error saving workflow steps: ${stepsError.message}`)
          return
        }
      } else {
        const { error: insertError } = await supabase
          .from('workflow_templates')
          .insert({ department_id: deptId, steps: insertPayload })
          
        if (insertError) {
          toast.error(`Error creating workflow steps: ${insertError.message}`)
          return
        }
      }
    }

    setData(data.map(d => d.id === formData.id ? formData : d))
    setDeptToEdit(null)
    toast.success(`Department "${formData.name}" has been updated.`)
  }

  const handleDelete = async () => {
    if (deptToDelete) {
      if (!deptToDelete.id?.startsWith("dept-")) {
        const { error } = await supabase.from('departments').delete().eq('id', deptToDelete.id)
        if (error) {
          toast.error(`Error deleting department: ${error.message}`)
          return
        }
      }
      setData(data.filter(d => d.id !== deptToDelete.id))
      toast.success(`Department "${deptToDelete.name}" deleted.`)
      setDeptToDelete(null)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto relative">
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Buildings className="h-6 w-6 text-primary dark:text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Department Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="bg-primary hover:bg-primary/90 text-white gap-2 h-9"
              onClick={() => setIsCreateSheetOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Department
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Departments</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Total number of registered departments across the organization.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{data.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Missing Leadership</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Departments without an assigned Head of Department.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold tracking-tight">{data.filter(d => !d.headOfDepartment).length}</div>
                {data.filter(d => !d.headOfDepartment).length > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                    Action required
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Incomplete Workflows</CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">Departments missing a configured approval workflow chain for objective tracking.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold tracking-tight">{data.filter(d => !d.workflowSteps || d.workflowSteps.length === 0).length}</div>
                {data.filter(d => !d.workflowSteps || d.workflowSteps.length === 0).length > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                    Action required
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 max-w-sm relative">
          <MagnifyingGlass className="absolute left-3 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search departments..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-md border bg-white dark:bg-zinc-950 shadow-sm overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-muted dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="h-10 pl-6 cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Department {sortKey === 'name' && (sortDir === 'asc' ? <CaretUp /> : <CaretDown />)}</div>
                </TableHead>
                <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('code')}>
                  <div className="flex items-center gap-1">Code {sortKey === 'code' && (sortDir === 'asc' ? <CaretUp /> : <CaretDown />)}</div>
                </TableHead>
                <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('headOfDepartment')}>
                  <div className="flex items-center gap-1">Head of Department {sortKey === 'headOfDepartment' && (sortDir === 'asc' ? <CaretUp /> : <CaretDown />)}</div>
                </TableHead>
                <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">Status {sortKey === 'status' && (sortDir === 'asc' ? <CaretUp /> : <CaretDown />)}</div>
                </TableHead>
                <TableHead className="h-10 w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton columns={5} rows={3} />
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No departments found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow 
                    key={row.id}
                    onClick={() => setDeptToEdit(row)}
                    className={`cursor-pointer transition-colors hover:bg-muted dark:hover:bg-slate-900/50 ${row.status === "Inactive" ? "opacity-60" : ""}`}
                  >
                    <TableCell className="font-medium pl-6">
                      <div>
                        {row.name}
                        {row.description && (
                          <p className="text-xs text-muted-foreground font-normal truncate max-w-[300px]">
                            {row.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                        {row.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.headOfDepartment ? (
                        <span className="text-sm">{mockUsers.find(u => u.id === row.headOfDepartment)?.name || "Unknown"}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.status === "Active" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-muted-foreground dark:hover:bg-slate-800">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-rose-950/50 transition-colors z-10 relative"
                        title="Delete Department"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeptToDelete(row)
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/50 dark:bg-zinc-900/30">
              <p className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <CaretLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium px-2 text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <CaretRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog 
        open={!!deptToDelete} 
        title="Are you sure?" 
        description={`You are about to delete the ${deptToDelete?.name} department. Users assigned to this department may lose their access context.`}
        onConfirm={handleDelete} 
        onCancel={() => setDeptToDelete(null)} 
      />

      <SlideOutSheet
        title="Edit Department"
        description="Update department configuration and leadership."
        isOpen={!!deptToEdit}
        onClose={() => setDeptToEdit(null)}
      >
        <DepartmentForm
          key={deptToEdit?.id ?? "edit-closed"}
          initialData={deptToEdit}
          isEditMode={true}
          availableUsers={mockUsers}
          companyRoles={companyRolesList}
          onCancel={() => setDeptToEdit(null)}
          onSubmit={handleUpdate}
        />
      </SlideOutSheet>

      <SlideOutSheet
        title="Create Department"
        description="Configure a new organizational unit."
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
      >
        <DepartmentForm
          key={isCreateSheetOpen ? "create-open" : "create-closed"}
          isEditMode={false}
          availableUsers={mockUsers}
          companyRoles={companyRolesList}
          onCancel={() => setIsCreateSheetOpen(false)}
          onSubmit={handleCreate}
        />
      </SlideOutSheet>

    </div>
  )
}
