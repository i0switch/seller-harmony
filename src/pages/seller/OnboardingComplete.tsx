import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function OnboardingComplete() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md glass-card rounded-xl p-6 space-y-6 text-center">
        <div>
          <p className="text-xs text-accent font-medium">ステップ 4 / 4</p>
          <CheckCircle className="h-16 w-16 mx-auto text-success mt-4" />
          <h1 className="text-xl font-bold mt-4">セットアップ完了！</h1>
          <p className="text-sm text-muted-foreground mt-2">
            ファンクラブの準備が整いました。ダッシュボードからプランを作成して販売を始めましょう。
          </p>
        </div>
        <Button onClick={() => navigate("/seller/dashboard")} className="w-full">
          ダッシュボードへ
        </Button>
      </div>
    </div>
  );
}
