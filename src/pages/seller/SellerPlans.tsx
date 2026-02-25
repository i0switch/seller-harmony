import { useState, useMemo } from "react";
import { mockPlans, planStatusLabel, planStatusVariant, planTypeLabel, formatCurrency, type PlanStatus } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Eye, EyeOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SellerPlans() {
  const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");
  const [plans, setPlans] = useState(mockPlans);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return plans;
    return plans.filter((p) => p.status === statusFilter);
  }, [plans, statusFilter]);

  const togglePublish = (id: string) => {
    setPlans((prev) => prev.map((p) =>
      p.id === id ? { ...p, status: p.status === "published" ? "stopped" as PlanStatus : "published" as PlanStatus } : p
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">プラン管理</h2>
        <Button asChild size="sm"><Link to="/seller/plans/new"><Plus className="h-4 w-4 mr-1" />新規プラン</Link></Button>
      </div>

      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PlanStatus | "all")}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="published">公開中</SelectItem>
          <SelectItem value="stopped">停止</SelectItem>
          <SelectItem value="draft">下書き</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          プランがありません。新規プランを作成しましょう。
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{p.name}</h3>
                    <Badge variant={planStatusVariant[p.status]}>{planStatusLabel[p.status]}</Badge>
                    <Badge variant="outline">{planTypeLabel[p.planType]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{p.description}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-lg font-bold">{formatCurrency(p.price)}</p>
                  <p className="text-xs text-muted-foreground">{p.planType === "subscription" ? "/ 月" : "単発"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>会員: {p.memberCount}名</span>
                <span>ロール: {p.discordRoleName}</span>
                {p.grantPolicy === "limited" && <span>期限: {p.grantDays}日</span>}
              </div>

              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/seller/plans/${p.id}`}><Edit className="h-3 w-3 mr-1" />編集</Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      {p.status === "published" ? <><EyeOff className="h-3 w-3 mr-1" />停止</> : <><Eye className="h-3 w-3 mr-1" />公開</>}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>プランを{p.status === "published" ? "停止" : "公開"}しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        {p.status === "published"
                          ? "新規購入ができなくなります。既存会員には影響しません。"
                          : "このプランが購入可能になります。"}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction onClick={() => togglePublish(p.id)}>
                        {p.status === "published" ? "停止する" : "公開する"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
