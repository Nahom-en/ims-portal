"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Trash, Shield, CaretLeft, CaretRight, MagnifyingGlass, CaretUp, CaretDown } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import { AlertDialog } from "@/components/ui/alert-dialog"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import SlideOutSheet from "@/components/shared/SlideOutSheet"
import UserForm, { UserFormData, SystemRole } from "@/components/forms/UserForm"
import { TableSkeleton } from "@/components/shared/TableSkeleton"

// ── Role Badge Component ──

function RoleBadge({ role }: { role: SystemRole | string }) {
  switch (role) {
    case "SUPER_ADMIN":
    case "SYSTEM_ADMIN":
      return <Badge className="bg-destructive/20 text-rose-800 hover:bg-destructive/20 dark:bg-rose-900/40 dark:text-rose-400 gap-1 text-xs"><Shield className="h-3 w-3" />System Admin</Badge>
    case "DEPT_HEAD":
    case "DEPARTMENT_MANAGER":
      return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-400 text-xs">Dept Head</Badge>
    case "CONTRIBUTOR":
      return <Badge className="bg-primary/20 text-blue-800 hover:bg-primary/20 dark:bg-blue-900/40 dark:text-blue-400 text-xs">Contributor</Badge>
    case "VIEWER":
      return <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-muted-foreground text-xs">Viewer</Badge>
    default:
      return <Badge>{role}</Badge>
  }
}

// ── Page Component ──

