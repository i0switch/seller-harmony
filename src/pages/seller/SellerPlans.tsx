import { mockPlans, formatCurrency } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SellerPlans() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">プラン管理</h2>
        <Button asChild size="sm"><Link to="/seller/plans/new"><Plus className="h-4 w-4 mr-1" />新規プラン</Link></Button>
      </div>
      <div className="space-y-3">
        {mockPlans.map((p) => (
          <Link
            key={p.id}
            to={`/seller/plans/${p.id}`}
            className="glass-card rounded-xl p-4 flex items-center justify-between block hover:shadow-md transition-shadow"
          >
            <div>
              <p className="font-semibold">{p.name}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{p.discordRoleName}</Badge>
                <Badge variant="secondary">{p.memberCount}名</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(p.price)}</p>
              <p className="text-xs text-muted-foreground">/ 月</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
