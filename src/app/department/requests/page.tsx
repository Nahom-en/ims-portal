/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useEmployee } from "@/lib/employee-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MagnifyingGlass, Funnel } from "@phosphor-icons/react";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ScrollableTableWrapper } from "@/components/shared/ScrollableTableWrapper";
import { WorkflowStepper } from "@/components/shared/WorkflowStepper";

export default function RequestsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  
  // Pipeline state
  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);

  const employee = useEmployee();
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      if (!employee?.id) return;
      setLoading(true);
      
      // Get the employee's department
      const { data: empData } = await supabase.from('employees').select('department_id').eq('id', employee.id).single();
      if (empData && empData.department_id) {
        // Fetch the workflow template for this department
        const { data: tmpl } = await supabase.from('workflow_templates').select('steps').eq('department_id', empData.department_id).maybeSingle();
        if (tmpl && tmpl.steps) {
          setWorkflowSteps((tmpl.steps as any[]).map(s => s.label || s));
        }
      }

      // Fetch ONLY this user's requests
      const { data: requests } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('requested_by', employee.id)
        .order('created_at', { ascending: false });

      if (requests) {
        setData(requests);
        if (requests.length > 0) {
          setSelectedRequestId(requests[0].id); // Auto-select the first one
        }
      }
      
      setLoading(false);
    }
    fetchData();
  }, [employee?.id, supabase]);

  const selectedRequest = data.find(r => r.id === selectedRequestId);
  
  // Map approval_requests status to WorkflowStepper status
  let status: "Draft" | "Pending Approval" | "Published" | "Rejected" = "Draft";
  if (selectedRequest) {
    const s = selectedRequest.status?.toUpperCase() || "";
    if (s === "APPROVED" || s === "COMPLETED") status = "Published";
    else if (s === "PENDING_APPROVAL" || s === "PENDING") status = "Pending Approval";
    else if (s === "REJECTED") status = "Rejected";
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-8 w-full max-w-[1600px] mx-auto relative">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Approval Progress</h1>
        <p className="text-muted-foreground text-sm">Track the status of your submitted requests.</p>
      </div>

      {/* ── Dynamic Stepper Visual ── */}
      {!loading && workflowSteps.length > 0 && selectedRequest ? (
        <WorkflowStepper 
          steps={workflowSteps}
          currentStepIndex={selectedRequest.current_step_index ?? 0}
          status={status}
          canApprove={false} // User is viewing their own request
        />
      ) : !loading && data.length > 0 && !selectedRequest ? (
        <div className="w-full bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-lg p-6 shadow-sm mb-6 flex flex-col items-center justify-center h-32 text-muted-foreground">
          Select a request below to view its progress pipeline.
        </div>
      ) : !loading && data.length === 0 ? (
        <div className="w-full bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-lg p-6 shadow-sm mb-6 flex flex-col items-center justify-center h-32 text-muted-foreground">
          You haven&apos;t submitted any requests yet.
        </div>
      ) : null}

      
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
        <div className="flex items-center gap-2">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm bg-muted/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Funnel className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All Types" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="objective">Objectives</SelectItem>
              <SelectItem value="kpi">KPIs</SelectItem>
              <SelectItem value="risk">Risks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Detail Table ── */}
      <ScrollableTableWrapper>
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-zinc-900/50 sticky top-0 z-10 shadow-sm outline outline-1 outline-border">
            <TableRow>
              <TableHead className="h-10">Entity</TableHead>
              <TableHead className="h-10">Action Type</TableHead>
              <TableHead className="h-10">Status</TableHead>
              <TableHead className="h-10">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={4} rows={3} />
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No requests found.</TableCell></TableRow>
            ) : (
              data.filter(row => {
              if (entityFilter !== "ALL" && row.entity_type !== entityFilter) return false;
              if (!search) return true
              const term = search.toLowerCase()
              const entityName = row.entity_type === 'objective' ? 'Objective' : row.entity_type === 'kpi' ? 'KPI' : 'Risk'
              return entityName.toLowerCase().includes(term) || (row.status || '').toLowerCase().includes(term)
            }).map((row) => {
                const entityName = row.entity_type === 'objective' ? 'Objective' : row.entity_type === 'kpi' ? 'KPI' : 'Risk'
                const isSelected = selectedRequestId === row.id;
                const changeType = (row.custom_metadata as any)?.change_type || "CREATE";
                
                return (
                  <TableRow 
                    key={row.id} 
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedRequestId(row.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{entityName} Request</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {(() => {
                            const meta = row.custom_metadata || {};
                            if (meta.proposed_changes) {
                              try {
                                const changes = typeof meta.proposed_changes === 'string' ? JSON.parse(meta.proposed_changes) : meta.proposed_changes;
                                return changes.title || changes.name || changes.objective_description || changes.risk_statement || meta.processNames?.join(", ") || "";
                              } catch (e) { return ""; }
                            }
                            return meta.title || meta.name || meta.processName || meta.description || "";
                          })()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {changeType === 'UPDATE' ? 'Edit' : changeType === 'DELETE' ? 'Deletion' : 'Creation'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'Approved' ? 'default' : row.status === 'Rejected' ? 'destructive' : 'outline'}
                             className={row.status === 'Approved' ? "bg-emerald-100 text-emerald-800" : ""}>
                        {row.status === 'PENDING_APPROVAL' ? 'Pending' : row.status}
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
