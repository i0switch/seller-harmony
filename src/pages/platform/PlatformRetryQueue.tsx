import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Pause, X } from "lucide-react";
import { FilterBar, PaginationBar, LoadingSkeleton, ErrorBanner, ConfirmDialog, DataTable, type Column } from "@/components/shared";
import { platformApi } from "@/services/mockApi";
import {
  RetryQueueJob, PaginatedResponse,
  retryJobTypeLabel, retryStatusLabel, retryStatusVariant, formatDateTimeJP,
} from "@/types";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 5;

export default function PlatformRetryQueue() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<RetryQueueJob> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    setIsLoading(true); setError(null);
    platformApi.getRetryQueue({ jobType: typeFilter, status: statusFilter, page, pageSize: PAGE_SIZE })
      .then(setData).catch(e => setError(e.message)).finally(() => setIsLoading(false));
  }, [typeFilter, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleAction = (r: RetryQueueJob, action: string) => {
    toast({ title: `${action}しました`, description: `${r.tenantName} の ${retryJobTypeLabel[r.jobType]} ジョブを${action}しました` });
  };

  const columns: Column<RetryQueueJob>[] = [
    { key: "jobType", label: "種別", render: (r) => <Badge variant="outline">{retryJobTypeLabel[r.jobType]}</Badge> },
    { key: "tenantName", label: "テナント", render: (r) => <span>{r.tenantName}</span> },
    { key: "status", label: "ステータス", render: (r) => <Badge variant={retryStatusVariant[r.status]}>{retryStatusLabel[r.status]}</Badge> },
    { key: "retryCount", label: "試行", align: "right" as const, render: (r) => <span>{r.retryCount} / {r.maxRetries}</span> },
    { key: "nextRetryAt", label: "次回再試行", render: (r) => <span className="text-xs text-muted-foreground">{r.nextRetryAt ? formatDateTimeJP(r.nextRetryAt) : "—"}</span> },
    { key: "lastError", label: "最終エラー", render: (r) => <span className="text-xs text-destructive max-w-48 truncate block">{r.lastError}</span> },
    {
      key: "actions", label: "アクション",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          {r.status === "pending" && (
            <>
              <ConfirmDialog
                trigger={<Button size="sm" variant="ghost" title="今すぐ再試行"><RefreshCw className="h-3 w-3" /></Button>}
                title="今すぐ再試行しますか？"
                description={`${r.tenantName} の ${retryJobTypeLabel[r.jobType]} ジョブを即時実行します。`}
                confirmLabel="再試行"
                onConfirm={() => handleAction(r, "再試行")}
              />
              <Button size="sm" variant="ghost" title="保留" onClick={() => handleAction(r, "保留")}>
                <Pause className="h-3 w-3" />
              </Button>
            </>
          )}
          {r.status === "paused" && (
            <Button size="sm" variant="ghost" title="再開" onClick={() => handleAction(r, "再開")}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          <ConfirmDialog
            trigger={<Button size="sm" variant="ghost" className="text-destructive" title="終了"><X className="h-3 w-3" /></Button>}
            title="ジョブを終了しますか？"
            description="このリトライジョブを完全に終了します。再試行は行われません。"
            confirmLabel="終了する"
            destructive
            onConfirm={() => handleAction(r, "終了")}
          />
        </div>
      ),
    },
  ];

  if (error) return <ErrorBanner message={error} onRetry={load} />;

  const totalCount = data?.total_count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">リトライキュー</h2>

      <FilterBar
        filters={[
          {
            value: typeFilter,
            onChange: (v) => { setTypeFilter(v); setPage(1); },
            options: [
              { value: "all", label: "すべて" },
              { value: "webhook", label: "Webhook" },
              { value: "discord", label: "Discord" },
              { value: "sync", label: "同期" },
            ],
          },
          {
            value: statusFilter,
            onChange: (v) => { setStatusFilter(v); setPage(1); },
            options: [
              { value: "all", label: "すべて" },
              { value: "pending", label: "待機中" },
              { value: "paused", label: "保留" },
              { value: "exhausted", label: "上限到達" },
            ],
          },
        ]}
      />

      {isLoading ? (
        <LoadingSkeleton type="table" rows={PAGE_SIZE} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.items || []}
            keyExtractor={(r) => r.id}
            emptyTitle="リトライジョブがありません"
            renderMobileCard={(r) => (
              <div className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="outline">{retryJobTypeLabel[r.jobType]}</Badge>
                    <Badge variant={retryStatusVariant[r.status]}>{retryStatusLabel[r.status]}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.retryCount}/{r.maxRetries}</span>
                </div>
                <p className="text-sm font-medium">{r.tenantName}</p>
                <p className="text-xs text-destructive">{r.lastError}</p>
                {r.nextRetryAt && <p className="text-xs text-muted-foreground">次回: {formatDateTimeJP(r.nextRetryAt)}</p>}
                <div className="flex gap-2">
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleAction(r, "再試行")}><RefreshCw className="h-3 w-3 mr-1" />再試行</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(r, "保留")}><Pause className="h-3 w-3 mr-1" />保留</Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleAction(r, "終了")}><X className="h-3 w-3 mr-1" />終了</Button>
                </div>
              </div>
            )}
          />
          <PaginationBar page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
