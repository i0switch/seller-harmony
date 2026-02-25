import { mockSellerStats, mockSellerAnnouncements, mockSellerDiscord, mockPlans, mockMembers, formatCurrency, stripeStatusLabel } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Package, TrendingUp, TrendingDown, UserPlus, Webhook, CreditCard, AlertTriangle, Megaphone, MessageCircle } from "lucide-react";

export default function SellerDashboard() {
  const errorMembers = mockMembers.filter((m) => m.lastError);
  const stripeStatus = "verified" as const;

  const stats = [
    { label: "有効会員数", value: String(mockSellerStats.totalMembers), icon: Users, link: "/seller/members" },
    { label: "アクティブプラン", value: String(mockSellerStats.activePlans), icon: Package, link: "/seller/plans" },
    { label: "月間売上", value: formatCurrency(mockSellerStats.mrr), icon: TrendingUp },
    { label: "解約率", value: `${mockSellerStats.churnRate}%`, icon: TrendingDown },
    { label: "今月の新規", value: `+${mockSellerStats.newMembersThisMonth}`, icon: UserPlus },
    { label: "エラー件数", value: String(errorMembers.length), icon: AlertTriangle, alert: errorMembers.length > 0 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">ダッシュボード</h2>

      {/* System Announcements */}
      {mockSellerAnnouncements.map((a) => (
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
      {!mockSellerDiscord.botConnected && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
          <MessageCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-destructive">Discord Bot未接続</p>
            <p className="text-xs text-muted-foreground mt-1">ロールの自動付与が行われません。Discord設定を確認してください。</p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/seller/settings/discord">Discord設定へ</Link>
            </Button>
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s) => {
          const cls = `glass-card rounded-xl p-4 hover:shadow-md transition-shadow ${s.alert ? "border-destructive/40" : ""}`;
          const inner = (
            <>
              <div className={`flex items-center gap-2 mb-2 ${s.alert ? "text-destructive" : "text-muted-foreground"}`}>
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
              <p className="text-xs text-muted-foreground">{mockPlans.filter((p) => p.status === "published").length}件公開中</p>
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
