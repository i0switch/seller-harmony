import { useParams, Link } from "react-router-dom";
import { mockPlans, formatCurrency } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function SellerPlanDetail() {
  const { id } = useParams();
  const plan = mockPlans.find((p) => p.id === id);

  if (!plan) return <p className="text-muted-foreground">プランが見つかりません</p>;

  return (
    <div className="space-y-6 max-w-md">
      <Link to="/seller/plans" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> プラン一覧
      </Link>
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-bold">{plan.name}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">料金</p>
            <p className="font-semibold text-lg">{formatCurrency(plan.price)} / 月</p>
          </div>
          <div>
            <p className="text-muted-foreground">会員数</p>
            <p className="font-semibold text-lg">{plan.memberCount}名</p>
          </div>
          <div>
            <p className="text-muted-foreground">Discordロール</p>
            <Badge variant="outline">{plan.discordRoleName}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">ステータス</p>
            <Badge variant={plan.active ? "default" : "secondary"}>
              {plan.active ? "公開中" : "非公開"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
