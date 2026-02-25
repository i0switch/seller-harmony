import { useState, useMemo } from "react";
import { mockWebhooks, formatDateTimeJP, type WebhookStatus } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Eye, RefreshCw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 5;
const statusVariant: Record<WebhookStatus, "default" | "destructive" | "secondary"> = {
  success: "default", failed: "destructive", pending: "secondary",
};
const statusLabel: Record<WebhookStatus, string> = {
  success: "成功", failed: "失敗", pending: "処理中",
};

export default function PlatformWebhooks() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WebhookStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...mockWebhooks];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((w) => w.eventType.includes(q) || w.tenantName.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter((w) => w.processStatus === statusFilter);
    list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return list;
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const detail = detailId ? mockWebhooks.find((w) => w.id === detailId) : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Webhook監視</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="イベント名またはテナント名で検索..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as WebhookStatus | "all"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="success">成功</SelectItem>
            <SelectItem value="failed">失敗</SelectItem>
            <SelectItem value="pending">処理中</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">イベント</th>
              <th className="text-left px-4 py-3 font-medium">ステータス</th>
              <th className="text-left px-4 py-3 font-medium">署名</th>
              <th className="text-left px-4 py-3 font-medium">テナント</th>
              <th className="text-left px-4 py-3 font-medium">受信日時</th>
              <th className="text-left px-4 py-3 font-medium">エラー</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">該当するWebhookがありません</td></tr>
            ) : paged.map((w) => (
              <tr key={w.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{w.eventType}</td>
                <td className="px-4 py-3"><Badge variant={statusVariant[w.processStatus]}>{statusLabel[w.processStatus]}</Badge></td>
                <td className="px-4 py-3">
                  {w.signatureVerified ? <span className="text-success">✓</span> : <span className="text-destructive">✗</span>}
                </td>
                <td className="px-4 py-3">{w.tenantName}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTimeJP(w.receivedAt)}</td>
                <td className="px-4 py-3 text-xs text-destructive max-w-48 truncate">{w.error || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setDetailId(w.id)}><Eye className="h-3 w-3" /></Button>
                    {w.processStatus === "failed" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost"><RefreshCw className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>手動再処理</AlertDialogTitle>
                            <AlertDialogDescription>
                              {w.eventType} ({w.stripeEventId}) を再処理しますか？
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction>再処理する</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {paged.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">該当するWebhookがありません</div>
        ) : paged.map((w) => (
          <div key={w.id} className="glass-card rounded-xl p-4 space-y-2" onClick={() => setDetailId(w.id)}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold">{w.eventType}</span>
              <Badge variant={statusVariant[w.processStatus]}>{statusLabel[w.processStatus]}</Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{w.tenantName} ・ {formatDateTimeJP(w.receivedAt)}</p>
              {w.error && <p className="text-destructive">{w.error}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length}件中 {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, filtered.length)}件</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detail} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{detail?.eventType}</DialogTitle>
            <DialogDescription>Webhook詳細</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground">Stripe Event ID</p><p className="font-mono text-xs">{detail.stripeEventId}</p></div>
                <div><p className="text-muted-foreground">ステータス</p><Badge variant={statusVariant[detail.processStatus]}>{statusLabel[detail.processStatus]}</Badge></div>
                <div><p className="text-muted-foreground">署名検証</p><p>{detail.signatureVerified ? "✓ 検証済み" : "✗ 検証失敗"}</p></div>
                <div><p className="text-muted-foreground">テナント</p><p>{detail.tenantName}</p></div>
                <div><p className="text-muted-foreground">受信日時</p><p>{formatDateTimeJP(detail.receivedAt)}</p></div>
              </div>
              {detail.error && (
                <div>
                  <p className="text-muted-foreground mb-1">エラー</p>
                  <p className="text-destructive bg-destructive/5 rounded-lg p-3 text-xs">{detail.error}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground mb-1">ペイロード</p>
                <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto max-h-40">{detail.payload}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
