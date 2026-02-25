import { mockRetryQueue } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PlatformRetryQueue() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">リトライキュー</h2>
      {mockRetryQueue.length === 0 ? (
        <p className="text-muted-foreground">リトライ対象のイベントはありません</p>
      ) : (
        <div className="space-y-3">
          {mockRetryQueue.map((r) => (
            <div key={r.id} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm font-semibold">{r.event}</p>
                <Badge variant="outline">{r.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>テナント: {r.tenantName}</p>
                <p>リトライ: {r.retryCount} / {r.maxRetries}</p>
                <p>次回: {new Date(r.nextRetry).toLocaleString("ja-JP")}</p>
              </div>
              <Button size="sm" variant="outline">手動リトライ</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
