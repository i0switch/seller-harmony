import { mockWebhooks } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";

export default function SellerWebhooks() {
  // Filter to show only this tenant's webhooks
  const tenantWebhooks = mockWebhooks.filter((w) => w.tenantId === "t1");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Webhook履歴</h2>
      <div className="space-y-3">
        {tenantWebhooks.map((w) => (
          <div key={w.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-semibold">{w.event}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(w.timestamp).toLocaleString("ja-JP")}</p>
            </div>
            <Badge variant={w.status === "success" ? "default" : "destructive"}>
              {w.status === "success" ? "成功" : "失敗"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
