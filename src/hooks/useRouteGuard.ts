// Route guard hooks for each role

export function usePlatformAuth() {
  const isLoggedIn = localStorage.getItem("platform_logged_in") === "true";

  const login = () => localStorage.setItem("platform_logged_in", "true");
  const logout = () => localStorage.removeItem("platform_logged_in");

  return { isLoggedIn, login, logout };
}

export function useBuyerAuth() {
  // Buyer pages are generally accessible (linked from checkout/email)
  // but we track if they have an active session
  const hasSession = localStorage.getItem("buyer_session") === "true";

  const startSession = () => localStorage.setItem("buyer_session", "true");
  const endSession = () => localStorage.removeItem("buyer_session");

  return { hasSession, startSession, endSession };
}
