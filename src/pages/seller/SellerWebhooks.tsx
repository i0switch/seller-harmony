import { useState, useMemo } from "react";
import { mockWebhooks } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FilterBar, EmptyState, ConfirmDialog } from "@/components/shared";
import { webhookStatusLabel, webhookStatusVariant, formatDateTimeJP, type WebhookProcessStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function SellerWebhooks() {
  const tenantWebhooks = useMemo(() => mockWebhooks.filter((w) => w.tenantId === "t1"), []);
  const [statusFilter, setStatusFilter] = useState<WebhookProcessStatus | "all">("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    let list = [...tenantWebhooks];
    if (statusFilter !== "all") list = list.filter((w) => w.processStatus === statusFilter);
    list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return list;
  }, [statusFilter, tenantWebhooks]);

  const detail = detailId ? tenantWebhooks.find((w) => w.id === detailId) : null;

  const handleReprocess = (eventType: string) => {
    toast({ title: "再処理を開始", description: `${eventType} の再処理を開始しました` });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Webhook履歴</h2>

      <FilterBar
        filters={[{
          value: statusFilter,
          onChange: (v) => setStatusFilter(v as WebhookProcessStatus | "all"),
          options: [
            { value: "all", label: "すべて" },
            { value: "success", label: "成功" },
            { value: "failed", label: "失敗" },
            { value: "pending", label: "処理中" },
          ],
        }]}
      />

      {filtered.length === 0 ? (
        <EmptyState title="Webhookイベントがありません" />
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <div key={w.id} className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold">{w.eventType}</span>
                <Badge variant={webhookStatusVariant[w.processStatus]}>{webhookStatusLabel[w.processStatus]}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>署名: {w.signatureVerified ? "✓" : "✗"} ・ {formatDateTimeJP(w.receivedAt)}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDetailId(w.id)}><Eye className="h-3 w-3" /></Button>
                  {w.processStatus === "failed" && (
                    <ConfirmDialog
                      trigger={<Button size="sm" variant="ghost"><RefreshCw className="h-3 w-3" /></Button>}
                      title="再処理しますか？"
                      description={`${w.eventType} を再処理します。`}
                      confirmLabel="再処理"
                      onConfirm={() => handleReprocess(w.eventType)}
                    />
                  )}
                </div>
              </div>
              {w.error && <p className="text-xs text-destructive">{w.error}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{detail?.eventType}</DialogTitle>
            <DialogDescription>Webhook詳細</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground">Event ID</p><p className="font-mono text-xs">{detail.stripeEventId}</p></div>
                <div><p className="text-muted-foreground">ステータス</p><Badge variant={webhookStatusVariant[detail.processStatus]}>{webhookStatusLabel[detail.processStatus]}</Badge></div>
                <div><p className="text-muted-foreground">署名</p><p>{detail.signatureVerified ? "✓ 検証済み" : "✗ 検証失敗"}</p></div>
                <div><p className="text-muted-foreground">受信日時</p><p>{formatDateTimeJP(detail.receivedAt)}</p></div>
              </div>
              {detail.error && (
                <div><p className="text-muted-foreground mb-1">エラー</p><p className="text-destructive bg-destructive/5 rounded-lg p-3 text-xs">{detail.error}</p></div>
              )}
              <div><p className="text-muted-foreground mb-1">ペイロード</p><pre className="bg-muted rounded-lg p-3 text-xs overflow-auto max-h-40">{detail.payload}</pre></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
