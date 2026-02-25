import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CreditCard, MessageCircle, RefreshCw, Shield, ExternalLink, AlertTriangle,
  ChevronDown, ChevronUp, Clock, User,
} from "lucide-react";
import {
  mockBuyerPlans, BuyerPlan, formatCurrency, formatDateJP,
  buyerBillingStatusLabel, buyerBillingStatusVariant,
  buyerDiscordStatusLabel, buyerRoleStatusLabel, buyerRoleStatusVariant,
} from "@/lib/mockData";

function PlanCard({ plan }: { plan: BuyerPlan }) {
  const [expanded, setExpanded] = useState(false);

  const needsAction = plan.billingStatus === "payment_failed" || plan.discordStatus !== "linked" || plan.roleStatus === "error";

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold">{plan.planName}</h3>
            <p className="text-xs text-muted-foreground">{plan.sellerName}</p>
          </div>
          <Badge variant={buyerBillingStatusVariant[plan.billingStatus]}>
            {buyerBillingStatusLabel[plan.billingStatus]}
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
              {plan.billingStatus === "payment_failed" && "決済に失敗しています。お支払い情報を確認してください。"}
              {plan.discordStatus !== "linked" && plan.billingStatus !== "payment_failed" && "Discord連携が必要です。"}
              {plan.roleStatus === "error" && plan.discordStatus === "linked" && plan.billingStatus !== "payment_failed" && "ロール付与でエラーが発生しています。"}
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

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" /> Discord
              </span>
              <span className="font-medium">
                {plan.discordStatus === "linked" ? plan.discordUsername : buyerDiscordStatusLabel[plan.discordStatus]}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> ロール
              </span>
              <div className="flex items-center gap-1.5">
                {plan.roleStatus === "granted" && <span className="font-medium">{plan.roleName}</span>}
                <Badge variant={buyerRoleStatusVariant[plan.roleStatus]}>
                  {buyerRoleStatusLabel[plan.roleStatus]}
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

          {/* Actions */}
          <div className="space-y-2 pt-1">
            {plan.discordStatus !== "linked" && plan.billingStatus !== "expired" && plan.billingStatus !== "refunded" && (
              <Button asChild size="sm" className="w-full">
                <Link to="/buyer/discord/confirm">
                  <MessageCircle className="h-4 w-4 mr-1" /> Discord連携する
                </Link>
              </Button>
            )}
            {plan.roleStatus === "error" && (
              <Button variant="outline" size="sm" className="w-full">
                <RefreshCw className="h-4 w-4 mr-1" /> ロール再付与をリクエスト
              </Button>
            )}
            {plan.discordStatus === "linked" && plan.roleStatus !== "granted" && plan.roleStatus !== "error" && (
              <Button variant="outline" size="sm" className="w-full">
                <RefreshCw className="h-4 w-4 mr-1" /> 再連携する
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemberMe() {
  const [isLoading] = useState(false);
  const plans = mockBuyerPlans;
  const activePlans = plans.filter(p => p.billingStatus === "active" || p.billingStatus === "grace_period" || p.billingStatus === "cancel_scheduled" || p.billingStatus === "payment_failed");
  const pastPlans = plans.filter(p => p.billingStatus === "expired" || p.billingStatus === "refunded");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

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

      {/* Active Plans */}
      {activePlans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">参加中のプラン</h2>
          {activePlans.map(plan => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}

      {/* Past Plans */}
      {pastPlans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">過去のプラン</h2>
          {pastPlans.map(plan => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {plans.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center space-y-3">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">参加中のプランはありません</p>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="space-y-2">
        <Button variant="outline" className="w-full" asChild>
          <a href="https://billing.stripe.com/p/login/test" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            領収書・請求情報を確認する
          </a>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full text-destructive hover:text-destructive">
              アカウント削除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>アカウントを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。すべてのプランが解約され、Discord連携も解除されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
