import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Users, CheckCircle, Clock, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardMetrics {
  totalStaff: number;
  presentToday: number;
  avgHrsPerDay: number;
  pendingRequests: number;
}

interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  late: number;
}

interface HoursTrend {
  date: string;
  hours: number;
  target: number;
}

export const AdminDashboardProfessional: React.FC = () => {
  // Mock data for visualizations
  const attendanceTrends: AttendanceTrend[] = [
    { date: 'Mon', present: 18, absent: 2, late: 3 },
    { date: 'Tue', present: 19, absent: 1, late: 2 },
    { date: 'Wed', present: 20, absent: 0, late: 1 },
    { date: 'Thu', present: 17, absent: 3, late: 2 },
    { date: 'Fri', present: 16, absent: 4, late: 1 },
  ];

  const hoursTrends: HoursTrend[] = [
    { date: 'Week 1', hours: 38.5, target: 40 },
    { date: 'Week 2', hours: 39.2, target: 40 },
    { date: 'Week 3', hours: 37.8, target: 40 },
    { date: 'Week 4', hours: 40.1, target: 40 },
  ];

  const metrics: DashboardMetrics = {
    totalStaff: 20,
    presentToday: 18,
    avgHrsPerDay: 8.5,
    pendingRequests: 3,
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="animated-bg min-h-screen">
      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-slate-300">Real-time staff management and analytics</p>
          </div>

          {/* KPI Cards with Icons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-in">
            {/* Total Staff Card */}
            <Card className="bg-gradient-to-br from-slate-700/60 via-slate-600/40 to-slate-800/50 border border-slate-500/50 hover:border-slate-400 transition-all duration-300 shadow-lg hover:shadow-slate-500/30 hover:scale-105 cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm mb-1 font-medium">Total Staff</p>
                    <p className="text-4xl font-bold text-white">{metrics.totalStaff}</p>
                    <p className="text-xs text-slate-400 mt-1">Active users</p>
                  </div>
                  <div className="p-3 bg-slate-600/50 rounded-lg">
                    <Users className="w-8 h-8 text-slate-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Present Today Card */}
            <Card className="bg-gradient-to-br from-emerald-700/60 via-emerald-600/40 to-slate-800/50 border border-emerald-500/50 hover:border-emerald-400 transition-all duration-300 shadow-lg hover:shadow-emerald-500/30 hover:scale-105 cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-300 text-sm mb-1 font-medium">Present Today</p>
                    <p className="text-4xl font-bold text-emerald-50">{metrics.presentToday}</p>
                    <p className="text-xs text-emerald-400/80 mt-1">Checked in</p>
                  </div>
                  <div className="p-3 bg-emerald-600/50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-emerald-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avg Hours Card */}
            <Card className="bg-gradient-to-br from-amber-700/60 via-amber-600/40 to-slate-800/50 border border-amber-500/50 hover:border-amber-400 transition-all duration-300 shadow-lg hover:shadow-amber-500/30 hover:scale-105 cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-300 text-sm mb-1 font-medium">Avg Hrs/Day</p>
                    <p className="text-4xl font-bold text-amber-50">{metrics.avgHrsPerDay}h</p>
                    <p className="text-xs text-amber-400/80 mt-1">Last 30 days</p>
                  </div>
                  <div className="p-3 bg-amber-600/50 rounded-lg">
                    <Clock className="w-8 h-8 text-amber-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Card */}
            <Card className="bg-gradient-to-br from-cyan-700/60 via-cyan-600/40 to-slate-800/50 border border-cyan-500/50 hover:border-cyan-400 transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 hover:scale-105 cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-300 text-sm mb-1 font-medium">Pending</p>
                    <p className="text-4xl font-bold text-cyan-50">{metrics.pendingRequests}</p>
                    <p className="text-xs text-cyan-400/80 mt-1">Awaiting approval</p>
                  </div>
                  <div className="p-3 bg-cyan-600/50 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-cyan-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in">
            {/* Attendance Trends Chart */}
            <Card className="bg-slate-800/40 border border-slate-600/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Attendance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      labelStyle={{ color: '#e0e7ff' }}
                    />
                    <Legend />
                    <Bar dataKey="present" fill="#10b981" />
                    <Bar dataKey="absent" fill="#ef4444" />
                    <Bar dataKey="late" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Hours Worked Chart */}
            <Card className="bg-slate-800/40 border border-slate-600/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Hours Worked vs Target
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hoursTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      labelStyle={{ color: '#e0e7ff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card className="bg-slate-800/40 border border-slate-600/50 backdrop-blur-sm animate-slide-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5 text-purple-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'John Doe', action: 'Checked in', time: '08:30 AM', location: 'Nairobi CBD' },
                  { name: 'Jane Smith', action: 'Checked out', time: '05:15 PM', location: 'Westlands' },
                  { name: 'Mike Johnson', action: 'Checked in', time: '09:00 AM', location: 'Mombasa' },
                  { name: 'Sarah Williams', action: 'Checked out', time: '04:45 PM', location: 'Kisumu' },
                ].map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{activity.name}</p>
                        <p className="text-slate-400 text-sm">{activity.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-300 text-sm font-medium">{activity.action}</p>
                      <p className="text-slate-500 text-xs">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardProfessional;
