import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, AlertTriangle, MessageCircle, RotateCcw, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const mockSuccessResult = {
  discordUsername: "user_taro#1234",
  guildName: "星野ファンクラブ",
  roleName: "プレミアム",
  planName: "プレミアム会員",
};

const mockFailureResult = {
  errorMessage: "Discordサーバーへの参加に失敗しました。サーバーの招待設定を確認してください。",
  errorCode: "DISCORD_GUILD_ACCESS_DENIED",
  sellerContact: "support@hoshino-fanclub.com",
};

export default function DiscordResult() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") || "success";

  if (status === "success") {
    return (
      <div className="space-y-5">
        {/* Success */}
        <div className="glass-card rounded-xl p-6 text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-xl font-bold">連携完了！🎉</h1>
          <p className="text-sm text-muted-foreground">
            Discordサーバーに参加し、ロールが付与されました。
          </p>
        </div>

        {/* Details */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Discordアカウント</span>
              <span className="font-medium">{mockSuccessResult.discordUsername}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">参加サーバー</span>
              <span className="font-medium">{mockSuccessResult.guildName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">付与ロール</span>
              <Badge variant="default">{mockSuccessResult.roleName}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">プラン</span>
              <span className="font-medium">{mockSuccessResult.planName}</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold">次のステップ</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <MessageCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <p>Discordアプリで「{mockSuccessResult.guildName}」サーバーを確認してください</p>
            </div>
            <div className="flex items-start gap-2">
              <ExternalLink className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <p>限定チャンネルにアクセスできるようになっています</p>
            </div>
          </div>
        </div>

        <Button asChild className="w-full h-12 text-base font-bold">
          <Link to="/member/me">マイページへ</Link>
        </Button>
      </div>
    );
  }

  // Failure state
  return (
    <div className="space-y-5">
      <div className="glass-card rounded-xl p-6 text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <XCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">連携に失敗しました</h1>
        <p className="text-sm text-muted-foreground">
          Discord連携中に問題が発生しました。以下をご確認ください。
        </p>
      </div>

      {/* Error Details */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {mockFailureResult.errorMessage}
        </AlertDescription>
      </Alert>

      <div className="glass-card rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold">考えられる原因</h2>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>Discordサーバーの招待リンクが無効になっている</li>
          <li>Botがサーバーから削除されている</li>
          <li>一時的なDiscordの障害が発生している</li>
        </ul>
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <span>エラーコード:</span>
          <Badge variant="outline" className="font-mono text-xs">{mockFailureResult.errorCode}</Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button asChild className="w-full h-12 text-base font-bold">
          <Link to="/buyer/discord/confirm">
            <RotateCcw className="h-5 w-5 mr-2" />
            もう一度連携する
          </Link>
        </Button>

        <div className="glass-card rounded-lg p-4 text-sm space-y-2">
          <p className="font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4" /> 解決しない場合
          </p>
          <p className="text-muted-foreground text-xs">
            販売者へお問い合わせください。エラーコードをお伝えいただくとスムーズです。
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            {mockFailureResult.sellerContact}
          </p>
        </div>

        <Button variant="outline" asChild className="w-full">
          <Link to="/member/me">マイページへ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
