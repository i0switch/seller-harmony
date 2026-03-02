import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, ArrowLeft } from "lucide-react";
import { OnboardingShell } from "@/components/OnboardingStepIndicator";
import { useSellerAuth } from "@/hooks/useSellerAuth";

import { supabase } from "@/integrations/supabase/client";

type StripeState = "not_started" | "pending" | "verified" | "restricted";
const stateLabel: Record<StripeState, string> = { not_started: "未開始", pending: "審査中", verified: "有効", restricted: "制限あり" };
const stateVariant: Record<StripeState, "outline" | "secondary" | "default" | "destructive"> = { not_started: "outline", pending: "secondary", verified: "default", restricted: "destructive" };

export default function OnboardingStripe() {
  const navigate = useNavigate();
  const { isOnboarded } = useSellerAuth();
  const [state, setState] = useState<StripeState>("not_started");
  const [isLoading, setIsLoading] = useState(false);

  // Guard: redirect to dashboard if already onboarded
  if (isOnboarded) {
    return <Navigate to="/seller/dashboard" replace />;
  }

  const startOnboarding = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-onboarding');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setState("pending");
      }
    } catch (err) {
      console.error("Stripe onboarding failed:", err);
      alert("Stripe接続処理に失敗しました。後でもう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingShell step={1}>
      <div>
        <h1 className="text-xl font-bold">Stripe Connect連携</h1>
        <p className="text-sm text-muted-foreground mt-1">売上を受け取るためにStripeアカウントを連携してください</p>
      </div>

      <div className="glass-card rounded-lg p-5 text-center space-y-4">
        <CreditCard className="h-12 w-12 mx-auto text-accent" />
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-medium">ステータス:</span>
          <Badge variant={stateVariant[state]}>{stateLabel[state]}</Badge>
        </div>

        {state === "not_started" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Stripe Expressを使用して安全にKYCと口座登録を行います</p>
            <Button className="w-full" onClick={startOnboarding} disabled={isLoading}>
              <ExternalLink className="h-4 w-4 mr-2" /> {isLoading ? "Stripeを開く..." : "Stripeオンボーディングを開始"}
            </Button>
          </div>
        )}

        {state === "pending" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Stripeで本人確認・口座登録を完了してください</p>
            <Button variant="outline" className="w-full" onClick={startOnboarding} disabled={isLoading}>
              <ExternalLink className="h-4 w-4 mr-2" /> {isLoading ? "Stripeを開く..." : "Stripeオンボーディングを再開"}
            </Button>
          </div>
        )}

        {state === "verified" && (
          <p className="text-sm text-success font-medium">✓ Stripe連携が完了しました</p>
        )}

        {state === "restricted" && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">アカウントに制限があります。Stripeダッシュボードで確認してください。</p>
            <Button variant="outline" className="w-full" onClick={startOnboarding}>
              <ExternalLink className="h-4 w-4 mr-2" /> Stripeダッシュボードを開く
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/seller/onboarding/profile")} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-1" /> 戻る
        </Button>
        <Button onClick={() => navigate("/seller/onboarding/discord")} className="flex-1" disabled={state === "not_started"}>
          次へ
        </Button>
      </div>

      {state === "not_started" && (
        <Button variant="ghost" onClick={() => navigate("/seller/onboarding/discord")} className="w-full text-xs text-muted-foreground">
          スキップ（あとで設定）
        </Button>
      )}
    </OnboardingShell>
  );
}
