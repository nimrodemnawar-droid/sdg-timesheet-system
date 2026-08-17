import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Database, Download, FileUp, ShieldCheck, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

function downloadTextFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatCounts(counts: Record<string, number> | undefined) {
  if (!counts) return "No records counted";
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([table, count]) => `${table}: ${count}`)
    .join(" • ") || "No records found";
}

export function DataManagementTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupJson, setBackupJson] = useState("");
  const [backupFileName, setBackupFileName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [preview, setPreview] = useState<{ generatedAt: string; totalRecords: number; recordCounts: Record<string, number> } | null>(null);
  const [attendanceStartDate, setAttendanceStartDate] = useState("");
  const [attendanceEndDate, setAttendanceEndDate] = useState("");

  const exportDatabase = trpc.dataManagement.exportDatabase.useMutation();
  const exportCsv = trpc.dataManagement.exportCsv.useMutation();
  const previewRestore = trpc.dataManagement.previewRestore.useMutation();
  const restore = trpc.dataManagement.restore.useMutation();

  const handleDatabaseExport = async () => {
    try {
      const result = await exportDatabase.mutateAsync();
      downloadTextFile(result.content, result.filename, "application/json;charset=utf-8");
      toast.success(`Database backup downloaded (${result.totalRecords} records)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Database export failed");
    }
  };

  const handleCsvExport = async (type: "staff" | "attendance") => {
    try {
      const result = await exportCsv.mutateAsync({
        type,
        ...(type === "attendance" && attendanceStartDate ? { startDate: new Date(`${attendanceStartDate}T00:00:00`) } : {}),
        ...(type === "attendance" && attendanceEndDate ? { endDate: new Date(`${attendanceEndDate}T23:59:59.999`) } : {}),
      });
      downloadTextFile(result.content, result.filename, "text/csv;charset=utf-8");
      toast.success(`${type === "staff" ? "Staff" : "Attendance"} CSV downloaded (${result.recordCount} records)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV export failed");
    }
  };

  const handleBackupFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Backup files must be 20 MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const content = String(reader.result ?? "");
      setBackupJson(content);
      setBackupFileName(file.name);
      setConfirmation("");
      try {
        const result = await previewRestore.mutateAsync({ backupJson: content });
        setPreview(result);
        toast.success("Backup validated. No data has been changed.");
      } catch (error) {
        setPreview(null);
        toast.error(error instanceof Error ? error.message : "Backup validation failed");
      }
    };
    reader.onerror = () => toast.error("Could not read the backup file");
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!backupJson || !preview) {
      toast.error("Choose and validate a backup file first");
      return;
    }
    if (confirmation !== "RESTORE DATABASE") {
      toast.error("Type RESTORE DATABASE exactly to confirm");
      return;
    }
    try {
      const result = await restore.mutateAsync({ backupJson, confirmation: "RESTORE DATABASE" });
      setConfirmation("");
      toast.success(`Restore completed: ${result.totalRecords} records merged safely`);
      if (result.preRestoreBackupUrl) window.open(result.preRestoreBackupUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed; no changes may have been applied");
    }
  };

  const isExporting = exportDatabase.isPending || exportCsv.isPending;

  return (
    <div className="space-y-6">
      <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-950/70 to-slate-900">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white"><Database className="h-5 w-5 text-indigo-300" />Data Management & Backups</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-slate-300">Download a point-in-time database backup, export staff or attendance CSV files, and validate a backup before restoring it.</CardDescription>
            </div>
            <Badge className="w-fit bg-emerald-500/20 text-emerald-200"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Admin only</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" />Backups are fixed point-in-time snapshots. Restore uses a non-destructive upsert and never deletes records. A pre-restore backup is created automatically.</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-slate-700 bg-slate-900/70">
          <CardHeader><CardTitle className="text-base text-white">Full database backup</CardTitle><CardDescription className="text-slate-400">Includes staff, attendance, leave, GPS, reports, audit logs, and configuration tables.</CardDescription></CardHeader>
          <CardContent><Button type="button" onClick={handleDatabaseExport} disabled={isExporting} className="w-full bg-indigo-600 hover:bg-indigo-700"><Download className="mr-2 h-4 w-4" />{exportDatabase.isPending ? "Preparing backup…" : "Download database backup"}</Button></CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/70">
          <CardHeader><CardTitle className="text-base text-white">Staff CSV</CardTitle><CardDescription className="text-slate-400">Export staff identity, role, department, status, and sign-in fields.</CardDescription></CardHeader>
          <CardContent><Button type="button" onClick={() => handleCsvExport("staff")} disabled={isExporting} className="w-full bg-blue-600 hover:bg-blue-700"><Download className="mr-2 h-4 w-4" />Download staff CSV</Button></CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900/70">
          <CardHeader><CardTitle className="text-base text-white">Attendance CSV</CardTitle><CardDescription className="text-slate-400">Export check-in/out, GPS, hours, overtime, modality, and approval fields.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Input type="date" value={attendanceStartDate} onChange={(event) => setAttendanceStartDate(event.target.value)} className="border-slate-700 bg-slate-800 text-white" aria-label="Attendance start date" /><Input type="date" value={attendanceEndDate} onChange={(event) => setAttendanceEndDate(event.target.value)} className="border-slate-700 bg-slate-800 text-white" aria-label="Attendance end date" /></div>
            <Button type="button" onClick={() => handleCsvExport("attendance")} disabled={isExporting} className="w-full bg-cyan-600 hover:bg-cyan-700"><Download className="mr-2 h-4 w-4" />Download attendance CSV</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-500/30 bg-slate-900/70">
        <CardHeader><CardTitle className="flex items-center gap-2 text-white"><FileUp className="h-5 w-5 text-red-300" />Restore from backup file</CardTitle><CardDescription className="text-slate-400">Upload a JSON backup created by this system. The file is validated before any data operation.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => handleBackupFile(event.target.files?.[0])} />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={previewRestore.isPending || restore.isPending} className="border-slate-600 text-slate-200"><FileUp className="mr-2 h-4 w-4" />{previewRestore.isPending ? "Validating…" : "Choose backup JSON"}</Button>
          {backupFileName && <p className="text-sm text-slate-300">Selected: <span className="font-medium text-white">{backupFileName}</span></p>}
          {preview && <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-100"><CheckCircle2 className="mr-2 inline h-4 w-4" />Validated backup from {new Date(preview.generatedAt).toLocaleString()} with {preview.totalRecords} records.<p className="mt-2 break-words text-xs text-emerald-200/80">{formatCounts(preview.recordCounts)}</p></div>}
          <div className="space-y-2"><label htmlFor="restore-confirmation" className="text-sm font-medium text-slate-300">Type <span className="font-mono text-red-300">RESTORE DATABASE</span> to confirm</label><Input id="restore-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={!preview || restore.isPending} placeholder="RESTORE DATABASE" className="border-slate-700 bg-slate-800 text-white" /></div>
          <Button type="button" onClick={handleRestore} disabled={!preview || confirmation !== "RESTORE DATABASE" || restore.isPending} className="w-full bg-red-600 hover:bg-red-700 sm:w-auto"><ShieldCheck className="mr-2 h-4 w-4" />{restore.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Restoring safely…</> : "Restore validated backup"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
