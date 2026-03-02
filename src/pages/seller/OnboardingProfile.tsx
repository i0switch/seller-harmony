import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingShell } from "@/components/OnboardingStepIndicator";
import { useSellerAuth } from "@/hooks/useSellerAuth";
import { supabase } from "@/integrations/supabase/client";

export default function OnboardingProfile() {
  const navigate = useNavigate();
  const { isOnboarded, setOnboardingStep } = useSellerAuth();

  // Guard: redirect to dashboard if already onboarded
  if (isOnboarded) {
    return <Navigate to="/seller/dashboard" replace />;
  }

  const [displayName, setDisplayName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = "表示名を入力してください";
    if (!serviceName.trim()) e.serviceName = "サービス名を入力してください";
    if (supportEmail && !/\S+@\S+\.\S+/.test(supportEmail)) e.supportEmail = "有効なメールアドレスを入力してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrors({ form: "認証情報が見つかりません。再ログインしてください。" });
        return;
      }

      const now = new Date().toISOString();

      const { error: profileError } = await supabase
        .from("seller_profiles")
        .upsert(
          {
            user_id: user.id,
            store_name: serviceName.trim(),
            status: "draft",
            updated_at: now,
          },
          { onConflict: "user_id" }
        );

      if (profileError) {
        setErrors({ form: profileError.message });
        return;
      }

      await supabase
        .from("users")
        .update({ display_name: displayName.trim(), updated_at: now })
        .eq("id", user.id);

      setOnboardingStep("stripe");
    } finally {
      setIsSaving(false);
    }

    navigate("/seller/onboarding/stripe");
  };

  return (
    <OnboardingShell step={0}>
      <div>
        <h1 className="text-xl font-bold">プロフィール設定</h1>
        <p className="text-sm text-muted-foreground mt-1">ファンに表示される情報を入力してください</p>
      </div>
      <div className="space-y-4">
        {errors.form && <p className="text-xs text-destructive">{errors.form}</p>}
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
      <Button onClick={handleNext} className="w-full" disabled={isSaving}>{isSaving ? "保存中..." : "保存して次へ"}</Button>
    </OnboardingShell>
  );
}
