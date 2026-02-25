import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard, MessageCircle, RefreshCw, Shield, ExternalLink, AlertTriangle,
  ChevronDown, ChevronUp, Clock, User,
} from "lucide-react";
import { ConfirmDialog, EmptyState, LoadingSkeleton, ErrorBanner } from "@/components/shared";
import { buyerApi } from "@/services/api";
import {
  BuyerMembership, membershipStatusLabel, membershipStatusVariant,
  discordLinkStatusLabel, discordLinkStatusVariant,
  roleStatusLabel, roleStatusVariant,
  formatCurrency, formatDateJP,
} from "@/types";
import { useToast } from "@/hooks/use-toast";

function PlanCard({ plan }: { plan: BuyerMembership }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const needsAction = plan.status === "payment_failed" || plan.status === "pending_discord" ||
    plan.discordLinkStatus !== "linked" || plan.roleStatus === "failed";

  const handleRoleRequest = () => {
    buyerApi.requestRoleGrant(plan.id).then(() => {
      toast({ title: "リクエスト送信", description: "ロール再付与リクエストを送信しました。" });
    });
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold">{plan.planName}</h3>
            <p className="text-xs text-muted-foreground">{plan.sellerName}</p>
          </div>
          <Badge variant={membershipStatusVariant[plan.status]}>
            {membershipStatusLabel[plan.status]}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-lg">{formatCurrency(plan.price)}</span>
          <Badge variant="secondary">{plan.planType === "subscription" ? "月額" : "単発"}</Badge>
        </div>

        {needsAction && (
          <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/5 rounded-lg p-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {plan.status === "pending_discord" && "Discord連携をして権限を受け取ってください。"}
              {plan.status === "payment_failed" && "決済に失敗しています。お支払い情報を確認してください。"}
              {plan.status !== "pending_discord" && plan.status !== "payment_failed" && plan.discordLinkStatus !== "linked" && "Discord連携が必要です。"}
              {plan.roleStatus === "failed" && plan.discordLinkStatus === "linked" && plan.status !== "payment_failed" && plan.status !== "pending_discord" && "ロール付与でエラーが発生しています。"}
            </span>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "閉じる" : "詳細を見る"}
        </button>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" /> Discord
              </span>
              <div className="flex items-center gap-1.5">
                {plan.discordLinkStatus === "linked" ? (
                  <span className="font-medium">{plan.discordUsername}</span>
                ) : (
                  <Badge variant={discordLinkStatusVariant[plan.discordLinkStatus]}>
                    {discordLinkStatusLabel[plan.discordLinkStatus]}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> ロール
              </span>
              <div className="flex items-center gap-1.5">
                {plan.roleStatus === "granted" && <span className="font-medium">{plan.roleName}</span>}
                <Badge variant={roleStatusVariant[plan.roleStatus]}>
                  {roleStatusLabel[plan.roleStatus]}
                </Badge>
              </div>
            </div>
            {plan.guildName && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">サーバー</span>
                <span className="font-medium">{plan.guildName}</span>
              </div>
            )}
            {plan.nextBillingDate && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> 次回請求
                </span>
                <span className="font-medium">{formatDateJP(plan.nextBillingDate)}</span>
              </div>
            )}
            {plan.expiresAt && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">有効期限</span>
                <span className="font-medium">{formatDateJP(plan.expiresAt)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">購入日</span>
              <span className="font-medium">{formatDateJP(plan.purchasedAt)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {(plan.discordLinkStatus === "not_linked" || plan.discordLinkStatus === "relink_required" || plan.discordLinkStatus === "token_expired") &&
              plan.status !== "expired" && plan.status !== "refunded" && (
                <Button asChild size="sm" className="w-full">
                  <Link to="/buyer/discord/confirm">
                    <MessageCircle className="h-4 w-4 mr-1" /> Discord連携する
                  </Link>
                </Button>
              )}
            {plan.roleStatus === "failed" && (
              <Button variant="outline" size="sm" className="w-full" onClick={handleRoleRequest}>
                <RefreshCw className="h-4 w-4 mr-1" /> ロール再付与をリクエスト
              </Button>
            )}
            {plan.discordLinkStatus === "linked" && plan.roleStatus !== "granted" && plan.roleStatus !== "failed" && (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/buyer/discord/confirm">
                  <RefreshCw className="h-4 w-4 mr-1" /> 再連携する
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemberMe() {
  const { data: memberships = [], isLoading, error, refetch } = useQuery({
    queryKey: ["buyer", "memberships"],
    queryFn: () => buyerApi.getMemberships(),
  });

  if (isLoading) return <LoadingSkeleton type="cards" rows={3} />;
  if (error) return <ErrorBanner error={error} onRetry={refetch} />;

  const activePlans = memberships.filter(p =>
    ["active", "grace_period", "cancel_scheduled", "payment_failed", "pending_discord"].includes(p.status)
  );
  const pastPlans = memberships.filter(p =>
    ["expired", "refunded", "canceled"].includes(p.status)
  );

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-2xl">
            <User className="h-7 w-7 text-accent" />
          </div>
          <div>
            <h1 className="font-bold text-lg">user_taro#1234</h1>
            <p className="text-sm text-muted-foreground">taro.buyer@example.com</p>
          </div>
        </div>
      </div>

      {activePlans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">参加中のプラン</h2>
          {activePlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
        </div>
      )}

      {pastPlans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">過去のプラン</h2>
          {pastPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
        </div>
      )}

      {memberships.length === 0 && (
        <EmptyState icon={CreditCard} title="参加中のプランはありません" />
      )}

      <div className="space-y-2">
        <Button variant="outline" className="w-full" asChild>
          <a href="https://billing.stripe.com/p/login/test" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> 領収書・請求情報を確認する
          </a>
        </Button>

        <ConfirmDialog
          trigger={
            <Button variant="outline" className="w-full text-destructive hover:text-destructive">
              アカウント削除
            </Button>
          }
          title="アカウントを削除しますか？"
          description="この操作は取り消せません。すべてのプランが解約され、Discord連携も解除されます。"
          confirmLabel="削除する"
          destructive
          onConfirm={() => { }}
        />
      </div>
    </div>
  );
}
