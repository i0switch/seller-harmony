import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, MessageCircle, AlertTriangle, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDateJP } from "@/lib/mockData";

const mockCheckout = {
  planName: "プレミアム会員",
  sellerName: "星野アイ",
  planType: "subscription" as const,
  price: 2980,
  currency: "JPY",
  nextBillingDate: "2025-03-25",
  guildName: "星野ファンクラブ",
};

export default function CheckoutSuccess() {
  const [showLater, setShowLater] = useState(false);
  const plan = mockCheckout;

  return (
    <div className="space-y-5">
      {/* Success Header */}
      <div className="glass-card rounded-xl p-6 text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <h1 className="text-xl font-bold">決済が完了しました！</h1>
        <p className="text-sm text-muted-foreground">
          ご購入ありがとうございます。
        </p>
      </div>

      {/* Purchase Details */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> 購入内容
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">プラン</span>
            <span className="font-medium">{plan.planName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">販売者</span>
            <span className="font-medium">{plan.sellerName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">金額</span>
            <span className="font-bold text-base">{formatCurrency(plan.price)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">種別</span>
            <Badge variant="secondary">{plan.planType === "subscription" ? "月額" : "単発"}</Badge>
          </div>
          {plan.planType === "subscription" && plan.nextBillingDate && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> 次回請求日
              </span>
              <span className="font-medium">{formatDateJP(plan.nextBillingDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Discord CTA */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="text-center space-y-2">
          <MessageCircle className="h-10 w-10 mx-auto text-accent" />
          <h2 className="font-bold">Discordに参加して連携しよう</h2>
          <p className="text-sm text-muted-foreground">
            「{plan.guildName}」サーバーに参加し、限定コンテンツにアクセスしましょう。
          </p>
        </div>

        <Button asChild className="w-full h-12 text-base font-bold">
          <Link to="/buyer/discord/confirm">
            <MessageCircle className="h-5 w-5 mr-2" />
            Discordを連携する
          </Link>
        </Button>

        {!showLater && (
          <button
            onClick={() => setShowLater(true)}
            className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            あとで連携する
          </button>
        )}

        {showLater && (
          <div className="glass-card rounded-lg p-3 text-sm space-y-2">
            <p className="text-muted-foreground">
              マイページからいつでもDiscord連携できます。
            </p>
            <Button variant="outline" asChild size="sm" className="w-full">
              <Link to="/member/me">マイページへ</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Discord連携をしないと、限定サーバーの権限が付与されない場合があります。お早めに連携をお済ませください。
        </AlertDescription>
      </Alert>
    </div>
  );
}
