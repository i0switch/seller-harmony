import { useState, useEffect } from "react";
import { formatDateTimeJP } from "@/types";
import { sellerApi } from "@/services/api";
import type { SellerDiscordSettings as SellerDiscordSettingsType, DiscordVerificationEntry } from "@/services/api.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw, ExternalLink, History, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type VerifyStatus = "idle" | "checking" | "ok" | "error";

const errorGuides: Record<string, { message: string; fix: string }> = {
  DISCORD_GUILD_ACCESS_DENIED: { message: "Botがサーバーにアクセスできません", fix: "Botをサーバーに招待してください" },
  DISCORD_MANAGE_ROLES_MISSING: { message: "Botに「ロールの管理」権限がありません", fix: "サーバー設定 → ロール → Bot → 「ロールの管理」をON" },
  DISCORD_ROLE_NOT_FOUND: { message: "指定ロールが見つかりません", fix: "ロールIDが正しいか確認してください" },
  DISCORD_ROLE_HIERARCHY_INVALID: { message: "Botの役職が対象ロールより下位です", fix: "サーバー設定 → ロール で、Botの役職を対象ロールより上に移動" },
};

export default function SellerDiscordSettings() {
  const [settings, setSettings] = useState<SellerDiscordSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState("");
  const [defaultRoleId, setDefaultRoleId] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyResult, setVerifyResult] = useState<DiscordVerificationEntry["checks"] | null>(null);
  const [verifyErrorCode, setVerifyErrorCode] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    sellerApi.getDiscordSettings().then((data) => {
      setSettings(data);
      setGuildId(data.guildId);
      setDefaultRoleId(data.defaultRoleId);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await sellerApi.saveDiscordSettings({
        guildId,
      });
      toast({ title: "設定を保存しました" });
    } catch (err: unknown) {
      console.error(err);
      toast({ title: "エラー", description: "設定の保存に失敗しました", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const runVerify = async () => {
    setVerifyStatus("checking");
    try {
      const { data, error } = await supabase.functions.invoke("discord-bot", {
        body: {
          action: "validate_bot_permission",
          guild_id: guildId,
          role_id: defaultRoleId,
        },
      });

      if (error) throw error;

      if (data.status === "ok") {
        setVerifyResult({ botInstalled: true, manageRolesPermission: true, roleExists: true, botRoleHierarchy: true });
        setVerifyErrorCode(null);
        setVerifyStatus("ok");
        toast({ title: "検証完了", description: "すべてのチェック項目が正常です" });
      } else {
        setVerifyResult({
          botInstalled: data.checks?.botInstalled ?? false,
          manageRolesPermission: data.checks?.manageRolesPermission ?? false,
          roleExists: data.checks?.roleExists ?? false,
          botRoleHierarchy: data.checks?.botRoleHierarchy ?? false,
        });
        setVerifyErrorCode(data.errorCode || "UNKNOWN_ERROR");
        setVerifyStatus("error");
        toast({ title: "検証失敗", description: data?.message || "問題が見つかりました", variant: "destructive" });
      }
    } catch (err) {
      console.error("Discord verification failed:", err);
      setVerifyStatus("error");
      toast({ title: "エラー", description: "検証中にエラーが発生しました", variant: "destructive" });
    }
  };

  if (loading || !settings) {
    return <div className="space-y-4 max-w-lg"><div className="h-8 bg-muted animate-pulse rounded" /><div className="h-40 bg-muted animate-pulse rounded" /></div>;
  }

  const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle className="h-4 w-4 text-success shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
      <span className={ok ? "" : "text-destructive"}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-2xl font-bold">Discord設定</h2>

      {/* Connection Status */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-accent" />
          <div className="flex-1">
            <p className="font-semibold">{settings.guildName}</p>
            <Badge variant={settings.botConnected ? "default" : "destructive"}>
              {settings.botConnected ? "Bot接続済" : "Bot未接続"}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">最終検証: {formatDateTimeJP(settings.lastVerifiedAt)}</p>
      </div>

      {/* Settings Form */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="font-semibold">接続設定</h3>
        <div className="space-y-2">
          <Label>DiscordサーバーID</Label>
          <Input value={guildId} onChange={(e) => { setGuildId(e.target.value); setVerifyStatus("idle"); }} />
        </div>
        <div className="space-y-2">
          <Label>既定ロールID</Label>
          <Input value={defaultRoleId} onChange={(e) => { setDefaultRoleId(e.target.value); setVerifyStatus("idle"); }} />
          <p className="text-xs text-muted-foreground">プラン未設定時に使用されるデフォルトロール</p>
        </div>
        <Button onClick={runVerify} variant="outline" className="w-full" disabled={verifyStatus === "checking"}>
          {verifyStatus === "checking" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />検証中...</> : <><RefreshCw className="h-4 w-4 mr-2" />Bot権限を再検証</>}
        </Button>
      </div>

      {/* Verification Results */}
      {verifyResult && verifyStatus !== "checking" && (
        <div className={`rounded-xl p-4 space-y-3 ${verifyStatus === "ok" ? "bg-success/10 border border-success/30" : "bg-destructive/10 border border-destructive/30"}`}>
          <Badge variant={verifyStatus === "ok" ? "default" : "destructive"}>
            {verifyStatus === "ok" ? "すべて正常" : "問題あり"}
          </Badge>
          <CheckItem ok={verifyResult.botInstalled} label="Bot導入済み" />
          <CheckItem ok={verifyResult.manageRolesPermission} label="Manage Roles権限あり" />
          <CheckItem ok={verifyResult.roleExists} label="対象ロール存在" />
          <CheckItem ok={verifyResult.botRoleHierarchy} label="Bot役職が対象ロールより上位" />

          {verifyErrorCode && errorGuides[verifyErrorCode] && (
            <div className="bg-card rounded-lg p-3 space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm font-medium text-destructive">{errorGuides[verifyErrorCode].message}</p>
              </div>
              <p className="text-xs text-muted-foreground">修正方法: {errorGuides[verifyErrorCode].fix}</p>
            </div>
          )}
        </div>
      )}

      {/* Verification History */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <button onClick={() => setShowHistory(!showHistory)} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">再検証履歴</h3>
          </div>
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showHistory && settings.verificationHistory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            {settings.verificationHistory.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 text-xs">
                <div className="mt-0.5">
                  {entry.success
                    ? <CheckCircle className="h-3.5 w-3.5 text-success" />
                    : <XCircle className="h-3.5 w-3.5 text-destructive" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-muted-foreground">{formatDateTimeJP(entry.timestamp)}</span>
                    <Badge variant={entry.success ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                      {entry.success ? "成功" : "失敗"}
                    </Badge>
                  </div>
                  {entry.errorMessage && (
                    <p className="text-destructive mt-0.5">{entry.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showHistory && settings.verificationHistory.length === 0 && (
          <p className="text-xs text-muted-foreground pt-2">検証履歴がありません</p>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />保存中...</> : "設定を保存"}
        </Button>
        <Button variant="outline" className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" />Bot再招待リンクを生成
        </Button>
      </div>
    </div>
  );
}
