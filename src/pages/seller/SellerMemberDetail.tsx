import { useParams, Link } from "react-router-dom";
import { mockMembers } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SellerMemberDetail() {
  const { id } = useParams();
  const member = mockMembers.find((m) => m.id === id);

  if (!member) return <p className="text-muted-foreground">会員が見つかりません</p>;

  return (
    <div className="space-y-6 max-w-md">
      <Link to="/seller/members" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 会員一覧
      </Link>
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-bold">{member.discordUsername}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">メール</p>
            <p className="font-medium">{member.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">プラン</p>
            <p className="font-medium">{member.planName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Stripe</p>
            <Badge variant={member.stripeStatus === "active" ? "default" : "destructive"}>
              {member.stripeStatus === "active" ? "有効" : "解約済み"}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Discordロール</p>
            <Badge variant={member.discordRoleGranted ? "default" : "outline"}>
              {member.discordRoleGranted ? "付与済み" : "未付与"}
            </Badge>
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
        {member.status === "inactive" && member.discordRoleGranted && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
            <p className="font-semibold text-destructive">⚠ 不整合を検出</p>
            <p className="text-muted-foreground mt-1">Stripe解約済みですがDiscordロールが残っています</p>
            <Button size="sm" variant="destructive" className="mt-2">ロールを剥奪</Button>
          </div>
        )}
      </div>
    </div>
  );
}
