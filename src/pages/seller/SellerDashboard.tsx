import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Package, TrendingUp, TrendingDown, UserPlus, Webhook, CreditCard, AlertTriangle, Megaphone, MessageCircle } from "lucide-react";
import { formatCurrency, stripeStatusLabel, StripeConnectStatus } from "@/types";
import { sellerApi } from "@/services/api";
import { ErrorBanner } from "@/components/shared";
import { supabase } from "@/integrations/supabase/client";

export default function SellerDashboard() {
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus>("not_started");

  useEffect(() => {
    async function fetchStripeStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("stripe_connected_accounts")
        .select("charges_enabled, payouts_enabled, details_submitted")
        .eq("seller_id", user.id)
        .maybeSingle();

      if (data?.charges_enabled && data?.payouts_enabled) {
        setStripeStatus("verified");
      } else if (data?.details_submitted) {
        setStripeStatus("pending");
      }
    }
    fetchStripeStatus();
  }, []);

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["seller", "stats"],
    queryFn: () => sellerApi.getStats(),
  });

  const { data: announcements, isLoading: annLoading, error: annError, refetch: refetchAnn } = useQuery({
    queryKey: ["seller", "announcements"],
    queryFn: () => sellerApi.getAnnouncements(),
  });

  const { data: discordSettings, isLoading: discordLoading, error: discordError, refetch: refetchDiscord } = useQuery({
    queryKey: ["seller", "discord", "settings"],
    queryFn: () => sellerApi.getDiscordSettings(),
  });

  const isLoading = statsLoading || annLoading || discordLoading;
  const error = statsError || annError || discordError;

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">ダッシュボード</h2>
        <ErrorBanner error={error} onRetry={() => { refetchStats(); refetchAnn(); refetchDiscord(); }} />
      </div>
    );
  }

  if (isLoading || !stats || !announcements || !discordSettings) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">ダッシュボード</h2>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const statItems = [
    { label: "有効会員数", value: String(stats.totalMembers), icon: Users, link: "/seller/members" },
    { label: "アクティブプラン", value: String(stats.activePlans), icon: Package, link: "/seller/plans" },
    { label: "月間売上", value: formatCurrency(stats.mrr), icon: TrendingUp },
    { label: "解約率", value: `${stats.churnRate}%`, icon: TrendingDown },
    { label: "今月の新規", value: `+${stats.newMembersThisMonth}`, icon: UserPlus },
    { label: "Webhook数(今日)", value: String(stats.webhooksToday), icon: Webhook },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">ダッシュボード</h2>

      {/* System Announcements */}
      {announcements.map((a) => (
        <div key={a.id} className={`rounded-xl p-4 flex items-start gap-3 ${a.severity === "warning" ? "bg-warning/10 border border-warning/30" : "bg-accent/10 border border-accent/30"}`}>
          <Megaphone className={`h-5 w-5 shrink-0 mt-0.5 ${a.severity === "warning" ? "text-warning" : "text-accent"}`} />
          <div>
            <p className="font-semibold text-sm">{a.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{a.body}</p>
          </div>
        </div>
      ))}

      {/* Stripe Status */}
      <div className="glass-card rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-medium">Stripe Connect</p>
            <p className="text-xs text-muted-foreground">決済受付状態</p>
          </div>
        </div>
        <Badge variant="default">{stripeStatusLabel[stripeStatus]}</Badge>
      </div>

      {/* Discord Warning */}
      {!discordSettings.botConnected && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
          <MessageCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-destructive">Discord Bot未接続</p>
            <p className="text-xs text-muted-foreground mt-1">ロールの自動付与が行われません。Discord設定を確認してください。</p>
            <Button asChild size="sm" variant="outline" className="mt-2 text-destructive border-destructive/50 hover:bg-destructive-foreground">
              <Link to="/seller/settings/discord">Discord設定へ</Link>
            </Button>
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statItems.map((s) => {
          const cls = `glass-card rounded-xl p-4 hover:shadow-md transition-shadow`;
          const inner = (
            <>
              <div className={`flex items-center gap-2 mb-2 text-muted-foreground`}>
                <s.icon className="h-4 w-4" />
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="text-xl font-bold">{s.value}</p>
            </>
          );
          return s.link ? (
            <Link key={s.label} to={s.link} className={cls}>{inner}</Link>
          ) : (
            <div key={s.label} className={cls}>{inner}</div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Button asChild variant="outline" className="justify-start h-auto py-3">
          <Link to="/seller/plans" className="flex items-center gap-3">
            <Package className="h-5 w-5 text-accent" />
            <div className="text-left">
              <p className="font-medium">プラン管理</p>
              <p className="text-xs text-muted-foreground">{stats.activePlans}件公開中</p>
            </div>
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-auto py-3">
          <Link to="/seller/crosscheck" className="flex items-center gap-3">
            <Webhook className="h-5 w-5 text-accent" />
            <div className="text-left">
              <p className="font-medium">クロスチェック</p>
              <p className="text-xs text-muted-foreground">Stripe × Discord整合性確認</p>
            </div>
          </Link>
        </Button>
      </div>
    </div>
  );
}
