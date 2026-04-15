import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Briefcase, LogOut } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Africa for SDGs Timesheet</h1>
          <p className="text-slate-300 mb-8 text-lg">Track your time and activities for sustainable development goals</p>
          <Button 
            onClick={() => window.location.href = window.location.origin + '/api/oauth/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
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
  );
}
