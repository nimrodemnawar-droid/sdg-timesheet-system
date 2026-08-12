import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Calendar, CheckCircle2, AlertCircle, Clock, ShieldCheck, Send, ArrowLeft, Download, Search, SlidersHorizontal, X } from "lucide-react";
import { useLocation } from "wouter";
import { getMonthlyReportMode } from "../../../shared/monthlyReportRole";

interface MonthlyReportsProps {
  mode?: "staff" | "admin";
}

export default function MonthlyReports({ mode = "staff" }: MonthlyReportsProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [selectedMonth, setSelectedMonth] = useState("2026-08-01");
  const reportMode = getMonthlyReportMode(user?.role, mode);
  const isAdmin = reportMode === "admin";

  const [keyActivities, setKeyActivities] = useState("");
  const [challenges, setChallenges] = useState("");
  const [solutions, setSolutions] = useState("");
  const [plannedActivities, setPlannedActivities] = useState("");
  const [supportRequired, setSupportRequired] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  const [confirmationStatement, setConfirmationStatement] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<number | undefined>(undefined);

  // Review and admin search/filter state
  const [reviewingReportId, setReviewingReportId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected" | "correction_required">("approved");
  const [supervisorComments, setSupervisorComments] = useState("");
  const [reportSearchTerm, setReportSearchTerm] = useState("");
  const [reportStartMonth, setReportStartMonth] = useState("");
  const [reportEndMonth, setReportEndMonth] = useState("");
  const [reportReviewStatus, setReportReviewStatus] = useState("all");
  const [reportSubmissionStatus, setReportSubmissionStatus] = useState("all");
  const [exportingFormat, setExportingFormat] = useState<"csv" | "pdf" | null>(null);

  const reportSearchInput = useMemo(() => ({
    searchTerm: reportSearchTerm.trim() || undefined,
    startMonth: reportStartMonth || undefined,
    endMonth: reportEndMonth || undefined,
    reviewStatus: reportReviewStatus,
    submissionStatus: reportSubmissionStatus,
  }), [reportSearchTerm, reportStartMonth, reportEndMonth, reportReviewStatus, reportSubmissionStatus]);

  const { data: myReports = [], refetch: refetchMyReports } = trpc.monthlyReports.getMyReports.useQuery();
  const {
    data: reportSearchResults,
    refetch: refetchAllReports,
    isLoading: reportsLoading,
  } = trpc.monthlyReports.searchAndFilter.useQuery(reportSearchInput, {
    enabled: isAdmin,
  });
  const allReports = reportSearchResults?.reports ?? [];
  const totalReportCount = reportSearchResults?.total ?? allReports.length;
  const pendingReviewCount = allReports.filter((report) => report.reviewStatus === "pending_review").length;
  const approvedReportCount = allReports.filter((report) => report.reviewStatus === "approved").length;
  const needsActionCount = allReports.filter((report) => report.reviewStatus === "rejected" || report.reviewStatus === "correction_required").length;

  const saveDraftMutation = trpc.monthlyReports.saveDraft.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.report && 'id' in data.report) {
        setCurrentReportId(data.report.id as number);
      }
      refetchMyReports();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const submitReportMutation = trpc.monthlyReports.submitReport.useMutation({
    onSuccess: () => {
      toast.success("Monthly report submitted successfully");
      refetchMyReports();
      setKeyActivities("");
      setChallenges("");
      setSolutions("");
      setPlannedActivities("");
      setSupportRequired("");
      setAdditionalComments("");
      setConfirmationStatement(false);
      setCurrentReportId(undefined);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const reviewReportMutation = trpc.monthlyReports.reviewReport.useMutation({
    onSuccess: () => {
      toast.success("Report reviewed successfully");
      refetchAllReports();
      setReviewingReportId(null);
      setSupervisorComments("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const exportReportsMutation = trpc.monthlyReports.exportReports.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success(`${data.reportCount} report${data.reportCount === 1 ? "" : "s"} exported as ${exportingFormat?.toUpperCase()}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
    onSettled: () => setExportingFormat(null),
  });

  const clearReportFilters = () => {
    setReportSearchTerm("");
    setReportStartMonth("");
    setReportEndMonth("");
    setReportReviewStatus("all");
    setReportSubmissionStatus("all");
  };

  const handleExport = (format: "csv" | "pdf", reportId?: number) => {
    setExportingFormat(format);
    exportReportsMutation.mutate({
      format,
      filters: {
        reportId,
        searchTerm: reportId ? undefined : reportSearchTerm.trim() || undefined,
        startMonth: reportId ? undefined : reportStartMonth || undefined,
        endMonth: reportId ? undefined : reportEndMonth || undefined,
        reviewStatus: reportId ? undefined : reportReviewStatus === "all" ? undefined : reportReviewStatus,
      },
    });
  };

  const handleSaveDraft = () => {
    saveDraftMutation.mutate({
      reportingMonth: selectedMonth,
      keyActivities,
      challenges,
      solutions,
      plannedActivities,
      supportRequired,
      additionalComments,
      confirmationStatement,
      reportId: currentReportId,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReportId) {
      toast.error("Please save as draft or create a report first before submitting.");
      return;
    }
    submitReportMutation.mutate({
      reportId: currentReportId,
      keyActivities,
      challenges,
      solutions,
      plannedActivities,
      supportRequired,
      additionalComments,
      confirmationStatement,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate(user?.role === "admin" ? "/admin" : "/dashboard")} className="text-slate-300 border-slate-700 hover:bg-slate-800">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <h1 className="text-2xl font-bold text-blue-400">Monthly Staff Reporting & Submission Control</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Comprehensive monthly performance summary, accountability tracking, and supervisor review workflow.
            </p>
          </div>

          {isAdmin ? (
            <div className="rounded-lg border border-violet-700/60 bg-violet-950/40 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Admin workspace</p>
              <p className="text-sm text-slate-200">Review, decide, and export reports</p>
            </div>
          ) : (
            <div className="rounded-lg border border-blue-700/60 bg-blue-950/40 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Staff workspace</p>
              <p className="text-sm text-slate-200">Submit and track your own report</p>
            </div>
          )}
        </div>

        {!isAdmin ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-blue-300 flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Submit Monthly Activity Report
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Summarize key achievements, challenges encountered, solutions applied, and plans for the upcoming month.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Reporting Month</label>
                      <Input
                        type="date"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Key Activities & Achievements *</label>
                      <Textarea
                        rows={4}
                        placeholder="Describe major accomplishments, field visits, meetings, and milestone outputs achieved during the month..."
                        value={keyActivities}
                        onChange={(e) => setKeyActivities(e.target.value)}
                        required
                        className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Challenges Encountered</label>
                      <Textarea
                        rows={3}
                        placeholder="Detail any operational, logistical, or security challenges faced..."
                        value={challenges}
                        onChange={(e) => setChallenges(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Solutions Applied / Mitigation</label>
                      <Textarea
                        rows={3}
                        placeholder="How were the challenges addressed or mitigated?"
                        value={solutions}
                        onChange={(e) => setSolutions(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Planned Activities for Next Month *</label>
                      <Textarea
                        rows={4}
                        placeholder="Outline key targets, schedules, and deliverables planned for the upcoming month..."
                        value={plannedActivities}
                        onChange={(e) => setPlannedActivities(e.target.value)}
                        required
                        className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Support / Resources Required</label>
                      <Textarea
                        rows={2}
                        placeholder="Specify administrative, technical, or logistical support needed from management..."
                        value={supportRequired}
                        onChange={(e) => setSupportRequired(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Additional Comments / Remarks</label>
                      <Textarea
                        rows={2}
                        placeholder="Any other relevant details..."
                        value={additionalComments}
                        onChange={(e) => setAdditionalComments(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    <div className="flex items-center space-x-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <Checkbox
                        id="confirm"
                        checked={confirmationStatement}
                        onCheckedChange={(checked) => setConfirmationStatement(checked === true)}
                      />
                      <label htmlFor="confirm" className="text-sm text-slate-300 cursor-pointer">
                        I confirm that all activities and statements reported above are accurate and reflect my official work output for this period.
                      </label>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={saveDraftMutation.isPending}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Save Draft
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitReportMutation.isPending || !confirmationStatement}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" /> Submit Report
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* History / Status Column */}
            <div className="space-y-6">
              <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-300 flex items-center gap-2">
                    <Clock className="w-5 h-5" /> Submission History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {myReports.length === 0 ? (
                    <p className="text-slate-400 text-sm">No monthly reports submitted yet.</p>
                  ) : (
                    myReports.map((report) => (
                      <div key={report.id} className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-200">
                            {new Date(report.reportingMonth).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                          </span>
                          <Badge className={
                            report.reviewStatus === "approved" ? "bg-emerald-600" :
                            report.reviewStatus === "rejected" ? "bg-red-600" :
                            report.reviewStatus === "correction_required" ? "bg-amber-600" : "bg-blue-600"
                          }>
                            {report.reviewStatus.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 truncate">Key Activities: {report.keyActivities}</p>
                        {report.supervisorComments && (
                          <div className="bg-slate-900 p-2 rounded text-xs text-slate-300 border border-slate-700">
                            <span className="font-semibold text-blue-400">Supervisor:</span> {report.supervisorComments}
                          </div>
                        )}
                        <div className="flex justify-end pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentReportId(report.id);
                              setKeyActivities(report.keyActivities || "");
                              setChallenges(report.challenges || "");
                              setSolutions(report.solutions || "");
                              setPlannedActivities(report.plannedActivities || "");
                              setSupportRequired(report.supportRequired || "");
                              setAdditionalComments(report.additionalComments || "");
                              setConfirmationStatement(report.confirmationStatement);
                            }}
                            className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            Load / Edit
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-violet-800/60 bg-gradient-to-r from-violet-950/70 via-slate-900 to-slate-900 p-5 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Admin control center</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">Monthly report review queue</h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-400">Start with reports needing a decision, then use the table actions to review or export. Staff members cannot see this workspace or its exports.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => setReportReviewStatus("pending_review")} className="bg-violet-600 hover:bg-violet-700 text-white">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Review queue ({pendingReviewCount})
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setReportReviewStatus("all")} className="border-slate-600 text-slate-300 hover:bg-slate-800">
                    View all ({totalReportCount})
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button type="button" onClick={() => setReportReviewStatus("pending_review")} className="rounded-xl border border-violet-800/70 bg-violet-950/30 p-4 text-left hover:bg-violet-950/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                <p className="text-xs uppercase tracking-wide text-violet-300">Needs review</p>
                <p className="mt-1 text-2xl font-bold text-white">{pendingReviewCount}</p>
                <p className="text-xs text-slate-400">Awaiting admin decision</p>
              </button>
              <button type="button" onClick={() => setReportReviewStatus("approved")} className="rounded-xl border border-emerald-800/70 bg-emerald-950/30 p-4 text-left hover:bg-emerald-950/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                <p className="text-xs uppercase tracking-wide text-emerald-300">Approved</p>
                <p className="mt-1 text-2xl font-bold text-white">{approvedReportCount}</p>
                <p className="text-xs text-slate-400">Ready for export</p>
              </button>
              <button type="button" onClick={() => setReportReviewStatus("correction_required")} className="rounded-xl border border-amber-800/70 bg-amber-950/30 p-4 text-left hover:bg-amber-950/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                <p className="text-xs uppercase tracking-wide text-amber-300">Needs action</p>
                <p className="mt-1 text-2xl font-bold text-white">{needsActionCount}</p>
                <p className="text-xs text-slate-400">Returned or correction requested</p>
              </button>
            </div>

          <Card className="bg-slate-900 border-slate-800 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-blue-300 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Admin Review & Submission Control
              </CardTitle>
              <CardDescription className="text-slate-400">
                Review submitted monthly reports across staff members. Approve, reject, or request corrections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/15 p-2 text-blue-300">
                        <SlidersHorizontal className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">Search and filter reports</p>
                        <p className="text-xs text-slate-400">
                          Showing {allReports.length} of {totalReportCount} report{totalReportCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={clearReportFilters}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <X className="w-4 h-4 mr-2" /> Clear filters
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    <div className="relative md:col-span-2 xl:col-span-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        aria-label="Search monthly reports by staff name or email"
                        value={reportSearchTerm}
                        onChange={(e) => setReportSearchTerm(e.target.value)}
                        placeholder="Search staff name or email"
                        className="pl-9 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>
                    <Input
                      aria-label="Filter monthly reports from month"
                      type="date"
                      value={reportStartMonth}
                      onChange={(e) => setReportStartMonth(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-slate-100"
                    />
                    <Input
                      aria-label="Filter monthly reports to month"
                      type="date"
                      value={reportEndMonth}
                      onChange={(e) => setReportEndMonth(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-slate-100"
                    />
                    <select
                      aria-label="Filter monthly reports by review status"
                      value={reportReviewStatus}
                      onChange={(e) => setReportReviewStatus(e.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="all">All review statuses</option>
                      <option value="approved">Approved</option>
                      <option value="pending_review">Pending review</option>
                      <option value="rejected">Rejected</option>
                      <option value="correction_required">Correction required</option>
                    </select>
                    <select
                      aria-label="Filter monthly reports by submission status"
                      value={reportSubmissionStatus}
                      onChange={(e) => setReportSubmissionStatus(e.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="all">All submission statuses</option>
                      <option value="submitted">Submitted</option>
                      <option value="locked">Locked</option>
                      <option value="returned">Returned</option>
                      <option value="pending">Draft / pending</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-700 pt-3">
                    <p className="text-xs text-slate-400">Select Approved above to export only approved reports.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleExport("csv")}
                        disabled={allReports.length === 0 || exportingFormat !== null}
                        className="border-emerald-700 text-emerald-300 hover:bg-emerald-950/40"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {exportingFormat === "csv" ? "Preparing CSV..." : "Export CSV"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleExport("pdf")}
                        disabled={allReports.length === 0 || exportingFormat !== null}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {exportingFormat === "pdf" ? "Preparing PDF..." : "Export PDF"}
                      </Button>
                    </div>
                  </div>
                </div>

                {reportsLoading ? (
                  <p className="text-slate-400 text-sm py-6 text-center">Loading monthly reports...</p>
                ) : allReports.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center">
                    <p className="text-slate-300 font-medium">
                      {totalReportCount === 0 ? "No monthly reports found in the system." : "No reports match the selected filters."}
                    </p>
                    {totalReportCount > 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={clearReportFilters} className="mt-3 border-slate-600 text-slate-300 hover:bg-slate-700">
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-800 text-slate-200 uppercase text-xs">
                        <tr>
                          <th className="p-3">Staff Member</th>
                          <th className="p-3">Reporting Month</th>
                          <th className="p-3">Submission Status</th>
                          <th className="p-3">Review Status</th>
                          <th className="p-3">Submitted At</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {allReports.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3 font-medium text-slate-200">
                              {item.user?.name || `Staff #${item.userId}`}
                            </td>
                            <td className="p-3">
                              {new Date(item.reportingMonth).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-slate-300 border-slate-600">
                                {item.submissionStatus.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge className={
                                item.reviewStatus === "approved" ? "bg-emerald-600" :
                                item.reviewStatus === "rejected" ? "bg-red-600" :
                                item.reviewStatus === "correction_required" ? "bg-amber-600" : "bg-blue-600"
                              }>
                                {item.reviewStatus.replace("_", " ").toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-3 text-slate-400">
                              {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "Draft"}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleExport("csv", item.id)}
                                  disabled={exportingFormat !== null}
                                  className="border-emerald-700 text-emerald-300 hover:bg-emerald-950/40"
                                >
                                  CSV
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleExport("pdf", item.id)}
                                  disabled={exportingFormat !== null}
                                  className="border-blue-700 text-blue-300 hover:bg-blue-950/40"
                                >
                                  PDF
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReviewingReportId(item.id)}
                                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                >
                                  Review
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Review Modal */}
        {reviewingReportId !== null && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
              <h2 className="text-xl font-bold text-blue-300">Review Monthly Report</h2>
              <div className="space-y-3 text-sm text-slate-300">
                <div>
                  <label className="font-semibold text-slate-400">Review Status:</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as any)}
                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-md p-2 text-slate-100"
                  >
                    <option value="approved">Approve (Lock Report)</option>
                    <option value="correction_required">Require Correction / Return</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-400">Supervisor Comments / Remarks:</label>
                  <Textarea
                    rows={4}
                    placeholder="Provide feedback or instructions for the staff member..."
                    value={supervisorComments}
                    onChange={(e) => setSupervisorComments(e.target.value)}
                    className="mt-1 bg-slate-800 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setReviewingReportId(null)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    reviewReportMutation.mutate({
                      reportId: reviewingReportId,
                      reviewStatus,
                      supervisorComments,
                    });
                  }}
                  disabled={reviewReportMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Submit Review
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
