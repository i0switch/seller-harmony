import { useAuth } from "@/contexts/AuthContext";

export function usePlatformAuth() {
  const { session, role, logout: globalLogout } = useAuth();
  const isLoggedIn = !!session && role === "platform_admin";

  const login = () => { /* In reality, platform admin would securely login via a different route or specialized UI */ };
  const logout = async () => { await globalLogout() };

  return { isLoggedIn, login, logout };
}

export function useBuyerAuth() {
  const { session, role, logout: globalLogout } = useAuth();
  // Buyer pages are generally accessible via checkout links or magic links.
  const hasSession = !!session && role === "buyer";

  const startSession = () => { /* No-op; buyer session usually created via Stripe/Discord callback */ };
  const endSession = async () => { await globalLogout() };

  return { hasSession, startSession, endSession };
}
