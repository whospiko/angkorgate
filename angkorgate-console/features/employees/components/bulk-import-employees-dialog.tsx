"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RiUploadCloud2Line, RiLoader4Line, RiCheckLine } from "@remixicon/react"
import { importEmployeesBulkAction } from "../server/employees-actions"
import type {
  CreateEmployeeInput,
  EmployeeBulkImportResult,
  EmployeeGender,
  EmploymentType,
} from "../types/employees.types"

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseEmployeesCsv(raw: string): CreateEmployeeInput[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const firstCells = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const hasHeader = firstCells.includes("fullname") || firstCells.includes("full_name")
  const dataLines = hasHeader ? lines.slice(1) : lines
  const headers = hasHeader
    ? firstCells
    : ["fullname", "employeecode", "employmenttype", "gender", "dateofbirth", "phone", "hiredate"]

  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h))
  const iName = idx(["fullname", "full_name"])
  const iCode = idx(["employeecode", "employee_code", "code"])
  const iType = idx(["employmenttype", "employment_type"])
  const iGender = idx(["gender"])
  const iDob = idx(["dateofbirth", "date_of_birth", "dob"])
  const iPhone = idx(["phone"])
  const iHire = idx(["hiredate", "hire_date"])
  const iNationalId = idx(["nationalid", "national_id"])
  const iAddress = idx(["address"])

  return dataLines
    .map((line): CreateEmployeeInput | null => {
      const cols = parseCsvLine(line)
      const fullName = iName >= 0 ? cols[iName] : cols[0]
      if (!fullName) return null

      const rawType = (iType >= 0 ? cols[iType] : "FULL_TIME").toUpperCase()
      const employmentType: EmploymentType =
        rawType === "FULL_TIME" ||
        rawType === "PART_TIME" ||
        rawType === "CONTRACTOR" ||
        rawType === "INTERN"
          ? rawType
          : "FULL_TIME"

      const rawGender = (iGender >= 0 ? cols[iGender] : "").toUpperCase()
      const gender: EmployeeGender | undefined =
        rawGender === "MALE" || rawGender === "FEMALE" || rawGender === "OTHER"
          ? rawGender
          : undefined

      return {
        fullName,
        employeeCode: iCode >= 0 ? cols[iCode] || undefined : undefined,
        employmentType,
        gender,
        dateOfBirth: iDob >= 0 ? cols[iDob] || undefined : undefined,
        phone: iPhone >= 0 ? cols[iPhone] || undefined : undefined,
        hireDate: iHire >= 0 ? cols[iHire] || undefined : undefined,
        nationalId: iNationalId >= 0 ? cols[iNationalId] || undefined : undefined,
        address: iAddress >= 0 ? cols[iAddress] || undefined : undefined,
      }
    })
    .filter((row): row is CreateEmployeeInput => row !== null)
}

export function BulkImportEmployeesDialog() {
  const [open, setOpen] = useState(false)
  const [csvText, setCsvText] = useState("")
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EmployeeBulkImportResult | null>(null)

  const parsedRows = parseEmployeesCsv(csvText)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    setResult(null)
    setError(null)
  }

  const handleImport = async () => {
    setError(null)
    setResult(null)
    if (parsedRows.length === 0) {
      setError("Provide at least one valid CSV row with a fullName.")
      return
    }
    setLoading(true)
    const res = await importEmployeesBulkAction(parsedRows, skipDuplicates)
    setLoading(false)
    if (res.success && res.data) {
      setResult(res.data)
    } else {
      setError(res.message || "Bulk import failed")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="font-mono text-xs">
            <RiUploadCloud2Line className="mr-1.5 size-4" /> Import CSV
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Bulk Import Employees</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Upload or paste CSV rows with columns: fullName, employeeCode, employmentType, gender, dateOfBirth, phone, hireDate.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
            {error}
          </div>
        )}

        {result && (
          <div className="font-mono text-xs bg-emerald-500/10 text-emerald-500 p-3 rounded-md border border-emerald-500/20 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <RiCheckLine className="size-4" />
              Import Complete
            </div>
            <div>
              Created: {result.createdCount} · Skipped duplicates: {result.skippedCount} · Errors: {result.errorCount}
            </div>
          </div>
        )}

        <div className="grid gap-3 py-2 font-mono text-xs">
          <div className="grid gap-1.5">
            <Label htmlFor="emp-csv-upload">Upload .csv File</Label>
            <input
              id="emp-csv-upload"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:font-mono file:text-xs file:text-foreground"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="emp-csv-textarea">Or Paste CSV Content ({parsedRows.length} rows detected)</Label>
            <textarea
              id="emp-csv-textarea"
              rows={6}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value)
                setResult(null)
              }}
              placeholder={"fullName,employeeCode,employmentType,phone,hireDate\nSovannarith Lim,,FULL_TIME,+85512444555,2026-12-01"}
              className="w-full rounded-md border border-input bg-background/90 dark:bg-black/25 p-2.5 font-mono text-xs text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="rounded border-input"
            />
            Skip rows matching existing employeeCode or phone
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="font-mono text-xs"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={loading || parsedRows.length === 0}
            className="font-mono text-xs"
          >
            {loading ? (
              <>
                <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${parsedRows.length} Row${parsedRows.length === 1 ? "" : "s"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
