import { mockWebhooks, formatDateTimeJP } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";

export default function SellerWebhooks() {
  const tenantWebhooks = mockWebhooks.filter((w) => w.tenantId === "t1");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Webhook履歴</h2>
      <div className="space-y-3">
        {tenantWebhooks.map((w) => (
          <div key={w.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-semibold">{w.eventType}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDateTimeJP(w.receivedAt)}</p>
            </div>
            <Badge variant={w.processStatus === "success" ? "default" : "destructive"}>
              {w.processStatus === "success" ? "成功" : w.processStatus === "failed" ? "失敗" : "処理中"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
