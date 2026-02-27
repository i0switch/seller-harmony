import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SellerPlan, PlanStatus } from "@/types";
import { planStatusLabel, planStatusVariant, planTypeLabel, formatCurrency } from "@/types";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Eye, EyeOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { sellerApi } from "@/services/api";
import { ErrorBanner, LoadingSkeleton } from "@/components/shared";

export default function SellerPlans() {
  const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");
  const queryClient = useQueryClient();

  const { data: plans, isLoading, error, refetch } = useQuery({
    queryKey: ["seller", "plans"],
    queryFn: () => sellerApi.getPlans(),
  });

  const publishMutation = useMutation({
    mutationFn: (args: { id: string, data: Partial<SellerPlan> }) => sellerApi.savePlan(args.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller", "plans"] }),
  });

  const filtered = useMemo(() => {
    if (!plans) return [];
    if (statusFilter === "all") return plans;
    return plans.filter((p) => p.status === statusFilter);
  }, [plans, statusFilter]);

  const togglePublish = (p: SellerPlan) => {
    const newStatus = p.status === "published" ? "stopped" : "published";
    publishMutation.mutate({ id: p.id, data: { ...p, status: newStatus } });
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

      {error ? (
        <ErrorBanner error={error} onRetry={refetch} />
      ) : isLoading ? (
        <LoadingSkeleton type="cards" rows={3} />
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          {statusFilter === "all" ? "プランがありません。新規プランを作成しましょう。" : "条件に一致するプランがありません。"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{p.name}</h3>
                    <Badge variant={planStatusVariant[p.status]}>{planStatusLabel[p.status as keyof typeof planStatusLabel]}</Badge>
                    <Badge variant="outline">{planTypeLabel[p.planType as keyof typeof planTypeLabel]}</Badge>
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
                <span>ロール: {p.discordRoleName || "指定なし"}</span>
                {p.grantPolicy === "limited" && <span>期限: {p.grantDays}日</span>}
              </div>

              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/seller/plans/${p.id}`}><Edit className="h-3 w-3 mr-1" />編集</Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={publishMutation.isPending}>
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
                      <AlertDialogAction onClick={() => togglePublish(p)}>
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
