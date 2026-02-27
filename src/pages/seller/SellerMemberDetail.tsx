import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, ShieldOff, RefreshCw } from "lucide-react";
import { ConfirmDialog, TimelineList, EmptyState, ErrorBanner, LoadingSkeleton } from "@/components/shared";
import {
  sellerBillingStatusLabel, sellerBillingStatusVariant,
  discordLinkStatusLabel, discordLinkStatusVariant,
  roleStatusLabel, roleStatusVariant,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { sellerApi } from "@/services/api";

export default function SellerMemberDetail() {
  const { id } = useParams();
  const { toast } = useToast();

  const { data: member, isLoading: memberLoading, error: memberError } = useQuery({
    queryKey: ["seller", "members", id],
    queryFn: () => sellerApi.getMemberById(id!),
    enabled: !!id,
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ["seller", "members", id, "timeline"],
    queryFn: () => sellerApi.getMemberTimeline(id!),
    enabled: !!id,
  });

  if (memberError) {
    return (
      <div className="space-y-4">
        <Link to="/seller/members" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 会員一覧
        </Link>
        <ErrorBanner error={memberError} />
      </div>
    );
  }

  if (memberLoading || timelineLoading) {
    return (
      <div className="space-y-4">
        <Link to="/seller/members" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 会員一覧
        </Link>
        <LoadingSkeleton type="cards" rows={2} />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <Link to="/seller/members" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 会員一覧
        </Link>
        <EmptyState title="会員が見つかりません" />
      </div>
    );
  }

  const handleAction = (action: string) => {
    toast({ title: `${action}しました`, description: `${member.name} に対して${action}を実行しました` });
  };

  return (
    <div className="space-y-6 max-w-lg">
      <Link to="/seller/members" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 会員一覧
      </Link>

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
            <Badge variant={sellerBillingStatusVariant[member.billingStatus]}>{sellerBillingStatusLabel[member.billingStatus]}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Discord</p>
            <p className="font-medium">{member.discordUsername || "未連携"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Discord連携</p>
            <Badge variant={discordLinkStatusVariant[member.discordLinkStatus]}>
              {discordLinkStatusLabel[member.discordLinkStatus]}
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

      <div className="flex gap-2 flex-wrap">
        <ConfirmDialog
          trigger={<Button size="sm" variant="outline"><Shield className="h-3 w-3 mr-1" />再付与</Button>}
          title="ロールを再付与しますか？"
          description={`${member.name} にDiscordロールを再付与します。`}
          confirmLabel="再付与"
          onConfirm={() => handleAction("ロール再付与")}
        />
        <ConfirmDialog
          trigger={<Button size="sm" variant="outline" className="text-destructive"><ShieldOff className="h-3 w-3 mr-1" />剥奪</Button>}
          title="ロールを剥奪しますか？"
          description={`${member.name} からDiscordロールを剥奪します。`}
          confirmLabel="剥奪する"
          destructive
          onConfirm={() => handleAction("ロール剥奪")}
        />
        <Button size="sm" variant="outline" onClick={() => handleAction("再同期")}>
          <RefreshCw className="h-3 w-3 mr-1" />再同期
        </Button>
      </div>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-lg">タイムライン</h3>
        <TimelineList events={timeline || []} />
      </div>
    </div>
  );
}
