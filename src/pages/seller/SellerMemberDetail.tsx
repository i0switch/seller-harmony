import { useParams, Link } from "react-router-dom";
import { mockMembers, mockTimeline, billingStatusLabel, billingStatusVariant, discordLinkLabel, roleStatusLabel, roleStatusVariant, timelineSourceLabel, formatDateTimeJP } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Shield, ShieldOff, Zap } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const sourceColors: Record<string, string> = {
  stripe: "bg-accent/20 text-accent",
  webhook: "bg-muted text-muted-foreground",
  discord: "bg-primary/10 text-primary",
  manual: "bg-warning/20 text-warning",
  system: "bg-secondary text-secondary-foreground",
};

export default function SellerMemberDetail() {
  const { id } = useParams();
  const member = mockMembers.find((m) => m.id === id);
  const timeline = (id && mockTimeline[id]) || [];

  if (!member) {
    return (
      <div className="space-y-4">
        <Link to="/seller/members" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 会員一覧
        </Link>
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">会員が見つかりません</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Link to="/seller/members" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 会員一覧
      </Link>

      {/* Summary */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-bold">{member.name}</h2>
        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
          <div>
            <p className="text-muted-foreground">メール</p>
            <p className="font-medium">{member.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">プラン</p>
            <p className="font-medium">{member.planName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">課金状態</p>
            <Badge variant={billingStatusVariant[member.billingStatus]}>{billingStatusLabel[member.billingStatus]}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Discord</p>
            <p className="font-medium">{member.discordUsername || "未連携"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Discord連携</p>
            <Badge variant={member.discordLinkStatus === "linked" ? "default" : "outline"}>
              {discordLinkLabel[member.discordLinkStatus]}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">ロール状態</p>
            <Badge variant={roleStatusVariant[member.roleStatus]}>{roleStatusLabel[member.roleStatus]}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">入会日</p>
            <p className="font-medium">{member.joinedAt}</p>
          </div>
          <div>
            <p className="text-muted-foreground">最終決済</p>
            <p className="font-medium">{member.lastPayment}</p>
          </div>
        </div>

        {member.lastError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
            <p className="font-semibold text-destructive">⚠ エラー</p>
            <p className="text-muted-foreground mt-1">{member.lastError}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline"><Shield className="h-3 w-3 mr-1" />再付与</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ロールを再付与しますか？</AlertDialogTitle>
              <AlertDialogDescription>{member.name} にDiscordロールを再付与します。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction>再付与</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-destructive"><ShieldOff className="h-3 w-3 mr-1" />剥奪</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ロールを剥奪しますか？</AlertDialogTitle>
              <AlertDialogDescription>{member.name} からDiscordロールを剥奪します。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground">剥奪する</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button size="sm" variant="outline"><RefreshCw className="h-3 w-3 mr-1" />再同期</Button>
      </div>

      {/* Timeline */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-lg">タイムライン</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">タイムラインがありません</p>
        ) : (
          <div className="space-y-3">
            {timeline.map((t) => (
              <div key={t.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${sourceColors[t.source] || "bg-muted"}`}>
                    {t.source === "stripe" ? "S" : t.source === "discord" ? "D" : t.source === "webhook" ? "W" : t.source === "manual" ? "M" : "⚙"}
                  </div>
                  <div className="w-px h-full bg-border mt-1" />
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{timelineSourceLabel[t.source]}</Badge>
                    <span className="text-xs font-mono text-muted-foreground">{t.event}</span>
                  </div>
                  <p className="text-sm mt-1">{t.detail}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTimeJP(t.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
