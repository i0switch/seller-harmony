import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export default function DiscordConfirm() {
  const navigate = useNavigate();

  return (
    <div className="glass-card rounded-xl p-6 text-center space-y-4">
      <MessageCircle className="h-16 w-16 mx-auto text-accent" />
      <h1 className="text-xl font-bold">Discord連携</h1>
      <p className="text-sm text-muted-foreground">
        Discordアカウントを連携して、限定コミュニティに参加しましょう。
      </p>
      <div className="glass-card rounded-lg p-4 text-left text-sm space-y-2">
        <p>連携すると以下が行われます：</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Discordアカウントの認証</li>
          <li>ファンクラブサーバーへの自動参加</li>
          <li>購入プランに応じたロール付与</li>
        </ul>
      </div>
      <Button onClick={() => navigate("/buyer/discord/result")} className="w-full">
        Discordで認証する（モック）
      </Button>
    </div>
  );
}
