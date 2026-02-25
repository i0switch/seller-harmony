import { useState, useMemo } from "react";
import { mockMembers, billingStatusLabel, billingStatusVariant, discordLinkLabel, roleStatusLabel, roleStatusVariant, type MemberBillingStatus } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, AlertTriangle } from "lucide-react";

type SortKey = "name" | "joinedAt" | "lastPayment";
const PAGE_SIZE = 5;

export default function SellerMembers() {
  const [search, setSearch] = useState("");
  const [billingFilter, setBillingFilter] = useState<MemberBillingStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...mockMembers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.discordUsername.toLowerCase().includes(q));
    }
    if (billingFilter !== "all") list = list.filter((m) => m.billingStatus === billingFilter);
    list.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [search, billingFilter, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">会員管理</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="名前・メール・Discordで検索..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={billingFilter} onValueChange={(v) => { setBillingFilter(v as MemberBillingStatus | "all"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="active">有効</SelectItem>
            <SelectItem value="past_due">支払い遅延</SelectItem>
            <SelectItem value="canceled">解約済</SelectItem>
            <SelectItem value="unpaid">未払い</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">
                <button className="flex items-center gap-1" onClick={() => toggleSort("name")}>会員 <ArrowUpDown className="h-3 w-3" /></button>
              </th>
              <th className="text-left px-4 py-3 font-medium">プラン</th>
              <th className="text-left px-4 py-3 font-medium">課金</th>
              <th className="text-left px-4 py-3 font-medium">Discord</th>
              <th className="text-left px-4 py-3 font-medium">ロール</th>
              <th className="text-left px-4 py-3 font-medium">エラー</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">会員がいません</td></tr>
            ) : paged.map((m) => (
              <tr key={m.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </td>
                <td className="px-4 py-3 text-xs">{m.planName}</td>
                <td className="px-4 py-3"><Badge variant={billingStatusVariant[m.billingStatus]}>{billingStatusLabel[m.billingStatus]}</Badge></td>
                <td className="px-4 py-3 text-xs">
                  {m.discordUsername || <span className="text-muted-foreground">未連携</span>}
                </td>
                <td className="px-4 py-3"><Badge variant={roleStatusVariant[m.roleStatus]}>{roleStatusLabel[m.roleStatus]}</Badge></td>
                <td className="px-4 py-3 text-xs">
                  {m.lastError ? (
                    <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> あり</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="ghost"><Link to={`/seller/members/${m.id}`}>詳細</Link></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {paged.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">会員がいません</div>
        ) : paged.map((m) => (
          <Link key={m.id} to={`/seller/members/${m.id}`} className="glass-card rounded-xl p-4 block hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.discordUsername || m.email}</p>
              </div>
              <Badge variant={billingStatusVariant[m.billingStatus]}>{billingStatusLabel[m.billingStatus]}</Badge>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{m.planName}</span>
              <Badge variant={roleStatusVariant[m.roleStatus]} className="text-xs">{roleStatusLabel[m.roleStatus]}</Badge>
            </div>
            {m.lastError && <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{m.lastError}</p>}
          </Link>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length}件中 {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, filtered.length)}件</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm">{page}/{totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
