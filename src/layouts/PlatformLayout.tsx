import { Link, Outlet, useLocation, Navigate, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Webhook, RefreshCw, Megaphone, Settings, LogOut, Menu, X, Loader2,
} from "lucide-react";
import { useState } from "react";
import { usePlatformAuth } from "@/hooks/useRouteGuard";

const navItems = [
  { to: "/platform/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { to: "/platform/tenants", label: "テナント管理", icon: Users },
  { to: "/platform/webhooks", label: "Webhook監視", icon: Webhook },
  { to: "/platform/retry-queue", label: "リトライキュー", icon: RefreshCw },
  { to: "/platform/announcements", label: "お知らせ管理", icon: Megaphone },
  { to: "/platform/system-control", label: "システム制御", icon: Settings },
];

export default function PlatformLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoggedIn, isLoading, logout } = usePlatformAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/platform/login", { replace: true });
  };

  // BUG-B01 fix: Wait for auth initialization before redirecting
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Route guard: redirect to login if not authenticated
  if (!isLoggedIn) {
    return <Navigate to="/platform/login" replace />;
  }

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 platform-gradient text-primary-foreground flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="text-lg font-bold tracking-tight">🛡️ Platform Admin</h1>
          <p className="text-xs text-sidebar-foreground mt-1">ファンクラブ運用インフラ</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg w-full">
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-4 gap-3 bg-card sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-md hover:bg-muted">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-sm text-muted-foreground">
            {navItems.find((n) => location.pathname.startsWith(n.to))?.label ?? "Platform Admin"}
          </span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
