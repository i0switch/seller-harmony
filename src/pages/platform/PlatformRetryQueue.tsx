import { useState, useMemo } from "react";
import { mockRetryQueue, retryJobTypeLabel, retryStatusLabel, formatDateTimeJP, type RetryJobType, type RetryStatus } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Pause, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 5;
const statusVariant: Record<RetryStatus, "default" | "secondary" | "destructive"> = {
  pending: "default", paused: "secondary", exhausted: "destructive",
};

export default function PlatformRetryQueue() {
  const [typeFilter, setTypeFilter] = useState<RetryJobType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<RetryStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...mockRetryQueue];
    if (typeFilter !== "all") list = list.filter((r) => r.jobType === typeFilter);
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    return list;
  }, [typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">リトライキュー</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as RetryJobType | "all"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="discord">Discord</SelectItem>
            <SelectItem value="sync">同期</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as RetryStatus | "all"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="pending">待機中</SelectItem>
            <SelectItem value="paused">保留</SelectItem>
            <SelectItem value="exhausted">上限到達</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">種別</th>
              <th className="text-left px-4 py-3 font-medium">テナント</th>
              <th className="text-left px-4 py-3 font-medium">ステータス</th>
              <th className="text-right px-4 py-3 font-medium">試行</th>
              <th className="text-left px-4 py-3 font-medium">次回再試行</th>
              <th className="text-left px-4 py-3 font-medium">最終エラー</th>
              <th className="px-4 py-3">アクション</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">リトライジョブがありません</td></tr>
            ) : paged.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3"><Badge variant="outline">{retryJobTypeLabel[r.jobType]}</Badge></td>
                <td className="px-4 py-3">{r.tenantName}</td>
                <td className="px-4 py-3"><Badge variant={statusVariant[r.status]}>{retryStatusLabel[r.status]}</Badge></td>
                <td className="px-4 py-3 text-right">{r.retryCount} / {r.maxRetries}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.nextRetryAt ? formatDateTimeJP(r.nextRetryAt) : "—"}</td>
                <td className="px-4 py-3 text-xs text-destructive max-w-48 truncate">{r.lastError}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    {r.status === "pending" && (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" title="今すぐ再試行"><RefreshCw className="h-3 w-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>今すぐ再試行しますか？</AlertDialogTitle>
                              <AlertDialogDescription>{r.tenantName} の {retryJobTypeLabel[r.jobType]} ジョブを即時実行します。</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction>再試行</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button size="sm" variant="ghost" title="保留"><Pause className="h-3 w-3" /></Button>
                      </>
                    )}
                    {r.status === "paused" && (
                      <Button size="sm" variant="ghost" title="再開"><RefreshCw className="h-3 w-3" /></Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive" title="終了"><X className="h-3 w-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ジョブを終了しますか？</AlertDialogTitle>
                          <AlertDialogDescription>このリトライジョブを完全に終了します。再試行は行われません。</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground">終了する</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">リトライジョブがありません</div>
        ) : paged.map((r) => (
          <div key={r.id} className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="outline">{retryJobTypeLabel[r.jobType]}</Badge>
                <Badge variant={statusVariant[r.status]}>{retryStatusLabel[r.status]}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{r.retryCount}/{r.maxRetries}</span>
            </div>
            <p className="text-sm font-medium">{r.tenantName}</p>
            <p className="text-xs text-destructive">{r.lastError}</p>
            {r.nextRetryAt && <p className="text-xs text-muted-foreground">次回: {formatDateTimeJP(r.nextRetryAt)}</p>}
            <div className="flex gap-2">
              {r.status === "pending" && <Button size="sm" variant="outline"><RefreshCw className="h-3 w-3 mr-1" />再試行</Button>}
              {r.status === "pending" && <Button size="sm" variant="outline"><Pause className="h-3 w-3 mr-1" />保留</Button>}
              <Button size="sm" variant="outline" className="text-destructive"><X className="h-3 w-3 mr-1" />終了</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length}件</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
