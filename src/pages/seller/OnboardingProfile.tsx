import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function OnboardingProfile() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md glass-card rounded-xl p-6 space-y-6">
        <div>
          <p className="text-xs text-accent font-medium">ステップ 1 / 4</p>
          <h1 className="text-xl font-bold mt-1">プロフィール設定</h1>
          <p className="text-sm text-muted-foreground mt-1">ファンに表示される情報を入力してください</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>表示名</Label>
            <Input defaultValue="星野アイ" />
          </div>
          <div className="space-y-2">
            <Label>自己紹介</Label>
            <Textarea placeholder="ファンへのメッセージ..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>アイコン画像URL</Label>
            <Input placeholder="https://..." />
          </div>
        </div>
        <Button onClick={() => navigate("/seller/onboarding/stripe")} className="w-full">
          次へ：Stripe連携
        </Button>
      </div>
    </div>
  );
}
