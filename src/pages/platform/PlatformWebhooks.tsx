import { mockWebhooks } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";

export default function PlatformWebhooks() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Webhook監視</h2>
      <div className="space-y-3">
        {mockWebhooks.map((w) => (
          <div key={w.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-semibold">{w.event}</p>
              <p className="text-xs text-muted-foreground mt-1">{w.tenantName} ・ {new Date(w.timestamp).toLocaleString("ja-JP")}</p>
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
