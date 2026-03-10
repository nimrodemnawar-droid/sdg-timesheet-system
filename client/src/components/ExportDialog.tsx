import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, Sheet } from "lucide-react";
import { toast } from "sonner";

interface ExportDialogProps {
  reportType: "attendance" | "overtime" | "leave";
  onExport?: (data: {
    format: "csv" | "pdf";
    startDate: string;
    endDate: string;
  }) => void;
}

export function ExportDialog({ reportType, onExport }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(false);

  const reportLabels = {
    attendance: "Attendance",
    overtime: "Overtime",
    leave: "Leave",
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsLoading(true);
    try {
      onExport?.({
        format,
        startDate,
        endDate,
      });

      toast.success(
        `${reportLabels[reportType]} report exported as ${format.toUpperCase()}`
      );
      setOpen(false);
    } catch (error) {
      toast.error("Failed to export report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export {reportLabels[reportType]}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export {reportLabels[reportType]} Report</DialogTitle>
          <DialogDescription>
            Select the date range and format for your report export.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="format">Export Format</Label>
            <Select value={format} onValueChange={(v: any) => setFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Sheet className="h-4 w-4" />
                    CSV (Spreadsheet)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF (Document)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            <p>
              <strong>Note:</strong> The report will be encrypted and uploaded
              to secure cloud storage. You'll receive a download link via email.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isLoading}>
            {isLoading ? "Exporting..." : "Export Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
