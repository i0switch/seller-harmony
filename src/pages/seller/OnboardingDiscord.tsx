import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ArrowLeft, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { OnboardingShell } from "@/components/OnboardingStepIndicator";
import { useToast } from "@/hooks/use-toast";
import { useSellerAuth } from "@/hooks/useSellerAuth";

import { supabase } from "@/integrations/supabase/client";

type CheckStatus = "idle" | "checking" | "success" | "error";

interface ValidationResult {
  botInstalled: boolean;
  manageRoles: boolean;
  roleExists: boolean;
  roleHierarchy: boolean;
  errorCode: string | null;
}

const errorMessages: Record<string, string> = {
  DISCORD_GUILD_ACCESS_DENIED: "Botがサーバーにアクセスできません。Botがサーバーに追加されているか確認してください。",
  DISCORD_MANAGE_ROLES_MISSING: "Botに「ロールの管理」権限がありません。サーバー設定でBotの権限を確認してください。",
  DISCORD_ROLE_NOT_FOUND: "指定されたロールIDが見つかりません。ロールIDを確認してください。",
  DISCORD_ROLE_HIERARCHY_INVALID: "Botの役職が対象ロールより下位にあります。サーバー設定でBotの役職を対象ロールより上に移動してください。",
};

export default function OnboardingDiscord() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOnboarded } = useSellerAuth();
  const [guildId, setGuildId] = useState("");

  // Guard: redirect to dashboard if already onboarded
  if (isOnboarded) {
    return <Navigate to="/seller/dashboard" replace />;
  }

  const [roleId, setRoleId] = useState("");
  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const runValidation = async () => {
    if (!guildId.trim() || !roleId.trim()) {
      toast({
        title: "入力エラー",
        description: "サーバーIDと役割(Role)IDを入力してください",
        variant: "destructive",
      });
      return;
    }
    setCheckStatus("checking");

    try {
      const { data, error } = await supabase.functions.invoke('discord-bot', {
        body: { action: 'validate_bot_permission', guild_id: guildId.trim(), role_id: roleId.trim() }
      });

      if (error || !data) throw new Error(error?.message || "Function error");
      if (data.error) throw new Error(data.error);

      if (data.status === "ok") {
        setValidation({
          botInstalled: true, manageRoles: true, roleExists: true, roleHierarchy: true, errorCode: null
        });
        setCheckStatus("success");
      } else {
        setValidation({
          botInstalled: true, manageRoles: true, roleExists: true, roleHierarchy: false, errorCode: "DISCORD_ROLE_HIERARCHY_INVALID"
        });
        setCheckStatus("error");
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      let code = "DISCORD_GUILD_ACCESS_DENIED";
      if (errorMsg.includes("Role not found")) code = "DISCORD_ROLE_NOT_FOUND";

      setValidation({
        botInstalled: errorMsg.includes("Role not found"),
        manageRoles: errorMsg.includes("Role not found"),
        roleExists: false, roleHierarchy: false, errorCode: code
      });
      setCheckStatus("error");
    }
  };

  const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle className="h-4 w-4 text-success shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
      <span className={ok ? "" : "text-destructive"}>{label}</span>
    </div>
  );

  return (
    <OnboardingShell step={2}>
      <div>
        <h1 className="text-xl font-bold">Discord連携</h1>
        <p className="text-sm text-muted-foreground mt-1">ファンクラブのDiscordサーバーを設定してください</p>
      </div>

      {/* Guide placeholder */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageCircle className="h-4 w-4 text-accent" />
          セットアップガイド
        </div>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
          <li>Discord Developer Portalでアプリケーションを作成</li>
          <li>Botを追加し、「ロールの管理」権限を付与</li>
          <li>招待URLでBotをサーバーに追加</li>
          <li>Botの役職を付与対象ロールより上に配置</li>
        </ol>
        <div className="bg-muted rounded p-3 text-center text-xs text-muted-foreground border border-dashed">
          📷 画像ガイド（準備中）
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>DiscordサーバーID <span className="text-destructive">*</span></Label>
          <Input value={guildId} onChange={(e) => setGuildId(e.target.value)} placeholder="例: 1234567890123456789" />
          <p className="text-xs text-muted-foreground">サーバー設定 → ウィジェット → サーバーID</p>
        </div>
        <div className="space-y-2">
          <Label>初期ロールID（任意）</Label>
          <Input value={roleId} onChange={(e) => setRoleId(e.target.value)} placeholder="例: 9876543210987654321" />
          <p className="text-xs text-muted-foreground">プラン作成時にも設定できます</p>
        </div>
        <Button onClick={runValidation} variant="outline" className="w-full" disabled={!guildId.trim() || checkStatus === "checking"}>
          {checkStatus === "checking" ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 検証中...</>
          ) : (
            "Discord設定を検証"
          )}
        </Button>
      </div>

      {/* Validation Results */}
      {validation && checkStatus !== "checking" && (
        <div className={`rounded-lg p-4 space-y-2 ${checkStatus === "success" ? "bg-success/10 border border-success/30" : "bg-destructive/10 border border-destructive/30"}`}>
          <div className="flex items-center gap-2 mb-2">
            {checkStatus === "success" ? (
              <Badge variant="default">検証OK</Badge>
            ) : (
              <Badge variant="destructive">検証NG</Badge>
            )}
          </div>
          <CheckItem ok={validation.botInstalled} label="Bot導入済み" />
          <CheckItem ok={validation.manageRoles} label="Manage Roles権限あり" />
          <CheckItem ok={validation.roleExists} label="対象ロール存在" />
          <CheckItem ok={validation.roleHierarchy} label="Bot役職が対象ロールより上位" />

          {validation.errorCode && (
            <div className="mt-3 bg-destructive/5 rounded p-3 space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <code className="text-xs font-mono text-destructive">{validation.errorCode}</code>
              </div>
              <p className="text-xs text-muted-foreground">{errorMessages[validation.errorCode]}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/seller/onboarding/stripe")} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-1" /> 戻る
        </Button>
        <Button onClick={() => navigate("/seller/onboarding/complete")} className="flex-1">
          次へ
        </Button>
      </div>
    </OnboardingShell>
  );
}
