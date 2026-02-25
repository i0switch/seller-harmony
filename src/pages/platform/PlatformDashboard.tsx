import { mockPlatformStats, mockAlerts, mockKillSwitches, formatCurrency, formatDateTimeJP } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Users, UserCheck, UserX, Webhook, RefreshCw, MessageCircle, AlertTriangle, AlertCircle, Info, Megaphone, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const kpiCards = [
  { label: "契約中テナント", value: mockPlatformStats.activeTenants, icon: UserCheck, link: "/platform/tenants" },
  { label: "試用中テナント", value: mockPlatformStats.trialTenants, icon: Users, link: "/platform/tenants" },
  { label: "停止中テナント", value: mockPlatformStats.suspendedTenants, icon: UserX, link: "/platform/tenants", alert: mockPlatformStats.suspendedTenants > 0 },
  { label: "Webhook失敗", value: mockPlatformStats.webhookFailures, icon: Webhook, link: "/platform/webhooks", alert: mockPlatformStats.webhookFailures > 0 },
  { label: "再試行待ち", value: mockPlatformStats.retryPending, icon: RefreshCw, link: "/platform/retry-queue", alert: mockPlatformStats.retryPending > 0 },
  { label: "Discord API失敗", value: mockPlatformStats.discordApiFailures, icon: MessageCircle, alert: mockPlatformStats.discordApiFailures > 0 },
];

const alertIcon = { error: AlertCircle, warning: AlertTriangle, info: Info };
const alertColor = { error: "text-destructive", warning: "text-warning", info: "text-accent" };

export default function PlatformDashboard() {
  const unresolvedAlerts = mockAlerts.filter((a) => !a.resolved);
  const activeKillSwitches = mockKillSwitches.filter((k) => k.enabled);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">ダッシュボード</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map((k) => {
          const content = (
            <>
              <div className={`flex items-center gap-2 mb-2 ${k.alert ? "text-destructive" : "text-muted-foreground"}`}>
                <k.icon className="h-4 w-4" />
                <span className="text-xs">{k.label}</span>
              </div>
              <p className="text-2xl font-bold">{k.value}</p>
            </>
          );
          const cls = `glass-card rounded-xl p-4 hover:shadow-md transition-shadow ${k.alert ? "border-destructive/40" : ""}`;
          return k.link ? (
            <Link key={k.label} to={k.link} className={cls}>{content}</Link>
          ) : (
            <div key={k.label} className={cls}>{content}</div>
          );
        })}
      </div>

      {/* Kill Switch Warning */}
      {activeKillSwitches.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <Shield className="h-5 w-5" />
            Kill Switch 有効中
          </div>
          {activeKillSwitches.map((k) => (
            <p key={k.id} className="text-sm text-muted-foreground">• {k.name}</p>
          ))}
          <Button asChild size="sm" variant="outline">
            <Link to="/platform/system-control">管理画面へ</Link>
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">最新アラート</h3>
            <Badge variant={unresolvedAlerts.length > 0 ? "destructive" : "secondary"}>
              {unresolvedAlerts.length}件 未解決
            </Badge>
          </div>
          {unresolvedAlerts.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
              アラートはありません
            </div>
          ) : (
            <div className="space-y-2">
              {unresolvedAlerts.slice(0, 5).map((a) => {
                const Icon = alertIcon[a.level];
                return (
                  <div key={a.id} className="glass-card rounded-lg p-3 flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${alertColor[a.level]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDateTimeJP(a.timestamp)} ・ {a.source}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">クイック操作</h3>
          <div className="grid grid-cols-1 gap-2">
            <Button asChild variant="outline" className="justify-start h-auto py-3">
              <Link to="/platform/announcements" className="flex items-center gap-3">
                <Megaphone className="h-5 w-5 text-accent" />
                <div className="text-left">
                  <p className="font-medium">お知らせ作成</p>
                  <p className="text-xs text-muted-foreground">テナント向けお知らせを配信</p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-auto py-3">
              <Link to="/platform/retry-queue" className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-accent" />
                <div className="text-left">
                  <p className="font-medium">リトライキュー確認</p>
                  <p className="text-xs text-muted-foreground">{mockPlatformStats.retryPending}件 待機中</p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-auto py-3">
              <Link to="/platform/system-control" className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-accent" />
                <div className="text-left">
                  <p className="font-medium">システム制御</p>
                  <p className="text-xs text-muted-foreground">Kill Switch管理</p>
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
