import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DataTable, FilterBar, PaginationBar, LoadingSkeleton, ErrorBanner, ConfirmDialog, type Column } from "@/components/shared";
import { platformApi } from "@/services/api";
import {
  PlatformWebhookEvent, PaginatedResponse,
  webhookStatusLabel, webhookStatusVariant, formatDateTimeJP,
} from "@/types";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 5;

export default function PlatformWebhooks() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["platform", "webhooks", { search, statusFilter, page }],
    queryFn: () => platformApi.getWebhooks({ search, status: statusFilter, page, pageSize: PAGE_SIZE }),
  });

  const [detail, setDetail] = useState<PlatformWebhookEvent | null>(null);
  const { toast } = useToast();

  const handleReprocess = (w: PlatformWebhookEvent) => {
    toast({ title: "再処理を開始", description: `${w.eventType} (${w.stripeEventId}) の再処理を開始しました` });
  };

  const columns: Column<PlatformWebhookEvent>[] = [
    { key: "eventType", label: "イベント", render: (w) => <span className="font-mono text-xs">{w.eventType}</span> },
    { key: "processStatus", label: "ステータス", render: (w) => <Badge variant={webhookStatusVariant[w.processStatus]}>{webhookStatusLabel[w.processStatus]}</Badge> },
    { key: "signatureVerified", label: "署名", render: (w) => w.signatureVerified ? <span className="text-success">✓</span> : <span className="text-destructive">✗</span> },
    { key: "tenantName", label: "テナント", render: (w) => <span>{w.tenantName}</span> },
    { key: "receivedAt", label: "受信日時", render: (w) => <span className="text-xs text-muted-foreground">{formatDateTimeJP(w.receivedAt)}</span> },
    { key: "error", label: "エラー", render: (w) => <span className="text-xs text-destructive max-w-48 truncate block">{w.error || "—"}</span> },
    {
      key: "actions", label: "",
      render: (w) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setDetail(w)}><Eye className="h-3 w-3" /></Button>
          {w.processStatus === "failed" && (
            <ConfirmDialog
              trigger={<Button size="sm" variant="ghost"><RefreshCw className="h-3 w-3" /></Button>}
              title="手動再処理"
              description={`${w.eventType} (${w.stripeEventId}) を再処理しますか？`}
              confirmLabel="再処理する"
              onConfirm={() => handleReprocess(w)}
            />
          )}
        </div>
      ),
    },
  ];

  if (error) return <ErrorBanner error={error} onRetry={refetch} />;

  const totalCount = data?.total_count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Webhook監視</h2>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="イベント名またはテナント名で検索..."
        filters={[{
          value: statusFilter,
          onChange: (v) => { setStatusFilter(v); setPage(1); },
          options: [
            { value: "all", label: "すべて" },
            { value: "success", label: "成功" },
            { value: "failed", label: "失敗" },
            { value: "pending", label: "処理中" },
          ],
        }]}
      />

      {isLoading ? (
        <LoadingSkeleton type="table" rows={PAGE_SIZE} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.items || []}
            keyExtractor={(w) => w.id}
            emptyTitle="該当するWebhookがありません"
            renderMobileCard={(w) => (
              <div className="glass-card rounded-xl p-4 space-y-2" onClick={() => setDetail(w)}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold">{w.eventType}</span>
                  <Badge variant={webhookStatusVariant[w.processStatus]}>{webhookStatusLabel[w.processStatus]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>{w.tenantName} ・ {formatDateTimeJP(w.receivedAt)}</p>
                  {w.error && <p className="text-destructive">{w.error}</p>}
                </div>
              </div>
            )}
          />
          <PaginationBar page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{detail?.eventType}</DialogTitle>
            <DialogDescription>Webhook詳細</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground">Stripe Event ID</p><p className="font-mono text-xs">{detail.stripeEventId}</p></div>
                <div><p className="text-muted-foreground">ステータス</p><Badge variant={webhookStatusVariant[detail.processStatus]}>{webhookStatusLabel[detail.processStatus]}</Badge></div>
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
