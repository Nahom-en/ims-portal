/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ScrollableTableWrapper } from "@/components/shared/ScrollableTableWrapper";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkExportToolbar } from "@/components/shared/BulkExportToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash, CaretDown, CaretRight, CaretUp, Warning, MagnifyingGlass, Funnel, Info } from "@phosphor-icons/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployee } from "@/lib/employee-context";
import { DepartmentFilter } from "@/components/shared/DepartmentFilter";
import { submitForApproval } from "@/lib/workflow";

export interface RiskRow {
  id: string;
  title: string;
  processName: string;
  owner: string;
  createdByName: string;
  createdByInitials: string;
  likelihood: number | null;
  likelihoodLabel: string;
  severity: number | null;
  severityLabel: string;
  riskScore: number | null;
  rating: "Critical" | "High" | "Medium" | "Low" | "Not Rated";
  mitigation: string;
  actionStatus: "Pending" | "In Progress" | "Completed" | "Overdue" | "No Action";
  status: "Active" | "Closed";
  isActive: boolean;
  requiresAction: boolean;
}

const LIKELIHOOD_LABELS: Record<number, string> = {
  1: "1 — Rare",
  2: "2 — Unlikely",
  3: "3 — Possible",
  4: "4 — Likely",
  5: "5 — Almost Certain",
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "1 — Insignificant",
  2: "2 — Minor",
  3: "3 — Moderate",
  4: "4 — Major",
  5: "5 — Severe",
};

function getScoreRating(score: number | null): RiskRow["rating"] {
  if (score === null || score === undefined || score === 0) return "Not Rated";
  if (score >= 15) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5)  return "Medium";
  return "Low";
}

function RatingBadge({ rating, score }: { rating: RiskRow["rating"]; score: number | null }) {
  switch (rating) {
    case "Critical":
      return (
        <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 text-xs font-semibold whitespace-nowrap">
          {score} · Critical
        </Badge>
      );
    case "High":
      return (
        <Badge className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800 text-xs font-semibold whitespace-nowrap">
          {score} · High
        </Badge>
      );
    case "Medium":
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-xs font-semibold whitespace-nowrap">
          {score} · Medium
        </Badge>
      );
    case "Low":
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs font-semibold whitespace-nowrap">
          {score} · Low
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border text-xs font-normal">
          Not Rated
        </Badge>
      );
  }
}

function ActionStatusBadge({ status }: { status: RiskRow["actionStatus"] }) {
  switch (status) {
    case "Pending":
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-xs font-semibold">
          Pending
        </Badge>
      );
    case "In Progress":
      return (
        <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800 text-xs font-semibold">
          In Progress
        </Badge>
      );
    case "Completed":
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs font-semibold">
          Completed
        </Badge>
      );
    case "Overdue":
      return (
        <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 text-xs font-semibold">
          Overdue
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border text-xs font-normal">
          No Action
        </Badge>
      );
  }
}

