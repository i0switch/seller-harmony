import { useState, useMemo } from "react";
import { mockWebhooks, formatDateTimeJP, type WebhookStatus } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusLabel: Record<WebhookStatus, string> = { success: "成功", failed: "失敗", pending: "処理中" };
const statusVariant: Record<WebhookStatus, "default" | "destructive" | "secondary"> = { success: "default", failed: "destructive", pending: "secondary" };

export default function SellerWebhooks() {
  const tenantWebhooks = mockWebhooks.filter((w) => w.tenantId === "t1");
  const [statusFilter, setStatusFilter] = useState<WebhookStatus | "all">("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...tenantWebhooks];
    if (statusFilter !== "all") list = list.filter((w) => w.processStatus === statusFilter);
    list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return list;
  }, [statusFilter]);

  const detail = detailId ? tenantWebhooks.find((w) => w.id === detailId) : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Webhook履歴</h2>

      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WebhookStatus | "all")}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="success">成功</SelectItem>
          <SelectItem value="failed">失敗</SelectItem>
          <SelectItem value="pending">処理中</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">Webhookイベントがありません</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <div key={w.id} className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold">{w.eventType}</span>
                <Badge variant={statusVariant[w.processStatus]}>{statusLabel[w.processStatus]}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>署名: {w.signatureVerified ? "✓" : "✗"} ・ {formatDateTimeJP(w.receivedAt)}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDetailId(w.id)}><Eye className="h-3 w-3" /></Button>
                  {w.processStatus === "failed" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost"><RefreshCw className="h-3 w-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>再処理しますか？</AlertDialogTitle>
                          <AlertDialogDescription>{w.eventType} を再処理します。</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction>再処理</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                <div><p className="text-muted-foreground">ステータス</p><Badge variant={statusVariant[detail.processStatus]}>{statusLabel[detail.processStatus]}</Badge></div>
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
