// Simple seller auth mock using localStorage
export function useSellerAuth() {
  const isOnboarded = localStorage.getItem("seller_onboarded") === "true";
  const isLoggedIn = localStorage.getItem("seller_logged_in") === "true";

  const completeOnboarding = () => {
    localStorage.setItem("seller_onboarded", "true");
    localStorage.setItem("seller_logged_in", "true");
  };

  const login = () => {
    localStorage.setItem("seller_logged_in", "true");
    localStorage.setItem("seller_onboarded", "true");
  };

  const signup = () => {
    localStorage.setItem("seller_logged_in", "true");
    localStorage.removeItem("seller_onboarded");
  };

  const logout = () => {
    localStorage.removeItem("seller_logged_in");
  };

  return { isOnboarded, isLoggedIn, completeOnboarding, login, signup, logout };
}
