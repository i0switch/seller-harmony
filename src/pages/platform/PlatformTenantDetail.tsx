import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tenantStatusLabel, tenantStatusVariant, stripeStatusLabel, formatCurrency, formatDateTimeJP, formatDateJP } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, AlertTriangle, Info, Pause, Play } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { platformApi } from "@/services/api";
import { ErrorBanner, LoadingSkeleton } from "@/components/shared";

const alertIcon = { error: AlertCircle, warning: AlertTriangle, info: Info };
const alertColor = { error: "text-destructive", warning: "text-warning", info: "text-accent" };

export default function PlatformTenantDetail() {
  const { id } = useParams();

  const { data: tenant, isLoading: tenantLoading, error: tenantError } = useQuery({
    queryKey: ["platform", "tenants", id],
    queryFn: () => platformApi.getTenantById(id!),
    enabled: !!id,
  });

  const { data: allAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["platform", "alerts"],
    queryFn: () => platformApi.getAlerts(),
  });

  if (tenantError) {
    return (
      <div className="space-y-4">
        <Link to="/platform/tenants" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> テナント一覧へ戻る
        </Link>
        <ErrorBanner error={tenantError} />
      </div>
    );
  }

  if (tenantLoading || alertsLoading) {
    return (
      <div className="space-y-4">
        <Link to="/platform/tenants" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> テナント一覧へ戻る
        </Link>
        <LoadingSkeleton type="cards" rows={2} />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Link to="/platform/tenants" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> テナント一覧へ戻る
        </Link>
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">テナントが見つかりません</div>
      </div>
    );
  }

  const tenantAlerts = (allAlerts || []).filter((a) => a.tenantName === tenant.name && !a.resolved);

  return (
    <div className="space-y-6">
      <Link to="/platform/tenants" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> テナント一覧へ戻る
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{tenant.name}</h2>
          <p className="text-sm text-muted-foreground">{tenant.email}</p>
        </div>
        <div className="flex gap-2">
          {tenant.status === "active" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Pause className="h-4 w-4 mr-1" /> 停止</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>テナントを停止しますか？</AlertDialogTitle>
                  <AlertDialogDescription>{tenant.name} のサービスを停止します。新規決済・ロール付与が停止されます。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground">停止する</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {tenant.status === "suspended" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm"><Play className="h-4 w-4 mr-1" /> 再開</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>テナントを再開しますか？</AlertDialogTitle>
                  <AlertDialogDescription>{tenant.name} のサービスを再開します。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction>再開する</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-lg">基本情報</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <p className="text-muted-foreground">契約状態</p>
              <Badge variant={tenantStatusVariant[tenant.status]} className="mt-1">{tenantStatusLabel[tenant.status]}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">登録日</p>
              <p className="font-medium mt-1">{formatDateJP(tenant.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">最終アクティブ</p>
              <p className="font-medium mt-1">{formatDateTimeJP(tenant.lastActiveAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">会員数</p>
              <p className="font-medium mt-1">{tenant.memberCount}名</p>
            </div>
            <div>
              <p className="text-muted-foreground">月間売上</p>
              <p className="font-medium mt-1">{formatCurrency(tenant.mrr)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">エラー件数</p>
              <p className="font-medium mt-1">
                {tenant.errorCount > 0 ? <Badge variant="destructive">{tenant.errorCount}</Badge> : "0"}
              </p>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-lg">接続状態</h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stripe Connect</span>
              <Badge variant={tenant.stripeStatus === "verified" ? "default" : tenant.stripeStatus === "restricted" ? "destructive" : "outline"}>
                {stripeStatusLabel[tenant.stripeStatus]}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discord Bot</span>
              <Badge variant={tenant.discordConnected ? "default" : "outline"}>
                {tenant.discordConnected ? "接続済" : "未接続"}
              </Badge>
            </div>
            {tenant.discordGuild && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discordサーバー</span>
                <span className="font-medium">{tenant.discordGuild}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">最近のエラー・アラート</h3>
          <Badge variant={tenantAlerts.length > 0 ? "destructive" : "secondary"}>{tenantAlerts.length}件</Badge>
        </div>
        {tenantAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">エラー・アラートはありません</p>
        ) : (
          <div className="space-y-2">
            {tenantAlerts.map((a) => {
              const Icon = alertIcon[a.level];
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${alertColor[a.level]}`} />
                  <div>
                    <p className="text-sm">{a.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTimeJP(a.timestamp)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
