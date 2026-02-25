// Seller auth hook with onboarding step tracking
export type OnboardingStep = "profile" | "stripe" | "discord" | "complete";

const ONBOARDING_STEPS: OnboardingStep[] = ["profile", "stripe", "discord", "complete"];

export function useSellerAuth() {
  const isLoggedIn = localStorage.getItem("seller_logged_in") === "true";
  const isOnboarded = localStorage.getItem("seller_onboarded") === "true";
  const currentStep = (localStorage.getItem("seller_onboarding_step") as OnboardingStep) || "profile";

  const completeOnboarding = () => {
    localStorage.setItem("seller_onboarded", "true");
    localStorage.setItem("seller_logged_in", "true");
    localStorage.setItem("seller_onboarding_step", "complete");
  };

  const setOnboardingStep = (step: OnboardingStep) => {
    localStorage.setItem("seller_onboarding_step", step);
  };

  const getNextStep = (): OnboardingStep | null => {
    const idx = ONBOARDING_STEPS.indexOf(currentStep);
    return idx < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[idx + 1] : null;
  };

  const canAccessStep = (step: OnboardingStep): boolean => {
    const targetIdx = ONBOARDING_STEPS.indexOf(step);
    const currentIdx = ONBOARDING_STEPS.indexOf(currentStep);
    // Can access current step and any completed step (before current)
    return targetIdx <= currentIdx;
  };

  const login = () => {
    localStorage.setItem("seller_logged_in", "true");
    localStorage.setItem("seller_onboarded", "true");
    localStorage.setItem("seller_onboarding_step", "complete");
  };

  const signup = () => {
    localStorage.setItem("seller_logged_in", "true");
    localStorage.removeItem("seller_onboarded");
    localStorage.setItem("seller_onboarding_step", "profile");
  };

  const logout = () => {
    localStorage.removeItem("seller_logged_in");
  };

  return {
    isOnboarded, isLoggedIn, currentStep,
    completeOnboarding, setOnboardingStep, getNextStep, canAccessStep,
    login, signup, logout,
  };
}
