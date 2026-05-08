import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, AlertCircle, CheckCircle2, Navigation, Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileStaffDashboard() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: todayAttendance } = trpc.attendance.getToday.useQuery();
  // TODO: Implement getBalance query for leave module

  const isCheckedIn = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime;
  const isCheckedOut = todayAttendance?.checkOutTime;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">Africa for SDGs Timesheet</h1>
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
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="mobile-card">
            <CardContent className="pt-4">
              <div className="text-center">
                <Clock className="mx-auto mb-2 h-6 w-6 text-primary" />
                <p className="text-xs text-muted-foreground">Hours Today</p>
                <p className="text-lg font-bold">0 hrs</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mobile-card">
            <CardContent className="pt-4">
              <div className="text-center">
                <MapPin className="mx-auto mb-2 h-6 w-6 text-primary" />
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-lg font-bold">0 km</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Check-In/Out Status */}
        <Card className="mobile-card border-2 border-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold">
                  {isCheckedOut ? 'Checked Out' : isCheckedIn ? 'Checked In' : 'Not Checked In'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isCheckedOut ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : isCheckedIn ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                    <div className="h-4 w-4 animate-pulse rounded-full bg-white" />
                  </div>
                ) : (
                  <AlertCircle className="h-8 w-8 text-yellow-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balance */}
        <Card className="mobile-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Leave Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Leave balance information coming soon</p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button className="w-full" size="lg" disabled={!!isCheckedIn || !!isCheckedOut}>
            <Navigation className="mr-2 h-4 w-4" />
            Check In
          </Button>
          <Button className="w-full" variant="outline" size="lg" disabled={!isCheckedIn || !!isCheckedOut}>
            Check Out
          </Button>
        </div>

        {/* Tabs for additional info */}
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="space-y-2">
            <Card className="mobile-card">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">No additional records</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="recent" className="space-y-2">
            <Card className="mobile-card">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">No recent activity</p>
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
            <MapPin className="h-5 w-5" />
            <span className="text-xs">Location</span>
          </button>
          <button className="flex flex-col items-center gap-1 rounded-lg p-3 text-muted-foreground hover:text-primary">
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs">Requests</span>
          </button>
          <button className="flex flex-col items-center gap-1 rounded-lg p-3 text-muted-foreground hover:text-primary">
            <Navigation className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
