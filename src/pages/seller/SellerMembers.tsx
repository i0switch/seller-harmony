import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { DataTable, FilterBar, PaginationBar, LoadingSkeleton, ErrorBanner, type Column } from "@/components/shared";
import { sellerApi } from "@/services/api";
import {
  SellerMember, PaginatedResponse,
  sellerBillingStatusLabel, sellerBillingStatusVariant,
  discordLinkStatusLabel, roleStatusLabel, roleStatusVariant,
} from "@/types";

const PAGE_SIZE = 5;

export default function SellerMembers() {
  const [search, setSearch] = useState("");
  const [billingFilter, setBillingFilter] = useState("all");
  const [sortKey, setSortKey] = useState("joinedAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["seller", "members", { search, billingFilter, sortKey, sortAsc, page }],
    queryFn: () => sellerApi.getMembers({ search, billingStatus: billingFilter, sortKey, sortAsc, page, pageSize: PAGE_SIZE }),
  });

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const columns: Column<SellerMember>[] = useMemo(() => [
    {
      key: "name", label: "会員", sortable: true,
      render: (m) => (
        <div>
          <p className="font-semibold">{m.name}</p>
          <p className="text-xs text-muted-foreground">{m.email}</p>
        </div>
      ),
    },
    { key: "planName", label: "プラン", render: (m) => <span className="text-xs">{m.planName}</span> },
    {
      key: "billingStatus", label: "課金",
      render: (m) => <Badge variant={sellerBillingStatusVariant[m.billingStatus]}>{sellerBillingStatusLabel[m.billingStatus]}</Badge>,
    },
    {
      key: "discordUsername", label: "Discord",
      render: (m) => m.discordUsername ? <span className="text-xs">{m.discordUsername}</span> : <span className="text-xs text-muted-foreground">未連携</span>,
    },
    {
      key: "roleStatus", label: "ロール",
      render: (m) => <Badge variant={roleStatusVariant[m.roleStatus]}>{roleStatusLabel[m.roleStatus]}</Badge>,
    },
    {
      key: "lastError", label: "エラー",
      render: (m) => m.lastError
        ? <span className="text-destructive flex items-center gap-1 text-xs"><AlertTriangle className="h-3 w-3" /> あり</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "actions", label: "",
      render: (m) => <Button asChild size="sm" variant="ghost"><Link to={`/seller/members/${m.id}`}>詳細</Link></Button>,
    },
  ], []);

  if (error) return <ErrorBanner error={error} onRetry={refetch} />;

  const totalCount = data?.total_count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">会員管理</h2>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="名前・メール・Discordで検索..."
        filters={[{
          value: billingFilter,
          onChange: (v) => { setBillingFilter(v); setPage(1); },
          options: [
            { value: "all", label: "すべて" },
            { value: "active", label: "有効" },
            { value: "past_due", label: "支払い遅延" },
            { value: "canceled", label: "解約済" },
            { value: "unpaid", label: "未払い" },
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
            keyExtractor={(m) => m.id}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={toggleSort}
            emptyTitle="会員がいません"
            renderMobileCard={(m) => (
              <Link to={`/seller/members/${m.id}`} className="glass-card rounded-xl p-4 block hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.discordUsername || m.email}</p>
                  </div>
                  <Badge variant={sellerBillingStatusVariant[m.billingStatus]}>{sellerBillingStatusLabel[m.billingStatus]}</Badge>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{m.planName}</span>
                  <Badge variant={roleStatusVariant[m.roleStatus]} className="text-xs">{roleStatusLabel[m.roleStatus]}</Badge>
                </div>
                {m.lastError && <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{m.lastError}</p>}
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
