import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { OnboardingShell } from "@/components/OnboardingStepIndicator";
import { useSellerAuth } from "@/hooks/useSellerAuth";

export default function OnboardingComplete() {
  const navigate = useNavigate();
  const { completeOnboarding, isOnboarded } = useSellerAuth();

  // Guard: redirect to dashboard if already onboarded
  if (isOnboarded) {
    return <Navigate to="/seller/dashboard" replace />;
  }

  const handleGoToDashboard = async () => {
    await completeOnboarding();
    navigate("/seller/dashboard");
  };

  return (
    <OnboardingShell step={3}>
      <div className="text-center space-y-4 py-4">
        <CheckCircle className="h-16 w-16 mx-auto text-success" />
        <h1 className="text-xl font-bold">セットアップ完了！</h1>
        <p className="text-sm text-muted-foreground">
          ファンクラブの準備が整いました。<br />
          ダッシュボードからプランを作成して販売を始めましょう。
        </p>
        <div className="glass-card rounded-lg p-4 text-left text-sm space-y-2">
          <p className="font-medium">次のステップ：</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>プランを作成する</li>
            <li>決済リンクを共有する</li>
            <li>会員の自動管理が始まります</li>
          </ul>
        </div>
      </div>
      <Button onClick={handleGoToDashboard} className="w-full" size="lg">
        ダッシュボードへ
      </Button>
    </OnboardingShell>
  );
}
