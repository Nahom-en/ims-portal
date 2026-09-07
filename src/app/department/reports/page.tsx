"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Download,
  Printer,
  Lock,
  FileBarChart,
  Calendar,
  User,
  ArrowRight
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import SlideOutSheet from "@/components/shared/SlideOutSheet"
import ReportForm from "@/components/forms/ReportForm"

// ── Types ──

export type ReportStatus = "Draft" | "Published"

export interface ReportData {
  id: string
  title: string
  period: string
  publishedAt: string | null
  author: string
  status: ReportStatus
}

// ── Mock Data ──

const initialReports: ReportData[] = [
  {
    id: "rep-2025-q4",
    title: "Q4 2025 Departmental Review",
    period: "Q4 2025",
    publishedAt: "Jan 12, 2026",
    author: "Nahom (Frontend Lead)",
    status: "Published",
  },
  {
    id: "rep-2025-q3",
    title: "Q3 2025 Departmental Review",
    period: "Q3 2025",
    publishedAt: "Oct 08, 2025",
    author: "Nahom (Frontend Lead)",
    status: "Published",
  },
  {
    id: "rep-2025-q2",
    title: "Q2 2025 Departmental Review",
    period: "Q2 2025",
    publishedAt: "Jul 10, 2025",
    author: "Nahom (Frontend Lead)",
    status: "Published",
  },
]

// ── Status Badge ──

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  if (status === "Published") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 gap-1.5 px-2.5 py-0.5">
        <Lock className="h-3 w-3" />
        Published
      </Badge>
    )
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400 gap-1.5 px-2.5 py-0.5">
      <FileText className="h-3 w-3" />
      Draft
    </Badge>
  )
}

// ── Page Component ──

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportData[]>(initialReports)

  // Current active reporting period (simulated)
  const currentPeriod = "Q1 2026"

  const handleDownload = (title: string) => {
    toast.success(`Downloading "${title}" as PDF...`)
  }

  const handlePrint = (title: string) => {
    toast.info(`Preparing "${title}" for printing...`)
  }

  const [isDraftSheetOpen, setIsDraftSheetOpen] = useState(false)
  const [draftSummary, setDraftSummary] = useState("")

  const handleDraft = () => {
    setIsDraftSheetOpen(true)
  }

  const handleSaveDraft = (summary: string) => {
    setDraftSummary(summary)
    toast.success("Draft saved successfully.")
    setIsDraftSheetOpen(false)
  }

  const handlePublish = () => {
    // Add the new report to the archived list
    const newReport: ReportData = {
      id: `rep-${Date.now()}`,
      title: `${currentPeriod} Departmental Review`,
      period: currentPeriod,
      publishedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      author: "Nahom (Frontend Lead)",
      status: "Published",
    }
    setReports([newReport, ...reports])
    setIsDraftSheetOpen(false)
    toast.success(`${newReport.title} has been officially published and locked.`)
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-8 w-full max-w-[1600px] mx-auto relative">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-indigo-600 dark:text-indigo-500" />
          <h1 className="text-2xl font-bold tracking-tight">Compliance & Audit Reports</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Generate, review, and export formal quarterly reports for the IMS audit trail.
        </p>
      </div>

      {/* ── Active Cycle (Draft) ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Current Cycle</h2>
        <Card className="border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-3">
                  {currentPeriod} Departmental Review
                  <ReportStatusBadge status="Draft" />
                </CardTitle>
                <CardDescription>
                  Compile your objectives, KPI actuals, and risk register into a finalized report.
                </CardDescription>
              </div>
              <Button 
                onClick={handleDraft}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Draft Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500/70" />
                Due: April 15, 2026
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500/70" />
                Author: Nahom (Frontend Lead)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Archived Reports Table ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Archived Reports</h2>
        <div className="rounded-md border bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="h-10 pl-6">Report Title</TableHead>
                <TableHead className="h-10">Period</TableHead>
                <TableHead className="h-10">Published Date</TableHead>
                <TableHead className="h-10">Author</TableHead>
                <TableHead className="h-10">Status</TableHead>
                <TableHead className="h-10 text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <TableCell className="font-medium pl-6">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      {report.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.period}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.publishedAt || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.author}
                  </TableCell>
                  <TableCell>
                    <ReportStatusBadge status={report.status} />
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        onClick={() => handleDownload(report.title)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        title="Print Report"
                        onClick={() => handlePrint(report.title)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Slide-Out Draft Sheet ── */}
      <SlideOutSheet
        title={`${currentPeriod} Executive Summary`}
        description="Review auto-generated snapshots and provide a narrative overview before publishing."
        isOpen={isDraftSheetOpen}
        onClose={() => setIsDraftSheetOpen(false)}
      >
        <ReportForm
          period={currentPeriod}
          initialSummary={draftSummary}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          onCancel={() => setIsDraftSheetOpen(false)}
        />
      </SlideOutSheet>
    </div>
  )
}
