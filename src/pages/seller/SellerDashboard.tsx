import { mockSellerStats, formatCurrency } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Users, Package, TrendingUp, TrendingDown, UserPlus, Webhook } from "lucide-react";

const stats = [
  { label: "総会員数", value: String(mockSellerStats.totalMembers), icon: Users, link: "/seller/members" },
  { label: "アクティブプラン", value: String(mockSellerStats.activePlans), icon: Package, link: "/seller/plans" },
  { label: "月間売上", value: formatCurrency(mockSellerStats.mrr), icon: TrendingUp },
  { label: "解約率", value: `${mockSellerStats.churnRate}%`, icon: TrendingDown },
  { label: "今月の新規", value: `+${mockSellerStats.newMembersThisMonth}`, icon: UserPlus },
  { label: "本日Webhook", value: String(mockSellerStats.webhooksToday), icon: Webhook, link: "/seller/webhooks" },
];

export default function SellerDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">ダッシュボード</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s) => {
          const cls = "glass-card rounded-xl p-4 hover:shadow-md transition-shadow";
          const inner = (
            <>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
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
    </div>
  );
}
