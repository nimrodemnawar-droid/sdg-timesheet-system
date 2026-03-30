import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, AlertCircle, FileText, Menu, X, ChevronRight } from "lucide-react";

export function MobileAdminDashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const stats = [
    { label: "Total Staff", value: "45", icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Checked In", value: "38", icon: Clock, color: "bg-green-100 text-green-600" },
    { label: "Pending Leave", value: "7", icon: AlertCircle, color: "bg-amber-100 text-amber-600" },
    { label: "Reports", value: "12", icon: FileText, color: "bg-purple-100 text-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 hover:bg-accent"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 p-4">
        {/* Quick Stats - Responsive Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="mobile-card">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className={`inline-flex rounded-lg p-2 ${stat.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="leave" className="text-xs sm:text-sm">
              Leave
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3">
            {/* Today's Attendance */}
            <Card className="mobile-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Today's Attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Checked In</span>
                  <Badge>38/45</Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-4/5 bg-green-500" />
                </div>
                <p className="text-xs text-muted-foreground">84% attendance rate</p>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="mobile-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Staff Member {i}</p>
                      <p className="text-xs text-muted-foreground">Checked in 10:30 AM</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Tab */}
          <TabsContent value="leave" className="space-y-3">
            <Card className="mobile-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Pending Leave Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2 border-b border-border pb-3 last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Staff Member {i}</p>
                        <p className="text-xs text-muted-foreground">Annual Leave - 3 days</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Pending
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs">
                        Decline
                      </Button>
                      <Button size="sm" className="flex-1 text-xs">
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-3">
            <Card className="mobile-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Available Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["Attendance Report", "Leave Summary", "GPS Tracking", "Performance Analytics"].map((report) => (
                  <button
                    key={report}
                    className="flex w-full items-center justify-between rounded-lg border border-border p-3 hover:bg-accent"
                  >
                    <span className="text-sm font-medium">{report}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card className="mobile-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full text-sm">
                  Export as CSV
                </Button>
                <Button variant="outline" className="w-full text-sm">
                  Export as PDF
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background">
        <div className="flex items-center justify-around px-4 py-2">
          <button className="flex flex-col items-center gap-1 rounded-lg p-3 text-primary">
            <Clock className="h-5 w-5" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button className="flex flex-col items-center gap-1 rounded-lg p-3 text-muted-foreground hover:text-primary">
            <Users className="h-5 w-5" />
            <span className="text-xs">Staff</span>
          </button>
          <button className="flex flex-col items-center gap-1 rounded-lg p-3 text-muted-foreground hover:text-primary">
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs">Leave</span>
          </button>
          <button className="flex flex-col items-center gap-1 rounded-lg p-3 text-muted-foreground hover:text-primary">
            <FileText className="h-5 w-5" />
            <span className="text-xs">Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}