export default function RiskRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employee = useEmployee();
  const [data, setData] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskToDelete, setRiskToDelete] = useState<RiskRow | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string | 'ALL' | null>(() => employee?.department_id || 'ALL');
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "ALL");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Collapsible process groups
  const [collapsedProcesses, setCollapsedProcesses] = useState<Set<string>>(new Set());

  // Reporting Period
  const currentDate = new Date();
  const actualQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`;
  const actualYear = currentDate.getFullYear().toString();
  const [activeQuarter, setActiveQuarter] = useState(actualQuarter);
  const [activeYear, setActiveYear] = useState(actualYear);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      if (!employee || departmentFilter === null) return;
      setLoading(true);

      // 1. Fetch risk_definitions
      const { data: rawRisks, error: riskErr } = await supabase
        .from('risk_definitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (riskErr || !rawRisks) {
        console.error("Error fetching risks:", riskErr);
        setLoading(false);
        return;
      }

      // 2. Fetch employees and approval_requests for Owner and Creator resolution
      const [empsRes, appReqsRes] = await Promise.all([
        supabase.from('employees').select('id, firstname, lastname'),
        supabase.from('approval_requests').select('entity_id, requested_by').eq('entity_type', 'risk')
      ]);
      const empsMap = new Map<string, string>();
      if (empsRes.data) {
        empsRes.data.forEach(e => empsMap.set(e.id, `${e.firstname} ${e.lastname}`.trim()));
      }
      const creatorMap = new Map((appReqsRes.data || []).map(a => [a.entity_id, a.requested_by]));

      // 3. Fetch procedures & processes for Process resolution
      const { data: procs } = await supabase
        .from('risk_procedures')
        .select('id, procedure_name, department_id');
      const procsMap = new Map<string, { name: string; department_id: string | null }>();
      if (procs) {
        procs.forEach(p => procsMap.set(p.id, { name: p.procedure_name, department_id: p.department_id }));
      }

      // 4. Fetch assessments for active report cycle
      const periodPattern = activeQuarter === 'ALL'
        ? (activeYear === 'ALL' ? '%' : `%${activeYear}`)
        : (activeYear === 'ALL' ? `${activeQuarter}%` : `${activeQuarter} ${activeYear}`);

      let cycleQuery = supabase.from('report_cycles').select('id, reporting_period');
      if (departmentFilter !== 'ALL') {
        cycleQuery = cycleQuery.eq('department_id', departmentFilter);
      }
      cycleQuery = cycleQuery.like('reporting_period', periodPattern);
      const { data: cycles } = await cycleQuery;
      const cycleIds = cycles?.map(c => c.id) || [];

      let assessments: any[] = [];
      if (cycleIds.length > 0) {
        const { data: aData } = await supabase
          .from('risk_assessments')
          .select('risk_id, residual_severity, residual_likelihood, treatment_effectiveness, followup_measure, reason_for_deviation')
          .in('report_cycle_id', cycleIds);
        if (aData) assessments = aData;
      } else if (rawRisks.length > 0) {
        const { data: aData } = await supabase
          .from('risk_assessments')
          .select('risk_id, residual_severity, residual_likelihood, treatment_effectiveness, followup_measure, reason_for_deviation')
          .order('created_at', { ascending: false });
        if (aData) assessments = aData;
      }

      let filteredRisks = rawRisks;
      if (departmentFilter !== 'ALL') {
        filteredRisks = filteredRisks.filter((r: any) => {
          const proc = procsMap.get(r.procedure_id);
          const deptId = proc?.department_id || r.custom_metadata?.departmentId || r.custom_metadata?.department_id;
          return !deptId || deptId === departmentFilter;
        });
      }

      const mapped: RiskRow[] = filteredRisks.map((r: any) => {
        const assessment = assessments.find((a: any) => a.risk_id === r.id);
        const l = assessment?.residual_likelihood ?? r.baseline_likelihood ?? null;
        const s = assessment?.residual_severity ?? r.baseline_severity ?? null;
        const riskScore = l !== null && s !== null ? l * s : null;
        const rating = getScoreRating(riskScore);
        const meta = (r.custom_metadata as any) || {};

        // Process Name
        const proc = procsMap.get(r.procedure_id);
        const processName = proc?.name || meta.processName || "Unassigned Process";

        // Risk Owner
        const ownerName = (r.owner_id ? empsMap.get(r.owner_id) : null) || meta.ownerName || "Unassigned";

        // Likelihood & Severity Labels
        const likelihoodLabel = l !== null && LIKELIHOOD_LABELS[l] ? LIKELIHOOD_LABELS[l] : (l !== null ? String(l) : "—");
        const severityLabel = s !== null && SEVERITY_LABELS[s] ? SEVERITY_LABELS[s] : (s !== null ? String(s) : "—");

        // Mitigation / Response
        const rawMitigation = meta.riskResponse || r.treatment_solution || meta.mitigationStrategy || "";
        const mitigation = rawMitigation.trim() ? rawMitigation.trim() : "Not defined";

        // Status & Active state
        const isClosed = r.is_active === false || meta.status === 'Closed';
        const effectiveness = assessment?.treatment_effectiveness;

        // Action Status
        let actionStatus: RiskRow["actionStatus"] = "No Action";
        if (meta.actionStatus) {
          const asLower = String(meta.actionStatus).toLowerCase();
          if (asLower.includes("pending")) actionStatus = "Pending";
          else if (asLower.includes("progress") || asLower.includes("mitigating")) actionStatus = "In Progress";
          else if (asLower.includes("completed") || asLower.includes("closed")) actionStatus = "Completed";
          else if (asLower.includes("overdue")) actionStatus = "Overdue";
          else actionStatus = "Pending";
        } else if (effectiveness === "MAINTAIN" || isClosed) {
          actionStatus = "Completed";
        } else if (effectiveness === "CORRECTION" || effectiveness === "IMPROVEMENT" || assessment?.followup_measure) {
          actionStatus = "In Progress";
        } else if (rawMitigation.trim()) {
          actionStatus = meta.status === "Mitigating" ? "In Progress" : "Pending";
        } else {
          actionStatus = "No Action";
        }

        const requiresAction = !isClosed && (
          actionStatus === "Pending" ||
          actionStatus === "Overdue" ||
          actionStatus === "No Action" ||
          effectiveness === "CORRECTION" ||
          effectiveness === "IMPROVEMENT" ||
          Boolean(assessment?.followup_measure) ||
          !r.treatment_solution
        );

        const creatorId = meta.author_id || creatorMap.get(r.id);
        const createdByName = empsMap.get(creatorId) || "System";
        const createdByInitials = createdByName.split(" ").map((n: string) => n[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "SY";

        return {
          id: r.id,
          title: r.risk_statement,
          processName,
          owner: ownerName,
          createdByName,
          createdByInitials,
          likelihood: l,
          likelihoodLabel,
          severity: s,
          severityLabel,
          riskScore,
          rating,
          mitigation,
          actionStatus,
          status: isClosed ? "Closed" : "Active",
          isActive: !isClosed,
          requiresAction,
        };
      });

      setData(mapped);
      setLoading(false);
    }
    fetchData();
  }, [supabase, employee, departmentFilter, activeQuarter, activeYear]);

  // Filter Risk records before grouping
  const filteredData = data.filter(d => {
    if (statusFilter !== "ALL") {
      if (statusFilter === "Active" && !d.isActive) return false;
      if (statusFilter === "Closed" && d.isActive) return false;
      if (statusFilter === "Critical" && d.rating !== "Critical" && d.rating !== "High") return false;
      if (statusFilter === "Requiring Action" && !d.requiresAction) return false;
      if (statusFilter === "Medium" && d.rating !== "Medium") return false;
      if (statusFilter === "Low" && d.rating !== "Low") return false;
    }
    if (ratingFilter !== "ALL" && d.rating !== ratingFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = 
        d.title.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q) ||
        d.processName.toLowerCase().includes(q) ||
        d.mitigation.toLowerCase().includes(q) ||
        d.actionStatus.toLowerCase().includes(q) ||
        d.rating.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Sort Risk records
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0;
    let aVal = (a as any)[sortKey];
    let bVal = (b as any)[sortKey];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Group Risks by Process / Risk Category
  const processGroups = new Map<string, RiskRow[]>();
  for (const risk of sortedData) {
    const proc = risk.processName || "Unassigned Process";
    if (!processGroups.has(proc)) {
      processGroups.set(proc, []);
    }
    processGroups.get(proc)!.push(risk);
  }

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(sortedData.map(d => d.id));
    else setSelectedIds([]);
  };

  const toggleOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const toggleGroupSelection = (groupRisks: RiskRow[], checked: boolean) => {
    const groupIds = groupRisks.map(r => r.id);
    if (checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...groupIds])));
    } else {
      setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)));
    }
  };

  const toggleProcess = (processName: string) => {
    setCollapsedProcesses(prev => {
      const next = new Set(prev);
      if (next.has(processName)) {
        next.delete(processName);
      } else {
        next.add(processName);
      }
      return next;
    });
  };

  const exportColumns = [
    { key: 'title', label: 'Risk' },
    { key: 'processName', label: 'Process' },
    { key: 'owner', label: 'Risk Owner' },
    { key: 'createdByName', label: 'Created By' },
    { key: 'likelihoodLabel', label: 'Likelihood' },
    { key: 'severityLabel', label: 'Impact / Severity' },
    { key: 'rating', label: 'Risk Rating' },
    { key: 'mitigation', label: 'Mitigation / Response' },
    { key: 'actionStatus', label: 'Action Status' }
  ];

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleDelete = async () => {
    if (!riskToDelete) return;
    try {
      await submitForApproval(supabase, {
        entityType: "risk",
        entityId: riskToDelete.id,
        departmentId: employee?.department_id || "",
        requestedBy: employee?.id || "",
        payload: {
          id: riskToDelete.id,
          custom_metadata: {
            change_type: "DELETE",
            riskTitle: riskToDelete.title,
            author_id: employee?.id,
          },
        },
      });
      toast.success(`Deletion request for "${riskToDelete.title}" submitted for approval.`);
    } catch (err: any) {
      toast.error(`Delete request failed: ${err.message}`);
    }
    setRiskToDelete(null);
  };

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] flex flex-col p-4 md:p-6 overflow-hidden w-full max-w-[1600px] mx-auto relative">
      {/* ── Fixed Top Controls (Stationary) ── */}
      <div className="shrink-0 space-y-3 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Warning className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Risks</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {departmentFilter !== null && (
              <DepartmentFilter 
                value={departmentFilter} 
                onChange={(val) => setDepartmentFilter(val)} 
              />
            )}
            <Select value={activeQuarter} onValueChange={(v) => v && setActiveQuarter(v)}>
              <SelectTrigger className="w-[85px] h-9 text-sm bg-muted dark:bg-zinc-900 border-border dark:border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["ALL", "Q1", "Q2", "Q3", "Q4"].map((q) => (
                  <SelectItem key={q} value={q}>{q === "ALL" ? "All Qs" : q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeYear} onValueChange={(v) => v && setActiveYear(v)}>
              <SelectTrigger className="w-[95px] h-9 text-sm bg-muted dark:bg-zinc-900 border-border dark:border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Years</SelectItem>
                {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="bg-primary hover:bg-primary/90 text-white gap-2 h-9"
              onClick={() => router.push("/department/risks/new")}
            >
              <Plus className="h-4 w-4" />
              Log Risk
            </Button>
          </div>
        </div>

        {(() => {
          const totalActive = data.filter(d => d.isActive).length;
          const highCritical = data.filter(d => d.isActive && (d.rating === "High" || d.rating === "Critical")).length;
          const requiringAction = data.filter(d => d.isActive && d.requiresAction).length;

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Total Active Risks */}
              <Card 
                size="sm"
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setStatusFilter(statusFilter === "Active" ? "ALL" : "Active")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Total Active Risks</CardTitle>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">Count of all currently open risks in the register.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold">{totalActive}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Active registered risks</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="font-normal text-[10px] bg-primary/5 text-primary border-primary/20 hover:bg-primary/5">
                      {totalActive} Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: High / Critical Risks */}
              <Card 
                size="sm"
                className={`cursor-pointer transition-shadow hover:shadow-md ${highCritical > 0 ? "bg-rose-50/30 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20" : ""}`}
                onClick={() => setStatusFilter(statusFilter === "Critical" ? "ALL" : "Critical")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                  <CardTitle className={`text-xs font-medium ${highCritical > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-muted-foreground'}`}>High / Critical Risks</CardTitle>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">Count of active risks where Risk Rating is High or Critical.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={`text-xl font-bold ${highCritical > 0 ? 'text-rose-700 dark:text-rose-400' : ''}`}>
                    {highCritical}
                  </div>
                  <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                    Require management attention
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className={`font-normal text-[10px] ${highCritical > 0 ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800' : 'bg-muted text-muted-foreground border-border'} hover:bg-rose-50 dark:hover:bg-rose-950/40`}>
                      {highCritical} High / Critical
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Risks Requiring Action */}
              <Card 
                size="sm"
                className={`cursor-pointer transition-shadow hover:shadow-md ${requiringAction > 0 ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/20" : ""}`}
                onClick={() => setStatusFilter(statusFilter === "Requiring Action" ? "ALL" : "Requiring Action")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                  <CardTitle className={`text-xs font-medium ${requiringAction > 0 ? 'text-amber-700 dark:text-amber-500' : 'text-muted-foreground'}`}>Risks Requiring Action</CardTitle>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">Count of active risks with pending or overdue mitigation actions.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={`text-xl font-bold ${requiringAction > 0 ? 'text-amber-700 dark:text-amber-500' : ''}`}>
                    {requiringAction}
                  </div>
                  <p className="text-[11px] text-amber-600/80 dark:text-amber-500/80 mt-0.5">
                    Pending or overdue mitigation
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className={`font-normal text-[10px] ${requiringAction > 0 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' : 'bg-muted text-muted-foreground border-border'} hover:bg-amber-50 dark:hover:bg-amber-950/40`}>
                      {requiringAction} Requiring Action
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* ── Search & Filter Controls ── */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          <div className="flex items-center gap-2 w-full max-w-sm relative">
            <MagnifyingGlass className="absolute left-3 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search risks, owners, mitigation..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full h-9 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <Funnel className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Filter</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Risk Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Risks</SelectItem>
                <SelectItem value="Active">Active Only</SelectItem>
                <SelectItem value="Critical">High / Critical</SelectItem>
                <SelectItem value="Requiring Action">Requiring Action</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Ratings</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <BulkExportToolbar 
          selectedIds={selectedIds} 
          data={sortedData} 
          columns={exportColumns} 
          filename="risks_export" 
          onClearSelection={() => setSelectedIds([])} 
        />
      </div>

      {/* ── Risk Register Table Grouped by Process (Fills Remaining Viewport) ── */}
      <ScrollableTableWrapper className="flex-1 min-h-0">
        <Table className="min-w-full" containerClassName="overflow-visible">
          <TableHeader className="bg-slate-100 dark:bg-zinc-900 sticky top-0 z-20 border-b shadow-xs [&_th]:bg-slate-100 dark:[&_th]:bg-zinc-900">
            <TableRow>
              {/* 1. Selection checkbox */}
              <TableHead className="w-12 h-10 px-4">
                <Checkbox 
                  checked={sortedData.length > 0 && selectedIds.length === sortedData.length} 
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>

              {/* 2. Risk */}
              <TableHead className="h-10 cursor-pointer min-w-[240px]" onClick={() => handleSort('title')}>
                <div className="flex items-center gap-1 font-semibold">Risk {sortKey === 'title' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 3. Risk Owner */}
              <TableHead className="h-10 cursor-pointer min-w-[130px]" onClick={() => handleSort('owner')}>
                <div className="flex items-center gap-1 font-semibold">Risk Owner {sortKey === 'owner' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 4. Created By */}
              <TableHead className="h-10 cursor-pointer min-w-[140px]" onClick={() => handleSort('createdByName')}>
                <div className="flex items-center gap-1 font-semibold">Created By {sortKey === 'createdByName' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 5. Likelihood */}
              <TableHead className="h-10 cursor-pointer min-w-[130px]" onClick={() => handleSort('likelihood')}>
                <div className="flex items-center gap-1 font-semibold">Likelihood {sortKey === 'likelihood' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 6. Impact / Severity */}
              <TableHead className="h-10 cursor-pointer min-w-[140px]" onClick={() => handleSort('severity')}>
                <div className="flex items-center gap-1 font-semibold">Impact / Severity {sortKey === 'severity' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 7. Risk Rating */}
              <TableHead className="h-10 cursor-pointer min-w-[130px]" onClick={() => handleSort('riskScore')}>
                <div className="flex items-center gap-1 font-semibold">Risk Rating {sortKey === 'riskScore' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 8. Mitigation / Response */}
              <TableHead className="h-10 min-w-[160px] font-semibold">Mitigation / Response</TableHead>

              {/* 9. Action Status */}
              <TableHead className="h-10 cursor-pointer min-w-[120px]" onClick={() => handleSort('actionStatus')}>
                <div className="flex items-center gap-1 font-semibold">Action Status {sortKey === 'actionStatus' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 10. Action */}
              <TableHead className="h-10 w-[90px] text-right pr-4 font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={10} rows={3} />
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-48 text-center text-muted-foreground">
                  No risks found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              Array.from(processGroups.entries()).map(([processName, groupRisks]) => {
                const isCollapsed = collapsedProcesses.has(processName);
                const groupIds = groupRisks.map(r => r.id);
                const selectedInGroup = groupIds.filter(id => selectedIds.includes(id)).length;
                const isGroupAllSelected = groupIds.length > 0 && selectedInGroup === groupIds.length;
                const isGroupPartiallySelected = selectedInGroup > 0 && selectedInGroup < groupIds.length;

                return [
                  /* ── Process Group Header Row (Toggle & Group Checkbox) ── */
                  <TableRow
                    key={`group-${processName}`}
                    className="bg-slate-200/90 dark:bg-zinc-800/90 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer select-none border-t border-b transition-colors sticky top-[40px] z-10 backdrop-blur shadow-xs [&_td]:bg-slate-200/90 dark:[&_td]:bg-zinc-800/90"
                    onClick={() => toggleProcess(processName)}
                  >
                    <TableCell colSpan={10} className="py-2.5 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={isGroupAllSelected ? true : isGroupPartiallySelected ? "indeterminate" : false}
                              onCheckedChange={(checked) => toggleGroupSelection(groupRisks, !!checked)}
                              aria-label={`Select all risks in ${processName}`}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <CaretRight className="h-4 w-4 text-foreground/70" />
                            ) : (
                              <CaretDown className="h-4 w-4 text-foreground/70" />
                            )}
                            <span className="text-xs font-bold tracking-wide uppercase text-foreground">
                              {processName}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal">
                              ({groupRisks.length} {groupRisks.length === 1 ? "risk" : "risks"})
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>,

                  /* ── Individual Risk Rows (Child Rows under Process Group) ── */
                  ...(!isCollapsed ? groupRisks.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => router.push(`/department/risks/${row.id}`)}
                      className="hover:bg-muted/50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors"
                    >
                      {/* 1. Selection checkbox */}
                      <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedIds.includes(row.id)} 
                          onCheckedChange={(checked) => toggleOne(row.id, checked as boolean)}
                          aria-label="Select row"
                        />
                      </TableCell>

                      {/* 2. Risk */}
                      <TableCell className="font-medium max-w-[260px]">
                        <span className="truncate block" title={row.title}>
                          {row.title}
                        </span>
                      </TableCell>

                      {/* 3. Risk Owner */}
                      <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate" title={row.owner}>
                        {row.owner}
                      </TableCell>

                      {/* 4. Created By */}
                      <TableCell className="text-xs whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-[10px] shrink-0">
                            {row.createdByInitials}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{row.createdByName}</span>
                        </div>
                      </TableCell>

                      {/* 5. Likelihood */}
                      <TableCell className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                        {row.likelihoodLabel}
                      </TableCell>

                      {/* 5. Impact / Severity */}
                      <TableCell className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                        {row.severityLabel}
                      </TableCell>

                      {/* 6. Risk Rating */}
                      <TableCell className="whitespace-nowrap">
                        <RatingBadge rating={row.rating} score={row.riskScore} />
                      </TableCell>

                      {/* 7. Mitigation / Response */}
                      <TableCell className="text-xs max-w-[180px]">
                        {row.mitigation === "Not defined" ? (
                          <span className="text-muted-foreground">Not defined</span>
                        ) : (
                          <span className="truncate block font-medium" title={row.mitigation}>
                            {row.mitigation}
                          </span>
                        )}
                      </TableCell>

                      {/* 8. Action Status */}
                      <TableCell className="whitespace-nowrap">
                        <ActionStatusBadge status={row.actionStatus} />
                      </TableCell>

                      {/* 9. Action */}
                      <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2.5 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => router.push(`/department/risks/${row.id}`)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Risk"
                            onClick={() => setRiskToDelete(row)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : [])
                ];
              })
            )}
          </TableBody>
        </Table>
      </ScrollableTableWrapper>

      {/* ── Custom Delete Alert Dialog ── */}
      {riskToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold tracking-tight mb-2">Are you sure?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete <strong className="text-slate-900 dark:text-slate-100">{riskToDelete.title}</strong> from the risk register. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setRiskToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete Risk
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
