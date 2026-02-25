import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export default function OnboardingDiscord() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md glass-card rounded-xl p-6 space-y-6">
        <div>
          <p className="text-xs text-accent font-medium">ステップ 3 / 4</p>
          <h1 className="text-xl font-bold mt-1">Discord連携</h1>
          <p className="text-sm text-muted-foreground mt-1">ファンクラブのDiscordサーバーを設定してください</p>
        </div>
        <div className="glass-card rounded-lg p-5 text-center space-y-4">
          <MessageCircle className="h-12 w-12 mx-auto text-accent" />
          <div>
            <p className="font-semibold">Discord Botを招待</p>
            <p className="text-sm text-muted-foreground mt-1">
              あなたのサーバーにBotを追加し、ロール管理を自動化します
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate("/seller/onboarding/complete")}>
            Botを招待する（モック）
          </Button>
        </div>
        <Button variant="ghost" onClick={() => navigate("/seller/onboarding/complete")} className="w-full text-muted-foreground">
          スキップ
        </Button>
      </div>
    </div>
  );
}
