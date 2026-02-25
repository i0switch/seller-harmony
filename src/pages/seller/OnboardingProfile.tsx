import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingShell } from "@/components/OnboardingStepIndicator";

export default function OnboardingProfile() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = "表示名を入力してください";
    if (!serviceName.trim()) e.serviceName = "サービス名を入力してください";
    if (supportEmail && !/\S+@\S+\.\S+/.test(supportEmail)) e.supportEmail = "有効なメールアドレスを入力してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    navigate("/seller/onboarding/stripe");
  };

  return (
    <OnboardingShell step={0}>
      <div>
        <h1 className="text-xl font-bold">プロフィール設定</h1>
        <p className="text-sm text-muted-foreground mt-1">ファンに表示される情報を入力してください</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>表示名 <span className="text-destructive">*</span></Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="例: 星野アイ" />
          {errors.displayName && <p className="text-xs text-destructive">{errors.displayName}</p>}
        </div>
        <div className="space-y-2">
          <Label>サービス名 / サークル名 <span className="text-destructive">*</span></Label>
          <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="例: 星野ファンクラブ" />
          {errors.serviceName && <p className="text-xs text-destructive">{errors.serviceName}</p>}
        </div>
        <div className="space-y-2">
          <Label>サポート連絡先メール</Label>
          <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@example.com" />
          {errors.supportEmail && <p className="text-xs text-destructive">{errors.supportEmail}</p>}
        </div>
      </div>
      <Button onClick={handleNext} className="w-full">保存して次へ</Button>
    </OnboardingShell>
  );
}
