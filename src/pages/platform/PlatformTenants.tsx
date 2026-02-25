import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import { DataTable, FilterBar, PaginationBar, LoadingSkeleton, ErrorBanner, ConfirmDialog, type Column } from "@/components/shared";
import { platformApi } from "@/services/mockApi";
import {
  PlatformTenant, TenantStatus, PaginatedResponse,
  tenantStatusLabel, tenantStatusVariant, stripeStatusLabel,
  formatCurrency, formatDateTimeJP,
} from "@/types";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 5;

export default function PlatformTenants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("lastActiveAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<PlatformTenant> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    platformApi.getTenants({ search, status: statusFilter, sortKey, sortAsc, page, pageSize: PAGE_SIZE })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [search, statusFilter, sortKey, sortAsc, page]);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleSuspend = (t: PlatformTenant) => {
    toast({ title: "テナント停止", description: `${t.name} を停止しました（モック）` });
  };
  const handleResume = (t: PlatformTenant) => {
    toast({ title: "テナント再開", description: `${t.name} を再開しました（モック）` });
  };

  const columns: Column<PlatformTenant>[] = useMemo(() => [
    {
      key: "name", label: "テナント", sortable: true,
      render: (t) => (
        <div>
          <p className="font-semibold">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.email}</p>
        </div>
      ),
    },
    {
      key: "status", label: "契約状態",
      render: (t) => <Badge variant={tenantStatusVariant[t.status]}>{tenantStatusLabel[t.status]}</Badge>,
    },
    {
      key: "stripeStatus", label: "Stripe",
      render: (t) => <span className="text-xs">{stripeStatusLabel[t.stripeStatus]}</span>,
    },
    {
      key: "memberCount", label: "会員数", sortable: true, align: "right" as const,
      render: (t) => <span className="font-medium">{t.memberCount}</span>,
    },
    {
      key: "errorCount", label: "エラー", sortable: true, align: "right" as const,
      render: (t) => t.errorCount > 0
        ? <Badge variant="destructive">{t.errorCount}</Badge>
        : <span className="text-muted-foreground">0</span>,
    },
    {
      key: "lastActiveAt", label: "最終アクティブ", sortable: true, align: "right" as const,
      render: (t) => <span className="text-xs text-muted-foreground">{formatDateTimeJP(t.lastActiveAt)}</span>,
    },
    {
      key: "actions", label: "",
      render: (t) => (
        <div className="flex items-center gap-1 justify-end">
          <Button asChild size="sm" variant="ghost"><Link to={`/platform/tenants/${t.id}`}>詳細</Link></Button>
          {t.status === "active" && (
            <ConfirmDialog
              trigger={<Button size="sm" variant="ghost" className="text-destructive"><Pause className="h-3 w-3" /></Button>}
              title="テナントを停止しますか？"
              description={`${t.name} のサービスを停止します。会員への影響がありますがよろしいですか？`}
              confirmLabel="停止する"
              destructive
              onConfirm={() => handleSuspend(t)}
            />
          )}
          {t.status === "suspended" && (
            <ConfirmDialog
              trigger={<Button size="sm" variant="ghost" className="text-success"><Play className="h-3 w-3" /></Button>}
              title="テナントを再開しますか？"
              description={`${t.name} のサービスを再開します。`}
              confirmLabel="再開する"
              onConfirm={() => handleResume(t)}
            />
          )}
        </div>
      ),
    },
  ], []);

  if (error) return <ErrorBanner message={error} onRetry={load} />;

  const totalCount = data?.total_count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">テナント管理</h2>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="テナント名またはメールで検索..."
        filters={[{
          value: statusFilter,
          onChange: (v) => { setStatusFilter(v); setPage(1); },
          options: [
            { value: "all", label: "すべて" },
            { value: "active", label: "契約中" },
            { value: "trial", label: "試用中" },
            { value: "suspended", label: "停止中" },
            { value: "canceled", label: "解約済" },
          ],
          className: "w-full sm:w-40",
        }]}
      />

      {isLoading ? (
        <LoadingSkeleton type="table" rows={PAGE_SIZE} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.items || []}
            keyExtractor={(t) => t.id}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={toggleSort}
            emptyTitle="該当するテナントがありません"
            renderMobileCard={(t) => (
              <Link to={`/platform/tenants/${t.id}`} className="glass-card rounded-xl p-4 block hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.email}</p>
                  </div>
                  <Badge variant={tenantStatusVariant[t.status]}>{tenantStatusLabel[t.status]}</Badge>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span>会員: {t.memberCount}</span>
                  <span>Stripe: {stripeStatusLabel[t.stripeStatus]}</span>
                  {t.errorCount > 0 && <Badge variant="destructive" className="text-xs">{t.errorCount}件エラー</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">最終: {formatDateTimeJP(t.lastActiveAt)}</p>
              </Link>
            )}
          />

          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
