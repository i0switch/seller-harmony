import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  CheckSquare,
  Webhook,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/seller/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { to: "/seller/plans", label: "プラン管理", icon: Package },
  { to: "/seller/members", label: "会員管理", icon: Users },
  { to: "/seller/crosscheck", label: "クロスチェック", icon: CheckSquare },
  { to: "/seller/webhooks", label: "Webhook", icon: Webhook },
  { to: "/seller/settings/discord", label: "Discord設定", icon: Settings },
];

export default function SellerLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-card sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-1.5 rounded-md hover:bg-muted"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-sm font-semibold seller-gradient bg-clip-text text-transparent">
            🎤 Seller Dashboard
          </span>
        </div>
        <Link
          to="/seller/login"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ログアウト
        </Link>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex w-56 border-r bg-card flex-col p-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </aside>

        {/* Mobile nav dropdown */}
        {menuOpen && (
          <div className="md:hidden absolute top-14 left-0 right-0 bg-card border-b z-20 p-3 space-y-1 shadow-lg">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-accent/15 text-accent font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
