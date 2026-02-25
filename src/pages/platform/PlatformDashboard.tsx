import { mockPlatformStats, formatCurrency } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Users, TrendingUp, Webhook, AlertTriangle } from "lucide-react";

const stats = [
  { label: "アクティブテナント", value: mockPlatformStats.activeTenants, total: mockPlatformStats.totalTenants, icon: Users, link: "/platform/tenants" },
  { label: "全会員数", value: mockPlatformStats.totalMembers, icon: TrendingUp },
  { label: "プラットフォームMRR", value: formatCurrency(mockPlatformStats.totalMRR), icon: TrendingUp },
  { label: "本日のWebhook", value: mockPlatformStats.webhooksToday, icon: Webhook, link: "/platform/webhooks" },
  { label: "失敗Webhook", value: mockPlatformStats.failedWebhooks, icon: AlertTriangle, link: "/platform/retry-queue", alert: mockPlatformStats.failedWebhooks > 0 },
];

export default function PlatformDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">ダッシュボード</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.link ?? "#"}
            className={`glass-card rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow ${s.alert ? "border-destructive/50" : ""}`}
          >
            <div className={`p-2.5 rounded-lg ${s.alert ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">
                {s.value}
                {s.total != null && <span className="text-sm text-muted-foreground font-normal"> / {s.total}</span>}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
