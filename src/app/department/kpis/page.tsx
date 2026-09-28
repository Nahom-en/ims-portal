/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ScrollableTableWrapper } from "@/components/shared/ScrollableTableWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash, CaretUp, CaretDown, CaretRight, Pulse, MagnifyingGlass, Funnel, Info } from "@phosphor-icons/react";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkExportToolbar } from "@/components/shared/BulkExportToolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmployee } from "@/lib/employee-context";
import { DepartmentFilter } from "@/components/shared/DepartmentFilter";
import { submitForApproval } from "@/lib/workflow";

interface KpiRow {
  id: string;
  name: string;
  processName: string;
  responsibility: string;
  target: string;
  actual: string;
  achievementPercentage: string;
  status: "Success" | "Partially Achieved" | "At Risk" | "Off Track" | "Missed" | "Pending";
  isAchieved: boolean;
  justification: string;
}

export default function KPITrackingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employee = useEmployee();
  const [data, setData] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpiToDelete, setKpiToDelete] = useState<KpiRow | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string | 'ALL' | null>(() => employee?.department_id || 'ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "ALL");
  
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

      const { data: rawKpis, error: kpiErr } = await supabase
        .from('kpi_definitions')
        .select(`
          id,
          kpi_name,
          target_value,
          unit,
          custom_metadata,
          processes (
            id,
            process_name,
            department_id
          )
        `);

      if (kpiErr || !rawKpis) {
        console.error("Error fetching KPIs:", kpiErr);
        setLoading(false);
        return;
      }

      let kpis = rawKpis;
      if (departmentFilter !== 'ALL') {
        kpis = kpis.filter((k: any) => {
          const deptId = k.processes?.department_id || k.custom_metadata?.departmentId || k.custom_metadata?.department_id;
          return !deptId || deptId === departmentFilter;
        });
      }

      // Query measurements for the active period
      const periodPattern = activeQuarter === 'ALL' 
        ? (activeYear === 'ALL' ? '%' : `%${activeYear}`)
        : (activeYear === 'ALL' ? `${activeQuarter}%` : `${activeQuarter} ${activeYear}`);

      const { data: cycles } = await supabase
        .from('report_cycles')
        .select('id, reporting_period')
        .like('reporting_period', periodPattern);

      const cycleIds = cycles?.map(c => c.id) || [];

      let measurements: any[] = [];
      if (cycleIds.length > 0 && kpis.length > 0) {
        const kpiIds = kpis.map((k: any) => k.id);
        const { data: mData } = await supabase
          .from('kpi_measurements')
          .select('kpi_id, actual_value, status, justification_for_deviation, report_cycle_id, created_at')
          .in('kpi_id', kpiIds)
          .in('report_cycle_id', cycleIds);
        if (mData) measurements = mData;
      } else if (kpis.length > 0) {
        // Fallback to recent measurements if no report cycle matches
        const kpiIds = kpis.map((k: any) => k.id);
        const { data: mData } = await supabase
          .from('kpi_measurements')
          .select('kpi_id, actual_value, status, justification_for_deviation, report_cycle_id, created_at')
          .in('kpi_id', kpiIds)
          .order('created_at', { ascending: false });
        if (mData) measurements = mData;
      }

      const mapped: KpiRow[] = kpis.map((k: any) => {
        const m = measurements.find((meas: any) => meas.kpi_id === k.id);
        
        // 1. Responsibility
        const responsibility = k.custom_metadata?.responsibility || 
                               k.custom_metadata?.responsibleEntity || 
                               k.custom_metadata?.owner || 
                               "Unassigned";

        // 2. Target formatting
        let targetDisplay = String(k.target_value ?? "").trim();
        const unit = k.unit || k.custom_metadata?.unit || "";
        if (unit && !targetDisplay.toLowerCase().includes(unit.toLowerCase())) {
          targetDisplay = `${targetDisplay} ${unit}`.trim();
        }
        if (!targetDisplay) targetDisplay = "—";

        // 3. Actual formatting
        const rawActual = m?.actual_value ?? k.custom_metadata?.actual ?? null;
        const actualStr = rawActual !== null && rawActual !== undefined ? String(rawActual).trim() : "";
        const hasActual = actualStr !== "" && actualStr !== "-" && actualStr !== "null" && actualStr !== "undefined";
        const actualDisplay = hasActual ? actualStr : "—";

        // 4. Direction & Calculation Numbers
        const parseNum = (val: string) => {
          const cleaned = val.replace(/[^0-9.-]/g, "");
          const num = parseFloat(cleaned);
          return isNaN(num) ? null : num;
        };

        const targetNum = parseNum(k.target_value ?? "");
        const actualNum = hasActual ? parseNum(actualStr) : null;
        const direction = (k.custom_metadata?.direction || k.custom_metadata?.measurement_direction || "").toUpperCase();
        const rawStatus = (m?.status || k.custom_metadata?.status || "").trim();
        const storedPct = m?.achievement_percentage ?? k.custom_metadata?.achievementPercentage ?? null;

        let achievementPct = "—";
        let computedStatus: KpiRow["status"] = "Pending";
        let isAchieved = false;

        if (hasActual) {
          // Determine Achievement %
          if (storedPct !== null && storedPct !== undefined && String(storedPct).trim() !== "") {
            achievementPct = `${String(storedPct).replace('%', '').trim()}%`;
          } else if (actualNum !== null && targetNum !== null && targetNum !== 0) {
            if (direction === "LOWER_IS_BETTER") {
              if (actualNum <= targetNum) {
                achievementPct = "100%";
              } else {
                const ratio = Math.max(0, Math.round((1 - (actualNum - targetNum) / targetNum) * 100));
                achievementPct = `${ratio}%`;
              }
            } else {
              const ratio = Math.max(0, Math.round((actualNum / targetNum) * 100));
              achievementPct = `${ratio}%`;
            }
          } else if (targetNum === 0 && actualNum !== null) {
            achievementPct = actualNum === 0 ? "100%" : "0%";
          }

          // Determine Status
          const statusLower = rawStatus.toLowerCase();
          if (statusLower === "achieved" || statusLower === "success") {
            computedStatus = "Success";
            isAchieved = true;
          } else if (statusLower === "partially achieved" || statusLower === "partial") {
            computedStatus = "Partially Achieved";
          } else if (statusLower === "at risk") {
            computedStatus = "At Risk";
          } else if (statusLower === "off track") {
            computedStatus = "Off Track";
          } else if (statusLower === "missed" || statusLower === "deviated" || statusLower === "below target") {
            computedStatus = "Missed";
          } else {
            // Infer status from numerical performance if status is not explicitly set
            if (targetNum !== null && actualNum !== null) {
              if (direction === "LOWER_IS_BETTER") {
                if (actualNum <= targetNum) {
                  computedStatus = "Success";
                  isAchieved = true;
                } else {
                  computedStatus = "Missed";
                }
              } else if (targetNum === 0) {
                if (actualNum === 0) {
                  computedStatus = "Success";
                  isAchieved = true;
                } else {
                  computedStatus = "Missed";
                }
              } else {
                if (actualNum >= targetNum) {
                  computedStatus = "Success";
                  isAchieved = true;
                } else if (actualNum >= targetNum * 0.8) {
                  computedStatus = "Partially Achieved";
                } else {
                  computedStatus = "Missed";
                }
              }
            } else {
              computedStatus = "Pending";
            }
          }
        } else {
          computedStatus = "Pending";
          achievementPct = "—";
          isAchieved = false;
        }

        // 5. Remark / Justification
        const justification = m?.justification_for_deviation || 
                              k.custom_metadata?.justification || 
                              k.custom_metadata?.remark || 
                              "";
        const remarkDisplay = justification.trim() ? justification.trim() : "—";

        // 6. Process name
        const procName = k.processes?.process_name?.trim() || "Unassigned Process";

        return {
          id: k.id,
          name: k.kpi_name,
          processName: procName,
          responsibility,
          target: targetDisplay,
          actual: actualDisplay,
          achievementPercentage: achievementPct,
          status: computedStatus,
          isAchieved,
          justification: remarkDisplay
        };
      });

      setData(mapped);
      setLoading(false);
    }
    fetchData();
  }, [supabase, employee, departmentFilter, activeQuarter, activeYear]);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Collapsible process groups — all expanded by default
  const [collapsedProcesses, setCollapsedProcesses] = useState<Set<string>>(new Set());

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

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(sortedData.map(d => d.id));
    else setSelectedIds([]);
  };

  const toggleOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const toggleGroupSelection = (groupKpis: KpiRow[], checked: boolean) => {
    const groupIds = groupKpis.map(k => k.id);
    if (checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...groupIds])));
    } else {
      setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)));
    }
  };

  const exportColumns = [
    { key: 'name', label: 'KPI / Metric' },
    { key: 'processName', label: 'Process' },
    { key: 'responsibility', label: 'Responsibility' },
    { key: 'target', label: 'Target' },
    { key: 'actual', label: 'Actual' },
    { key: 'achievementPercentage', label: 'Achievement %' },
    { key: 'status', label: 'Status' },
    { key: 'justification', label: 'Remark / Justification' }
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
    if (!kpiToDelete) return;
    try {
      await submitForApproval(supabase, {
        entityType: "kpi",
        entityId: kpiToDelete.id,
        departmentId: employee?.department_id || "",
        requestedBy: employee?.id || "",
        payload: {
          id: kpiToDelete.id,
          custom_metadata: {
            change_type: "DELETE",
            kpiName: kpiToDelete.name,
            author_id: employee?.id,
          },
        },
      });
      toast.success(`Deletion request for "${kpiToDelete.name}" submitted for approval.`);
    } catch (err: any) {
      toast.error(`Delete request failed: ${err.message}`);
    }
    setKpiToDelete(null);
  };

  // Filter KPI records before grouping
  const filteredData = data.filter(d => {
    if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = 
        d.name.toLowerCase().includes(q) ||
        d.processName.toLowerCase().includes(q) ||
        d.responsibility.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q) ||
        d.justification.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Sort KPI records
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

  // Group KPIs by linked Process
  const processGroups = new Map<string, KpiRow[]>();
  for (const kpi of sortedData) {
    const proc = kpi.processName || "Unassigned Process";
    if (!processGroups.has(proc)) {
      processGroups.set(proc, []);
    }
    processGroups.get(proc)!.push(kpi);
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto relative">
      {/* ── Page Header & Stats ── */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Pulse className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">KPIs</h1>
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
              onClick={() => router.push("/department/kpis/new")}
            >
              <Plus className="h-4 w-4" />
              New KPI
            </Button>
          </div>
        </div>

        {(() => {
          const total = data.length;
          const kpisAchieved = data.filter(d => d.isAchieved).length;
          const achievementRate = total > 0 ? Math.round((kpisAchieved / total) * 100) : 0;

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Total KPIs */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total KPIs</CardTitle>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">Count of all KPI records for the selected reporting period.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{total}</div>
                  <p className="text-xs text-muted-foreground mt-1">For selected period</p>
                  <div className="mt-3">
                    <Badge variant="outline" className="font-normal text-[10px] bg-primary/5 text-primary border-primary/20 hover:bg-primary/5">
                      {total} Total KPIs
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: KPIs Achieved */}
              <Card className="bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">KPIs Achieved</CardTitle>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">Count of KPIs where actual performance meets or exceeds target.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {kpisAchieved}
                  </div>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    {kpisAchieved} of {total} KPIs achieved
                  </p>
                  <div className="mt-3">
                    <Badge variant="outline" className="font-normal text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                      {kpisAchieved} Achieved
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: KPI Achievement Rate */}
              <Card className="bg-blue-50/30 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">KPI Achievement Rate</CardTitle>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help"><Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" /></span>}></TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">KPIs Achieved ÷ Total KPIs × 100</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {achievementRate}%
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-blue-100 dark:bg-blue-950/50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${achievementRate}%` }} />
                  </div>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-2">
                    {kpisAchieved} of {total} KPIs achieved
                  </p>
                </CardContent>
              </Card>
            </div>
          );
        })()}
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mt-2">
        <div className="flex items-center gap-2 w-full max-w-sm relative">
          <MagnifyingGlass className="absolute left-3 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search KPIs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <Funnel className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Filter</span>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="Success">Success</SelectItem>
              <SelectItem value="Partially Achieved">Partially Achieved</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
              <SelectItem value="Off Track">Off Track</SelectItem>
              <SelectItem value="Missed">Missed</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <BulkExportToolbar 
        selectedIds={selectedIds} 
        data={sortedData} 
        columns={exportColumns} 
        filename="kpis_export"
        onClearSelection={() => setSelectedIds([])} 
      />

      {/* ── KPI Table Grouped by Process ── */}
      <ScrollableTableWrapper>
        <Table className="min-w-full">
          <TableHeader className="bg-slate-50 dark:bg-zinc-900/50 sticky top-0 z-10 border-b">
            <TableRow>
              {/* 1. Selection checkbox */}
              <TableHead className="w-12 h-10 px-4">
                <Checkbox 
                  checked={sortedData.length > 0 && selectedIds.length === sortedData.length} 
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>

              {/* 2. KPI / Metric */}
              <TableHead className="h-10 cursor-pointer min-w-[240px]" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1 font-semibold">KPI / Metric {sortKey === 'name' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 3. Responsibility */}
              <TableHead className="h-10 cursor-pointer min-w-[130px]" onClick={() => handleSort('responsibility')}>
                <div className="flex items-center gap-1 font-semibold">Responsibility {sortKey === 'responsibility' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 4. Target */}
              <TableHead className="h-10 cursor-pointer min-w-[100px]" onClick={() => handleSort('target')}>
                <div className="flex items-center gap-1 font-semibold">Target {sortKey === 'target' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 5. Actual */}
              <TableHead className="h-10 cursor-pointer min-w-[100px]" onClick={() => handleSort('actual')}>
                <div className="flex items-center gap-1 font-semibold">Actual {sortKey === 'actual' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 6. Achievement % */}
              <TableHead className="h-10 cursor-pointer min-w-[120px]" onClick={() => handleSort('achievementPercentage')}>
                <div className="flex items-center gap-1 font-semibold">Achievement % {sortKey === 'achievementPercentage' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 7. Status */}
              <TableHead className="h-10 cursor-pointer min-w-[140px]" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1 font-semibold">Status {sortKey === 'status' && (sortDir === 'asc' ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />)}</div>
              </TableHead>

              {/* 8. Remark / Justification */}
              <TableHead className="h-10 min-w-[180px] font-semibold">Remark / Justification</TableHead>

              {/* 9. Action */}
              <TableHead className="h-10 w-[90px] text-right pr-4 font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={9} rows={3} />
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-48 text-center text-muted-foreground">
                  No KPIs found for the selected period.
                </TableCell>
              </TableRow>
            ) : (
              Array.from(processGroups.entries()).map(([processName, groupKpis]) => {
                const isCollapsed = collapsedProcesses.has(processName);
                const groupIds = groupKpis.map(k => k.id);
                const selectedInGroup = groupIds.filter(id => selectedIds.includes(id)).length;
                const isGroupAllSelected = groupIds.length > 0 && selectedInGroup === groupIds.length;
                const isGroupPartiallySelected = selectedInGroup > 0 && selectedInGroup < groupIds.length;

                return [
                  /* ── Process Group Header Row (Toggle & Group Checkbox) ── */
                  <TableRow
                    key={`group-${processName}`}
                    className="bg-muted/80 dark:bg-zinc-900/80 hover:bg-muted dark:hover:bg-zinc-900 cursor-pointer select-none border-t border-b transition-colors"
                    onClick={() => toggleProcess(processName)}
                  >
                    <TableCell colSpan={9} className="py-2.5 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={isGroupAllSelected ? true : isGroupPartiallySelected ? "indeterminate" : false}
                              onCheckedChange={(checked) => toggleGroupSelection(groupKpis, !!checked)}
                              aria-label={`Select all KPIs in ${processName}`}
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
                              ({groupKpis.length} {groupKpis.length === 1 ? "KPI" : "KPIs"})
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>,

                  /* ── Individual KPI Rows (Child Rows under Process Group) ── */
                  ...(!isCollapsed ? groupKpis.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => router.push(`/department/kpis/${row.id}`)}
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

                      {/* 2. KPI / Metric */}
                      <TableCell className="font-medium max-w-[260px]">
                        <span className="truncate block" title={row.name}>
                          {row.name}
                        </span>
                      </TableCell>

                      {/* 3. Responsibility */}
                      <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate" title={row.responsibility}>
                        {row.responsibility}
                      </TableCell>

                      {/* 4. Target */}
                      <TableCell className="text-sm tabular-nums whitespace-nowrap">
                        {row.target}
                      </TableCell>

                      {/* 5. Actual */}
                      <TableCell className="font-semibold text-sm tabular-nums whitespace-nowrap">
                        {row.actual}
                      </TableCell>

                      {/* 6. Achievement % */}
                      <TableCell className="text-sm tabular-nums font-medium whitespace-nowrap">
                        {row.achievementPercentage}
                      </TableCell>

                      {/* 7. Status */}
                      <TableCell className="whitespace-nowrap">
                        {row.status === "Success" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 font-semibold text-xs">
                            Success
                          </Badge>
                        ) : row.status === "Partially Achieved" ? (
                          <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800 font-semibold text-xs">
                            Partially Achieved
                          </Badge>
                        ) : row.status === "At Risk" ? (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-semibold text-xs">
                            At Risk
                          </Badge>
                        ) : row.status === "Off Track" ? (
                          <Badge className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800 font-semibold text-xs">
                            Off Track
                          </Badge>
                        ) : row.status === "Missed" ? (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 font-semibold text-xs">
                            Missed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border font-normal text-xs">
                            Pending
                          </Badge>
                        )}
                      </TableCell>

                      {/* 8. Remark / Justification */}
                      <TableCell className="text-muted-foreground text-xs max-w-[200px]">
                        <span className="truncate block" title={row.justification}>
                          {row.justification}
                        </span>
                      </TableCell>

                      {/* 9. Action */}
                      <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2.5 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => router.push(`/department/kpis/${row.id}`)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete KPI"
                            onClick={() => setKpiToDelete(row)}
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
      {kpiToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold tracking-tight mb-2">Are you sure?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete <strong className="text-slate-900 dark:text-slate-100">{kpiToDelete.name}</strong> and all of its historical measurements. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setKpiToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete KPI
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
