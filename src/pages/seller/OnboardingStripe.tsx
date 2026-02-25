import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

export default function OnboardingStripe() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md glass-card rounded-xl p-6 space-y-6">
        <div>
          <p className="text-xs text-accent font-medium">ステップ 2 / 4</p>
          <h1 className="text-xl font-bold mt-1">Stripe Connect連携</h1>
          <p className="text-sm text-muted-foreground mt-1">売上を受け取るためにStripeアカウントを連携してください</p>
        </div>
        <div className="glass-card rounded-lg p-5 text-center space-y-4">
          <CreditCard className="h-12 w-12 mx-auto text-accent" />
          <div>
            <p className="font-semibold">本人確認・口座登録</p>
            <p className="text-sm text-muted-foreground mt-1">
              Stripe Expressを使用して安全にKYCと口座登録を行います
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate("/seller/onboarding/discord")}>
            Stripeオンボーディングを開始（モック）
          </Button>
        </div>
        <Button variant="ghost" onClick={() => navigate("/seller/onboarding/discord")} className="w-full text-muted-foreground">
          スキップ（あとで設定）
        </Button>
      </div>
    </div>
  );
}
