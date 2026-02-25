import { mockTenants, formatCurrency } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function PlatformTenants() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">テナント管理</h2>
      <div className="space-y-3">
        {mockTenants.map((t) => (
          <Link
            key={t.id}
            to={`/platform/tenants/${t.id}`}
            className="glass-card rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow block"
          >
            <div>
              <p className="font-semibold">{t.name}</p>
              <p className="text-sm text-muted-foreground">{t.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant={t.status === "active" ? "default" : "secondary"}>
                  {t.status === "active" ? "稼働中" : "オンボーディング中"}
                </Badge>
                <Badge variant="outline">{t.memberCount}名</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(t.mrr)}</p>
              <p className="text-xs text-muted-foreground">月間売上</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
