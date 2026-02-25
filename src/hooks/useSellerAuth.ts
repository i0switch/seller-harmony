import { useAuth, OnboardingStep } from "@/contexts/AuthContext";

const ONBOARDING_STEPS: OnboardingStep[] = ["profile", "stripe", "discord", "complete"];

export function useSellerAuth() {
  const {
    session,
    role,
    isLoading,
    sellerOnboardingStep: currentStep,
    setSellerOnboardingStep,
    sellerLogin: supabaseLogin,
    sellerSignup: supabaseSignup,
    logout
  } = useAuth();

  const isLoggedIn = !!session && role === "seller";
  const isOnboarded = currentStep === "complete";

  const completeOnboarding = () => {
    setSellerOnboardingStep("complete");
  };

  const setOnboardingStep = (step: OnboardingStep) => {
    setSellerOnboardingStep(step);
  };

  const getNextStep = (): OnboardingStep | null => {
    const idx = ONBOARDING_STEPS.indexOf(currentStep);
    return idx < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[idx + 1] : null;
  };

  const canAccessStep = (step: OnboardingStep): boolean => {
    const targetIdx = ONBOARDING_STEPS.indexOf(step);
    const currentIdx = ONBOARDING_STEPS.indexOf(currentStep);
    return targetIdx <= currentIdx || isOnboarded;
  };

  const login = async (email: string, pass: string) => {
    return await supabaseLogin(email, pass);
  };

  const signup = async (email: string, pass: string) => {
    const res = await supabaseSignup(email, pass);
    if (!res.error) {
      setSellerOnboardingStep("profile");
    }
    return res;
  };

  return {
    isOnboarded, isLoggedIn, isLoading, currentStep,
    completeOnboarding, setOnboardingStep, getNextStep, canAccessStep,
    login, signup, logout,
  };
}
