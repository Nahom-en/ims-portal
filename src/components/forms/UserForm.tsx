"use client"

import { useState } from "react"
import { Eye, EyeSlash } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SystemRole = "SUPER_ADMIN" | "DEPT_HEAD" | "CONTRIBUTOR" | "VIEWER"
import { SearchableDropdown } from "@/components/forms/SearchableDropdown"
export type UserStatus = "Active" | "Suspended"

export interface UserFormData {
  id?: string
  firstName: string
  lastName: string
  email: string
  password?: string
  jobTitle: string
  departmentId: string
  systemRole: SystemRole
  status: UserStatus
  companyRoleId: string
  visibilityScope?: 'ALL' | 'OWN' | string[]
}

export interface AvailableDepartment {
  id: string
  name: string
}

interface UserFormProps {
  initialData?: UserFormData | null
  isEditMode?: boolean
  departments?: AvailableDepartment[]
  companyRoles?: { id: string; title: string }[]
  onSubmit: (data: UserFormData) => void
  onCancel: () => void
}

const roleConfig: Record<SystemRole, { label: string; description: string; color: string; activeColor: string }> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    description: "Full system access. Can manage departments, users, and all settings.",
    color: "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground",
    activeColor: "bg-destructive/20 text-rose-800 hover:bg-rose-200 dark:bg-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-900/70 shadow-none border-transparent",
  },
  DEPT_HEAD: {
    label: "Department Head",
    description: "Full access to their department. Can publish reports and lock records.",
    color: "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground",
    activeColor: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/70 shadow-none border-transparent",
  },
  CONTRIBUTOR: {
    label: "Contributor",
    description: "Can create and update Objectives, KPIs, and Risks in their department.",
    color: "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground",
    activeColor: "bg-primary/20 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/70 shadow-none border-transparent",
  },
  VIEWER: {
    label: "Viewer",
    description: "Read-only access to dashboards and reports in their department.",
    color: "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground",
    activeColor: "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-muted-foreground dark:hover:bg-slate-700 shadow-none border-transparent",
  },
}

const allRoles: SystemRole[] = ["SUPER_ADMIN", "DEPT_HEAD", "CONTRIBUTOR", "VIEWER"]

export default function UserForm({
  initialData,
  isEditMode = false,
  departments = [],
  companyRoles = [],
  onSubmit,
  onCancel,
}: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>(() => {
    if (initialData) return initialData
    return {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      jobTitle: "",
      departmentId: "",
      systemRole: "VIEWER",
      status: "Active",
      companyRoleId: "",
      visibilityScope: "OWN",
    }
  })

  const [showConfirmRole, setShowConfirmRole] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handlePreSubmit = () => {
    const isExisting = companyRoles.some(r => r.title.toLowerCase() === formData.companyRoleTitle.trim().toLowerCase())
    if (!isExisting && formData.companyRoleTitle.trim() !== "") {
      setShowConfirmRole(true)
    } else {
      onSubmit(formData)
    }
  }

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="user-first-name">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-first-name"
            placeholder="e.g., Nahom"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-last-name">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="user-last-name"
            placeholder="e.g., Tesfaye"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="user-email"
          type="email"
          placeholder="e.g., nahom@company.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-password">
          {isEditMode ? "Reset Password (Optional)" : "Temporary Password "}
          {!isEditMode && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative">
          <Input
            id="user-password"
            type={showPassword ? "text" : "password"}
            placeholder={isEditMode ? "Leave blank to keep current" : "Enter temporary password"}
            value={formData.password || ""}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Company Role (Job Title) <span className="text-destructive">*</span></Label>
          <SearchableDropdown
            value={formData.companyRoleId || null}
            onChange={(val) => setFormData({ ...formData, companyRoleId: val })}
            options={companyRoles.map(r => ({ id: r.id, label: r.title }))}
            placeholder="Select a role..."
            searchPlaceholder="Search roles..."
            emptyMessage="No role found"
          />
        </div>
        <div className="space-y-2">
          <Label>Department <span className="text-destructive">*</span></Label>
          <Select
            key={departments.length > 0 ? "loaded" : "loading"}
            value={formData.departmentId}
            onValueChange={(val) => setFormData({ ...formData, departmentId: val || "" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select department">
                {formData.departmentId 
                  ? departments.find(d => d.id === formData.departmentId)?.name || formData.departmentId
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cross-Department Access */}
        <div className="space-y-2">
          <Label>Cross-Department Access</Label>
          <Select
            value={formData.visibilityScope === 'ALL' ? 'ALL' : 'OWN'}
            onValueChange={(val) => setFormData({ ...formData, visibilityScope: val as any })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select access level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OWN">Own Department Only</SelectItem>
              <SelectItem value="ALL">All Departments (Global View)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      

      <div className="space-y-3">
        <Label>System Role <span className="text-destructive">*</span></Label>
        <div className="space-y-2">
          {allRoles.map((role) => {
            const config = roleConfig[role]
            const isSelected = formData.systemRole === role
            return (
              <div
                key={role}
                onClick={() => setFormData({ ...formData, systemRole: role })}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-slate-300 dark:border-zinc-600 bg-muted dark:bg-zinc-900/50 ring-1 ring-slate-300 dark:ring-zinc-600"
                    : "border-border dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                }`}
              >
                <Badge
                  variant={isSelected ? "default" : "outline"}
                  className={`px-2.5 py-0.5 text-xs shrink-0 ${isSelected ? config.activeColor : config.color}`}
                >
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {config.description}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t dark:border-zinc-800">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handlePreSubmit} 
          className="bg-primary hover:bg-primary/90 text-white"
        >
          {isEditMode ? "Save Changes" : "Create User"}
        </Button>
      </div>

      {showConfirmRole && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold tracking-tight mb-2">Create New Company Role</h2>
            <p className="text-sm text-muted-foreground mb-6">
              The role <strong className="text-slate-900 dark:text-slate-100">&quot;{formData.companyRoleTitle.trim()}&quot;</strong> does not exist yet. Are you sure you want to create it?
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirmRole(false)}>
                Cancel
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => {
                setShowConfirmRole(false)
                onSubmit(formData)
              }}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
