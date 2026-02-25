import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DiscordResult() {
  return (
    <div className="glass-card rounded-xl p-6 text-center space-y-4">
      <CheckCircle className="h-16 w-16 mx-auto text-success" />
      <h1 className="text-xl font-bold">連携完了！</h1>
      <p className="text-sm text-muted-foreground">
        Discordサーバーに参加し、ロールが付与されました。
      </p>
      <div className="glass-card rounded-lg p-4 text-left text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Discord</span>
          <span className="font-medium">user_taro#1234</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">サーバー</span>
          <span className="font-medium">星野ファンクラブ</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">ロール</span>
          <span className="font-medium">プレミアム</span>
        </div>
      </div>
      <Button asChild className="w-full">
        <Link to="/member/me">マイページへ</Link>
      </Button>
    </div>
  );
}
