"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { DownloadSimple, FileCsv, FilePdf, FileXls, X } from "@phosphor-icons/react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export interface ExportColumn {
  key: string
  label: string
}

interface BulkExportToolbarProps {
  selectedIds: string[]
  data: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  columns: ExportColumn[]
  filename?: string
  onClearSelection: () => void
}

export function BulkExportToolbar({
  selectedIds,
  data,
  columns,
  filename = "export",
  onClearSelection
}: BulkExportToolbarProps) {
  if (selectedIds.length === 0) return null

  const itemsToExport = data.filter(d => selectedIds.includes(d.id))

  const escapeCSV = (str: string) => {
    if (str === null || str === undefined) return '""'
    const s = String(str).replace(/"/g, '""')
    return `"${s}"`
  }

  const handleExportCSV = () => {
    const headers = columns.map(c => escapeCSV(c.label)).join(',')
    const rows = itemsToExport.map(item => 
      columns.map(c => escapeCSV(item[c.key])).join(',')
    ).join('\n')
    
    const csvContent = headers + '\n' + rows
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `${filename}.csv`)
  }

  const handleExportExcel = () => {
    // Generate a simple HTML table for Excel
    const headers = columns.map(c => `<th>${escapeCSV(c.label)}</th>`).join('')
    const rows = itemsToExport.map(item => 
      `<tr>${columns.map(c => `<td>${escapeCSV(item[c.key])}</td>`).join('')}</tr>`
    ).join('')
    
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body><table border="1"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></body>
      </html>
    `
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' })
    downloadBlob(blob, `${filename}.xls`)
  }

  const handleExportPDF = () => {
    // Basic print window for PDF generation
    const headers = columns.map(c => `<th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">${escapeCSV(c.label)}</th>`).join('')
    const rows = itemsToExport.map(item => 
      `<tr>${columns.map(c => `<td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeCSV(item[c.key])}</td>`).join('')}</tr>`
    ).join('')
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              h1 { font-size: 20px; }
            </style>
          </head>
          <body>
            <h1>${filename.replace(/_/g, ' ').toUpperCase()}</h1>
            <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
          </body>
        </html>
      `)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', name)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-zinc-950 border border-border shadow-xl rounded-full px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {selectedIds.length}
        </span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">selected</span>
      </div>
      
      <div className="h-6 w-px bg-border mx-1" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8 rounded-full">
            <DownloadSimple className="h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-40 rounded-xl">
          <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
            <FileCsv className="h-4 w-4" /> CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
            <FileXls className="h-4 w-4" /> Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
            <FilePdf className="h-4 w-4" /> PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={onClearSelection}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
