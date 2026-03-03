import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, MessageCircle, AlertTriangle, Clock, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDateJP } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutData {
  planName: string;
  sellerName: string;
  planType: "subscription" | "one_time";
  price: number;
  currency: string;
  nextBillingDate?: string;
  guildName?: string;
}

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [showLater, setShowLater] = useState(false);
  const [plan, setPlan] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCheckoutData() {
      if (!sessionId) {
        setWarning("セッション情報が見つからないため、標準表示でご案内しています。");
        setLoading(false);
        return;
      }
      try {
        // Supabaseから session_id に紐づく membership + plan を取得
        const { data: membership, error: membershipError } = await supabase
          .from("memberships")
          .select(`
            *,
            plans:plan_id (name, price, currency, interval, discord_server_id)
          `)
          .eq("stripe_checkout_session_id", sessionId)
          .maybeSingle();

        if (membershipError) throw membershipError;

        if (membership) {
          const planData = membership.plans as { name?: string; price?: number; currency?: string; interval?: string; discord_server_id?: string } | null;

          // seller_profiles を別クエリで取得 (直接FKなし)
          let sellerStoreName = "販売者";
          if (membership.seller_id) {
            const { data: sellerData } = await supabase
              .from("seller_profiles")
              .select("store_name")
              .eq("user_id", membership.seller_id)
              .maybeSingle();
            sellerStoreName = sellerData?.store_name || "販売者";
          }

          // Discord server名の取得
          let guildName = "";
          if (planData?.discord_server_id) {
            const { data: server } = await supabase
              .from("discord_servers")
              .select("guild_name")
              .eq("id", planData.discord_server_id)
              .maybeSingle();
            guildName = server?.guild_name || "";
          }

          setPlan({
            planName: planData?.name || "プラン",
            sellerName: sellerStoreName,
            planType: planData?.interval === "one_time" ? "one_time" : "subscription",
            price: planData?.price || 0,
            currency: planData?.currency || "JPY",
            nextBillingDate: planData?.interval !== "one_time"
              ? (membership.current_period_end
                  ? new Date(membership.current_period_end).toISOString().split("T")[0]
                  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
              : undefined,
            guildName,
          });
        } else {
          setWarning("購入情報の反映待ちのため、標準表示でご案内しています。");
        }
      } catch (err) {
        console.error("Checkout data fetch error:", err);
        setWarning("購入情報の読み込みに失敗したため、標準表示でご案内しています。");
      } finally {
        setLoading(false);
      }
    }
    fetchCheckoutData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Fallback UI when plan data is not available (no session_id, webhook pending, etc.)
  if (!plan) {
    return (
      <div className="space-y-5">
        {warning && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}

        <div className="glass-card rounded-xl p-6 text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-xl font-bold">ありがとうございます！</h1>
          <p className="text-sm text-muted-foreground">
            購入処理が完了しました。詳しい情報はマイページでご確認いただけます。
          </p>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="text-center space-y-2">
            <MessageCircle className="h-10 w-10 mx-auto text-accent" />
            <h2 className="font-bold">Discordに参加して連携しよう</h2>
            <p className="text-sm text-muted-foreground">
              限定サーバーに参加し、限定コンテンツにアクセスしましょう。
            </p>
          </div>
          <Button asChild className="w-full h-12 text-base font-bold">
            <Link to="/buyer/discord/confirm">
              <MessageCircle className="h-5 w-5 mr-2" />
              Discordを連携する
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm" className="w-full">
            <Link to="/member/me">マイページへ</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {warning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}

      <div className="glass-card rounded-xl p-6 text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <h1 className="text-xl font-bold">決済が完了しました！</h1>
        <p className="text-sm text-muted-foreground">ご購入ありがとうございます。</p>
      </div>

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

      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="text-center space-y-2">
          <MessageCircle className="h-10 w-10 mx-auto text-accent" />
          <h2 className="font-bold">Discordに参加して連携しよう</h2>
          <p className="text-sm text-muted-foreground">
            「{plan.guildName || "限定"}」サーバーに参加し、限定コンテンツにアクセスしましょう。
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
            <p className="text-muted-foreground">マイページからいつでもDiscord連携できます。</p>
            <Button variant="outline" asChild size="sm" className="w-full">
              <Link to="/member/me">マイページへ</Link>
            </Button>
          </div>
        )}
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Discord連携をしないと、限定サーバーの権限が付与されない場合があります。お早めに連携をお済ませください。
        </AlertDescription>
      </Alert>
    </div>
  );
}
