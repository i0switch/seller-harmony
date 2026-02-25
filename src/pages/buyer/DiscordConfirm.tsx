import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, AlertTriangle, RotateCcw, User } from "lucide-react";

const mockDiscordUser = {
  username: "user_taro#1234",
  avatar: "🎮",
  id: "123456789012345678",
};

export default function DiscordConfirm() {
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      navigate("/buyer/discord/result?status=success");
    }, 1200);
  };

  const handleRetry = () => {
    // Mock: would re-trigger Discord OAuth
    window.location.reload();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-card rounded-xl p-6 text-center space-y-3">
        <MessageCircle className="h-12 w-12 mx-auto text-accent" />
        <h1 className="text-xl font-bold">Discord連携の確認</h1>
        <p className="text-sm text-muted-foreground">
          以下のDiscordアカウントで連携します。正しいか確認してください。
        </p>
      </div>

      {/* Discord User Info */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-3xl">
            {mockDiscordUser.avatar}
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">{mockDiscordUser.username}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              ID: {mockDiscordUser.id}
            </p>
            <Badge variant="default" className="mt-1">OAuth認証済み</Badge>
          </div>
        </div>
      </div>

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <span className="font-semibold">スマホの方へ：</span>ブラウザでログイン中のDiscordアカウントが表示されます。
          普段と違うアカウントの場合は、「別のアカウントで連携する」を選んでください。
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
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              連携中...
            </span>
          ) : (
            "このアカウントで連携する"
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleRetry}
          disabled={isConfirming}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          別のアカウントで連携する
        </Button>
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