export default function UsersPage() {
  const [data, setData] = useState<UserFormData[]>([])
  const [loading, setLoading] = useState(true)
  const [departmentsList, setDepartmentsList] = useState<{id: string, name: string}[]>([])
  const [companyRolesList, setCompanyRolesList] = useState<{id: string, title: string}[]>([])
  const supabase = createClient()

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    async function fetchData() {
      const { data: depts } = await supabase.from('departments').select('id, department_name')
      if (depts) {
        setDepartmentsList(depts.map(d => ({ id: d.id, name: d.department_name })))
      }

      const { data: roles } = await supabase.from('company_roles').select('id, title')
      if (roles) {
        setCompanyRolesList(roles.map((r: any) => ({ id: r.id, title: r.title })))
      }

      const { data: emps } = await supabase
        .from('employees')
        .select(`
          id,
          firstname,
          lastname,
          email,
          role,
          is_active,
          department_id,
          company_role_id,
          custom_metadata,
          departments!employees_department_id_fkey(department_name),
          company_roles(title)
        `)
      
      if (emps) {
        const mapped = emps.map(e => {
          let uiRole: SystemRole = 'VIEWER'
          if (e.role === 'SYSTEM_ADMIN') uiRole = 'SUPER_ADMIN'
          else if (e.role === 'WRITER') uiRole = 'CONTRIBUTOR'
          else if (e.role === 'DEPARTMENT_MANAGER') uiRole = 'DEPT_HEAD'
          else if (e.role === 'CONTRIBUTOR') uiRole = 'CONTRIBUTOR'

          const companyRoleData = Array.isArray(e.company_roles) ? e.company_roles[0] : e.company_roles
          const jobTitle = companyRoleData?.title || "Staff"
          
          return {
            id: e.id,
            firstName: e.firstname || "",
            lastName: e.lastname || "",
            email: e.email,
            jobTitle: jobTitle,
            departmentId: e.department_id || "",
            companyRoleId: e.company_role_id || "",
            systemRole: uiRole,
            status: e.is_active ? "Active" : "Suspended",
            visibilityScope: (e.custom_metadata as any)?.visibility_scope || "OWN",
          }
        })
        setData(mapped as UserFormData[])
      }
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  // Modals & Sheets State
  const [userToDelete, setUserToDelete] = useState<UserFormData | null>(null)
  const [userToEdit, setUserToEdit] = useState<UserFormData | null>(null)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  // Filter & Sort
  const filteredData = data.filter(u =>
    `${`${u.firstName} ${u.lastName}`} ${u.email}`.toLowerCase().includes(search.toLowerCase())
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

  // ── Handlers ──

  const handleCreate = async (formData: UserFormData) => {
    if (!formData.firstName?.trim() || !formData.email.trim()) {
      toast.error("First Name and Email are required.")
      return
    }
    if (!formData.departmentId) {
      toast.error("Please assign a department.")
      return
    }

    const resolvedRoleId = formData.companyRoleId || null;

    let dbRole = "VIEWER"
    if (formData.systemRole === "SUPER_ADMIN" || formData.systemRole === "SYSTEM_ADMIN") dbRole = "SYSTEM_ADMIN"
    else if (formData.systemRole === "DEPT_HEAD") dbRole = "WRITER"
    else if (formData.systemRole === "CONTRIBUTOR") dbRole = "WRITER"





    const { data: inserted, error } = await supabase
      .from('employees')
      .insert({
        firstname: formData.firstName,
        lastname: formData.lastName,
        email: formData.email,
        department_id: formData.departmentId,
        company_role_id: resolvedRoleId,
        role: dbRole as any,
        is_active: formData.status === "Active",
        custom_metadata: { visibility_scope: formData.visibilityScope || "OWN" }
      })
      .select('id')
      .single()

    if (error || !inserted) {
      toast.error(`Failed to create user: ${error?.message}`)
      return
    }

    const created: UserFormData = {
      ...formData,
      id: inserted.id,
      visibilityScope: vScope
    }
    setData([created, ...data])
    setIsCreateSheetOpen(false)
    toast.success(`User "${`${created.firstName} ${created.lastName}`}" has been created.`)
  }

  const handleUpdate = async (formData: UserFormData) => {
    const resolvedRoleId = formData.companyRoleId || null;

    if (!formData.id?.startsWith("usr-")) {
      let dbRole = "VIEWER"
      if (formData.systemRole === "SUPER_ADMIN") dbRole = "SYSTEM_ADMIN"
      else if (formData.systemRole === "DEPT_HEAD") dbRole = "WRITER"
      else if (formData.systemRole === "CONTRIBUTOR") dbRole = "WRITER"



      const { error } = await supabase
        .from('employees')
        .update({
          firstname: formData.firstName,
          lastname: formData.lastName,
          department_id: formData.departmentId,
          company_role_id: resolvedRoleId,
          role: dbRole as any,
          is_active: formData.status === "Active",
          custom_metadata: { visibility_scope: formData.visibilityScope || "OWN" }
        })
        .eq('id', formData.id)

      if (error) {
        toast.error(`Error: ${error.message}`)
        return
      }
    }
    
    setData(data.map(u => u.id === formData.id ? { ...formData, id: formData.id } : u))
    setUserToEdit(null)
    toast.success(`User "${`${formData.firstName} ${formData.lastName}`}" has been updated.`)
  }

  const handleDelete = async () => {
    if (userToDelete) {
      if (!userToDelete.id?.startsWith("usr-")) {
        const { error } = await supabase.from('employees').delete().eq('id', userToDelete.id)
        if (error) {
          toast.error(`Error deleting user: ${error.message}`)
          return
        }
      }
      setData(data.filter(u => u.id !== userToDelete.id))
      toast.success(`User "${`${userToDelete.firstName} ${userToDelete.lastName}`}" has been removed.`)
      setUserToDelete(null)
    }
  }

  const getDeptName = (id: string) => departmentsList.find(d => d.id === id)?.name || "—"

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto relative">

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-500" />
            <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="bg-primary hover:bg-primary/90 text-white gap-2 h-9"
              onClick={() => setIsCreateSheetOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New User
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.filter(u => !u.departmentId).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Missing System Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.filter(u => !u.systemRole || u.systemRole === "VIEWER").length}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 max-w-sm relative">
          <MagnifyingGlass className="absolute left-3 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-md border bg-white dark:bg-zinc-950 shadow-sm overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-muted dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="h-10 pl-6 cursor-pointer" onClick={() => handleSort('firstName')}>
                  <div className="flex items-center gap-1">User {sortKey === 'firstName' && (sortDir === 'asc' ? <CaretUp /> : <CaretDown />)}</div>
                </TableHead>
                <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('departmentId')}>
                  <div className="flex items-center gap-1">Department {sortKey === 'departmentId' && (sortDir === 'asc' ? <CaretUp /> : <CaretDown />)}</div>
                </TableHead>
                <TableHead className="h-10 cursor-pointer" onClick={() => handleSort('systemRole')}>
                  <div className="flex items-center gap-1">System Role {sortKey === 'systemRole' && (sortDir === 'asc' ? <CaretUp /> : <CaretDown />)}</div>
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
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => setUserToEdit(row)}
                    className={`cursor-pointer transition-colors hover:bg-muted dark:hover:bg-slate-900/50 ${row.status === "Suspended" ? "opacity-60" : ""}`}
                  >
                    <TableCell className="font-medium pl-6">
                      <div>
                        {row.firstName} {row.lastName}
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground font-normal">{row.email}</p>
                          {row.jobTitle && (
                            <span className="text-xs text-muted-foreground/70">· {row.jobTitle}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getDeptName(row.departmentId)}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={row.systemRole} />
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-rose-950/50 transition-colors z-10 relative"
                        title="Delete User"
                        onClick={(e) => {
                          e.stopPropagation()
                          setUserToDelete(row)
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
        open={!!userToDelete} 
        title="Are you sure?" 
        description={`You are about to permanently remove ${`${userToDelete?.firstName} ${userToDelete?.lastName}`} (${userToDelete?.email}). They will lose all access to the IMS portal.`}
        onConfirm={handleDelete} 
        onCancel={() => setUserToDelete(null)} 
      />

      <SlideOutSheet
        title="Edit User"
        description="Update user details, department assignment, and system role."
        isOpen={!!userToEdit}
        onClose={() => setUserToEdit(null)}
      >
        <UserForm
          key={userToEdit?.id ?? "edit-closed"}
          initialData={userToEdit}
          isEditMode={true}
          departments={departmentsList}
          companyRoles={companyRolesList}
          onCancel={() => setUserToEdit(null)}
          onSubmit={handleUpdate}
        />
      </SlideOutSheet>

      <SlideOutSheet
        title="Create User"
        description="Add a new user to the IMS portal and assign their access level."
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
      >
        <UserForm
          key={isCreateSheetOpen ? "create-open" : "create-closed"}
          isEditMode={false}
          departments={departmentsList}
          companyRoles={companyRolesList}
          onCancel={() => setIsCreateSheetOpen(false)}
          onSubmit={handleCreate}
        />
      </SlideOutSheet>

    </div>
  )
}
