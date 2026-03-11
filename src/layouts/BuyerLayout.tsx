import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// Public paths that don't require authentication
const PUBLIC_PATHS = ["/p/", "/checkout/success", "/buyer/login", "/buyer/discord/result"];

// Roles allowed to access buyer pages (sellers are excluded)
const BUYER_ALLOWED_ROLES = ["buyer", "platform_admin"];

export default function BuyerLayout() {
  const { session, role, isLoading } = useAuth();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  const isPublicPath = PUBLIC_PATHS.some(p => location.pathname.startsWith(p));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Guard: redirect to buyer login if not logged in (except public paths)
  if (!session && !isPublicPath) {
    return <Navigate to={`/buyer/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  // Guard: non-buyer sessions should re-authenticate as a buyer for purchase/member flows
  if (session && role && !BUYER_ALLOWED_ROLES.includes(role) && !isPublicPath) {
    return <Navigate to={`/buyer/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 border-b flex items-center justify-center bg-card">
        <span className="text-sm font-semibold">🎫 ファンクラブ</span>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
