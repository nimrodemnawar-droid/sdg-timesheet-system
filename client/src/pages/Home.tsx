import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Briefcase, LogOut, Calendar, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useSessionTimeout, setRememberMe, getRememberMe } from "@/_core/hooks/useSessionTimeout";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { useState, useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [rememberMe, setRememberMeLocal] = useState(false);
  const { showWarning, timeRemaining, extendSession } = useSessionTimeout(() => {
    logout();
  });
  const { data: stats, isLoading: statsLoading } = trpc.statistics.getUserStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  useEffect(() => {
    setRememberMeLocal(getRememberMe());
  }, []);

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMeLocal(checked);
    setRememberMe(checked);
  };

  const handleLogoutFromWarning = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <SessionTimeoutWarning
          open={showWarning}
          timeRemaining={timeRemaining}
          onExtend={extendSession}
          onLogout={handleLogoutFromWarning}
        />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Africa for SDGs Timesheet</h1>
            <p className="text-slate-300 mb-8 text-lg">Track your time and activities for sustainable development goals</p>
            <div className="space-y-4">
              <Button 
                onClick={() => window.location.href = getLoginUrl()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg w-full"
              >
                Login
              </Button>
              <div className="flex items-center justify-center gap-2">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => handleRememberMeChange(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-400 cursor-pointer"
                />
                <label htmlFor="remember-me" className="text-slate-300 cursor-pointer text-sm">
                  Remember me for 15 minutes
                </label>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SessionTimeoutWarning
        open={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onLogout={handleLogoutFromWarning}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">Welcome, {user?.name}</h1>
            </div>
            <Button
              onClick={() => logout()}
              variant="outline"
              className="text-white border-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Statistics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Leave Balance Card */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-700/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Leave Balance</h3>
                <Calendar className="w-6 h-6 text-emerald-400" />
              </div>
              {statsLoading ? (
                <div className="text-slate-300">Loading...</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Annual:</span>
                    <span className="text-xl font-bold text-emerald-400">{stats?.leaveBalance?.annual || 0} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Sick:</span>
                    <span className="text-xl font-bold text-blue-400">{stats?.leaveBalance?.sick || 0} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Casual:</span>
                    <span className="text-xl font-bold text-purple-400">{stats?.leaveBalance?.casual || 0} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Maternity:</span>
                    <span className="text-xl font-bold text-pink-400">{stats?.leaveBalance?.maternity || 0} days</span>
                  </div>
                </div>
              )}
            </div>

            {/* Hours Worked This Week Card */}
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Hours This Week</h3>
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              {statsLoading ? (
                <div className="text-slate-300">Loading...</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Total Hours:</span>
                    <span className="text-4xl font-bold text-blue-400">{stats?.weekHours || 0}</span>
                  </div>
                  <div className="text-sm text-slate-400 mt-4">
                    <p>Week: {stats?.weekStart} to {stats?.weekEnd}</p>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mt-4">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((stats?.weekHours || 0) / 40 * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {Math.max(0, 40 - (stats?.weekHours || 0)).toFixed(1)} hours remaining to reach 40h target
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/dashboard">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-blue-400 transition-all cursor-pointer h-full">
                <h2 className="text-xl font-bold text-white mb-2">Dashboard</h2>
                <p className="text-slate-300">Track your daily attendance and activities</p>
              </div>
            </Link>

            <Link href="/leave">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-blue-400 transition-all cursor-pointer h-full">
                <h2 className="text-xl font-bold text-white mb-2">Leave Management</h2>
                <p className="text-slate-300">Request and manage your leave</p>
              </div>
            </Link>

            <Link href="/attendance">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-blue-400 transition-all cursor-pointer h-full">
                <h2 className="text-xl font-bold text-white mb-2">Attendance</h2>
                <p className="text-slate-300">View your attendance history</p>
              </div>
            </Link>

            <Link href="/admin">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-blue-400 transition-all cursor-pointer h-full">
                <h2 className="text-xl font-bold text-white mb-2">Admin Dashboard</h2>
                <p className="text-slate-300">Manage staff and view reports</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
