import { useState } from "react";
import { mockSellerDiscord, formatDateTimeJP } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CheckCircle, XCircle, Loader2, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";

type VerifyStatus = "idle" | "checking" | "ok" | "error";

interface VerifyResult {
  botInstalled: boolean;
  manageRoles: boolean;
  roleExists: boolean;
  roleHierarchy: boolean;
  errorCode: string | null;
}

const errorGuides: Record<string, { message: string; fix: string }> = {
  DISCORD_GUILD_ACCESS_DENIED: { message: "Botがサーバーにアクセスできません", fix: "Botをサーバーに招待してください" },
  DISCORD_MANAGE_ROLES_MISSING: { message: "Botに「ロールの管理」権限がありません", fix: "サーバー設定 → ロール → Bot → 「ロールの管理」をON" },
  DISCORD_ROLE_NOT_FOUND: { message: "指定ロールが見つかりません", fix: "ロールIDが正しいか確認してください" },
  DISCORD_ROLE_HIERARCHY_INVALID: { message: "Botの役職が対象ロールより下位です", fix: "サーバー設定 → ロール で、Botの役職を対象ロールより上に移動" },
};

export default function SellerDiscordSettings() {
  const [guildId, setGuildId] = useState(mockSellerDiscord.guildId);
  const [defaultRoleId, setDefaultRoleId] = useState(mockSellerDiscord.defaultRoleId);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const runVerify = () => {
    setVerifyStatus("checking");
    setTimeout(() => {
      if (guildId.length >= 10 && defaultRoleId.length > 0) {
        setVerifyResult({ botInstalled: true, manageRoles: true, roleExists: true, roleHierarchy: true, errorCode: null });
        setVerifyStatus("ok");
      } else {
        setVerifyResult({ botInstalled: guildId.length >= 10, manageRoles: false, roleExists: false, roleHierarchy: false, errorCode: guildId.length < 10 ? "DISCORD_GUILD_ACCESS_DENIED" : "DISCORD_ROLE_NOT_FOUND" });
        setVerifyStatus("error");
      }
    }, 1500);
  };

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
            <p className="font-semibold">{mockSellerDiscord.guildName}</p>
            <Badge variant={mockSellerDiscord.botConnected ? "default" : "destructive"}>
              {mockSellerDiscord.botConnected ? "Bot接続済" : "Bot未接続"}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">最終検証: {formatDateTimeJP(mockSellerDiscord.lastVerifiedAt)}</p>
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
          <CheckItem ok={verifyResult.manageRoles} label="Manage Roles権限あり" />
          <CheckItem ok={verifyResult.roleExists} label="対象ロール存在" />
          <CheckItem ok={verifyResult.roleHierarchy} label="Bot役職が対象ロールより上位" />

          {verifyResult.errorCode && errorGuides[verifyResult.errorCode] && (
            <div className="bg-card rounded-lg p-3 space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm font-medium text-destructive">{errorGuides[verifyResult.errorCode].message}</p>
              </div>
              <p className="text-xs text-muted-foreground">修正方法: {errorGuides[verifyResult.errorCode].fix}</p>
              <div className="bg-muted rounded p-3 text-center text-xs text-muted-foreground border border-dashed">
                📷 修正手順の画像ガイド（準備中）
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Button className="w-full">設定を保存</Button>
        <Button variant="outline" className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" />Bot再招待リンクを生成
        </Button>
      </div>
    </div>
  );
}
