import { useState, useMemo } from "react";
import { mockTenants, tenantStatusLabel, tenantStatusVariant, stripeStatusLabel, formatCurrency, formatDateTimeJP, type TenantStatus } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Pause, Play } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SortKey = "name" | "memberCount" | "errorCount" | "lastActiveAt";

const PAGE_SIZE = 5;

export default function PlatformTenants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastActiveAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...mockTenants];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    list.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [search, statusFilter, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">テナント管理</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="テナント名またはメールで検索..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as TenantStatus | "all"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="active">契約中</SelectItem>
            <SelectItem value="trial">試用中</SelectItem>
            <SelectItem value="suspended">停止中</SelectItem>
            <SelectItem value="canceled">解約済</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">
                <button className="flex items-center gap-1" onClick={() => toggleSort("name")}>
                  テナント <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium">契約状態</th>
              <th className="text-left px-4 py-3 font-medium">Stripe</th>
              <th className="text-right px-4 py-3 font-medium">
                <button className="flex items-center gap-1 ml-auto" onClick={() => toggleSort("memberCount")}>
                  会員数 <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-right px-4 py-3 font-medium">
                <button className="flex items-center gap-1 ml-auto" onClick={() => toggleSort("errorCount")}>
                  エラー <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-right px-4 py-3 font-medium">
                <button className="flex items-center gap-1 ml-auto" onClick={() => toggleSort("lastActiveAt")}>
                  最終アクティブ <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">該当するテナントがありません</td></tr>
            ) : paged.map((t) => (
              <tr key={t.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={tenantStatusVariant[t.status]}>{tenantStatusLabel[t.status]}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs">{stripeStatusLabel[t.stripeStatus]}</span>
                </td>
                <td className="px-4 py-3 text-right font-medium">{t.memberCount}</td>
                <td className="px-4 py-3 text-right">
                  {t.errorCount > 0 ? (
                    <Badge variant="destructive">{t.errorCount}</Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDateTimeJP(t.lastActiveAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button asChild size="sm" variant="ghost"><Link to={`/platform/tenants/${t.id}`}>詳細</Link></Button>
                    {t.status === "active" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive"><Pause className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>テナントを停止しますか？</AlertDialogTitle>
                            <AlertDialogDescription>{t.name} のサービスを停止します。会員への影響がありますがよろしいですか？</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground">停止する</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {t.status === "suspended" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-success"><Play className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>テナントを再開しますか？</AlertDialogTitle>
                            <AlertDialogDescription>{t.name} のサービスを再開します。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction>再開する</AlertDialogAction>
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
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">該当するテナントがありません</div>
        ) : paged.map((t) => (
          <Link key={t.id} to={`/platform/tenants/${t.id}`} className="glass-card rounded-xl p-4 block hover:shadow-md transition-shadow">
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
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length}件中 {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, filtered.length)}件</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
