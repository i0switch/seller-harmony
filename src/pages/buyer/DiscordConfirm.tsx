import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, AlertTriangle, RotateCcw, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function DiscordConfirm() {
  const [isConfirming, setIsConfirming] = useState(false);
  const [discordUser, setDiscordUser] = useState<{ username: string; avatar: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const maskDiscordId = (value: string) => {
    if (!value) return "";
    if (value.length <= 4) return "****";
    return `****${value.slice(-4)}`;
  };

  useEffect(() => {
    async function fetchDiscordIdentity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("discord_identities")
        .select("discord_user_id, discord_username")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setDiscordUser({
          username: data.discord_username || "Unknown",
          avatar: "🎮", // Avatar URL is not stored yet, using icon as fallback
          id: data.discord_user_id,
        });
      }
      setLoading(false);
    }
    fetchDiscordIdentity();
  }, []);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const state = crypto.randomUUID();
      sessionStorage.setItem("discord_oauth_state", state);

      const { data, error } = await supabase.functions.invoke('discord-oauth', {
        body: { redirect_uri: `${window.location.origin}/buyer/discord/result`, state }
      });

      if (error || !data?.url) throw new Error("Failed to get authorization URL");

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setIsConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-card rounded-xl p-6 text-center space-y-3">
        <MessageCircle className="h-12 w-12 mx-auto text-accent" />
        <h1 className="text-xl font-bold">Discord連携{discordUser ? "の確認" : ""}</h1>
        <p className="text-sm text-muted-foreground">
          {discordUser
            ? "以下のDiscordアカウントで連携します。正しいか確認してください。"
            : "Discordアカウントを連携して、限定サーバーに参加しましょう。"}
        </p>
      </div>

      {/* Discord User Info (Only if already connected once) */}
      {discordUser && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-3xl">
              {discordUser.avatar}
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">{discordUser.username}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                ID: {maskDiscordId(discordUser.id)}
              </p>
              <Badge variant="default" className="mt-1">OAuth認証済み</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <span className="font-semibold">重要：</span>ブラウザでログイン中のDiscordアカウントが連携されます。
          {discordUser ? " 普段と違うアカウントの場合は、「別のアカウントで連携する」を選んでください。" : ""}
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="w-full h-12 text-base font-bold"
        >
          {isConfirming ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              連携中...
            </span>
          ) : (
            discordUser ? "このアカウントで連携する" : "Discordを連携する"
          )}
        </Button>

        {discordUser && (
          <Button
            variant="outline"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            別のアカウントで連携する
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="glass-card rounded-lg p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground">連携すると以下が行われます：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Discordアカウントの認証情報の確認</li>
          <li>ファンクラブサーバーへの自動参加</li>
          <li>購入プランに応じたロールの付与</li>
        </ul>
      </div>
    </div>
  );
}
