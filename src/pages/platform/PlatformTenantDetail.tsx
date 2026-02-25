import { useParams, Link } from "react-router-dom";
import { mockTenants, formatCurrency } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function PlatformTenantDetail() {
  const { id } = useParams();
  const tenant = mockTenants.find((t) => t.id === id);

  if (!tenant) {
    return <p className="text-muted-foreground">テナントが見つかりません</p>;
  }

  return (
    <div className="space-y-6">
      <Link to="/platform/tenants" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> テナント一覧へ戻る
      </Link>
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-2xl font-bold">{tenant.name}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">メール</p>
            <p className="font-medium">{tenant.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ステータス</p>
            <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
              {tenant.status === "active" ? "稼働中" : "オンボーディング中"}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Stripe</p>
            <Badge variant={tenant.stripeStatus === "verified" ? "default" : "outline"}>
              {tenant.stripeStatus === "verified" ? "認証済み" : "未完了"}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Discordサーバー</p>
            <p className="font-medium">{tenant.discordGuild || "未設定"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">会員数</p>
            <p className="font-medium">{tenant.memberCount}名</p>
          </div>
          <div>
            <p className="text-muted-foreground">月間売上</p>
            <p className="font-medium">{formatCurrency(tenant.mrr)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">登録日</p>
            <p className="font-medium">{tenant.createdAt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
