import { useCallback, useEffect, useState } from "react";
import { useAuth, OnboardingStep } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

  const [isResolvingOnboarding, setIsResolvingOnboarding] = useState(false);

  const refreshOnboardingStep = useCallback(async () => {
    if (!session?.user || role !== "seller") return;

    setIsResolvingOnboarding(true);
    try {
      const sellerId = session.user.id;

      const [{ data: profile }, { data: stripeAccounts }, { data: discordServers }] = await Promise.all([
        supabase
          .from("seller_profiles")
          .select("status")
          .eq("user_id", sellerId)
          .maybeSingle(),
        supabase
          .from("stripe_connected_accounts")
          .select("charges_enabled, payouts_enabled")
          .eq("seller_id", sellerId)
          .order("updated_at", { ascending: false })
          .limit(1),
        supabase
          .from("discord_servers")
          .select("bot_installed, bot_permission_status")
          .eq("seller_id", sellerId)
          .order("updated_at", { ascending: false })
          .limit(1),
      ]);

      if (profile?.status === "active") {
        setSellerOnboardingStep("complete");
        return;
      }

      if (!profile) {
        setSellerOnboardingStep("profile");
        return;
      }

      const stripe = stripeAccounts?.[0];
      if (!stripe || !(stripe.charges_enabled && stripe.payouts_enabled)) {
        setSellerOnboardingStep("stripe");
        return;
      }

      const discord = discordServers?.[0];
      if (!discord || !discord.bot_installed || discord.bot_permission_status !== "ok") {
        setSellerOnboardingStep("discord");
        return;
      }

      setSellerOnboardingStep("complete");
    } finally {
      setIsResolvingOnboarding(false);
    }
  }, [role, session?.user, setSellerOnboardingStep]);

  useEffect(() => {
    refreshOnboardingStep();
  }, [refreshOnboardingStep]);

  const isLoggedIn = !!session && role === "seller";
  const isOnboarded = currentStep === "complete";

  const completeOnboarding = async () => {
    if (!session?.user) {
      setSellerOnboardingStep("complete");
      return;
    }

    const { data: existingProfile } = await supabase
      .from("seller_profiles")
      .select("store_name")
      .eq("user_id", session.user.id)
      .maybeSingle();

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("seller_profiles")
      .upsert(
        {
          user_id: session.user.id,
          store_name: existingProfile?.store_name || "My Store",
          status: "active",
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      throw new Error(error.message);
    }

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

  const signup = async (email: string, pass: string, displayName?: string) => {
    const res = await supabaseSignup(email, pass, displayName);
    if (!res.error) {
      setSellerOnboardingStep("profile");
    }
    return res;
  };

  return {
    isOnboarded, isLoggedIn, isLoading: isLoading || isResolvingOnboarding, currentStep,
    completeOnboarding, setOnboardingStep, getNextStep, canAccessStep,
    login, signup, logout, refreshOnboardingStep,
  };
}
