import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccess() {
  return (
    <div className="glass-card rounded-xl p-6 text-center space-y-4">
      <CheckCircle className="h-16 w-16 mx-auto text-success" />
      <h1 className="text-xl font-bold">決済が完了しました！</h1>
      <p className="text-sm text-muted-foreground">
        ファンクラブへのご参加ありがとうございます。次のステップでDiscordアカウントを連携してください。
      </p>
      <Button asChild className="w-full">
        <Link to="/buyer/discord/confirm">Discordを連携する</Link>
      </Button>
    </div>
  );
}
