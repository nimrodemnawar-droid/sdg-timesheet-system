import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";

// Pages
import Home from "./pages/Home";
import StaffDashboard from "./pages/StaffDashboard";
import LeaveRequest from "./pages/LeaveRequest";

function Navigation() {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  if (!user) return null;

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Leave", href: "/leave" },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-slate-900">SDG Timesheet</h1>
            <div className="hidden md:flex gap-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    location === item.href
                      ? "bg-blue-100 text-blue-900"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user.name}</span>
            <button
              onClick={() => logout()}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-md transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-slate-900">SDG Timesheet System</h1>
            <p className="text-slate-600">GPS-based workforce attendance and field tracking</p>
          </div>

          <div className="space-y-4 pt-4">
            <p className="text-slate-700">
              Track your work hours, manage leave requests, and monitor field activities with precision GPS tracking.
            </p>

            <a
              href={getLoginUrl()}
              className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={StaffDashboard} />
        <Route path="/leave" component={LeaveRequest} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
