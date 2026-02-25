import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crosscheckJudgmentLabel, crosscheckJudgmentVariant, billingStatusLabel, billingStatusVariant, roleStatusLabel, roleStatusVariant, formatDateTimeJP, type CrosscheckJudgment } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { RefreshCw, Shield, ShieldOff, Eye, CheckCircle, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { sellerApi } from "@/services/api";
import { ErrorBanner, LoadingSkeleton } from "@/components/shared";

export default function SellerCrosscheck() {
  const [filter, setFilter] = useState<CrosscheckJudgment | "all" | "issues">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: crosscheckRows, isLoading, error, refetch } = useQuery({
    queryKey: ["seller", "crosscheck"],
    queryFn: () => sellerApi.getCrosscheck(),
  });

  const runCheckMutation = useMutation({
    mutationFn: () => sellerApi.runCrosscheck(),
    onSuccess: () => {
      toast({ title: "クロスチェック開始", description: "全会員の整合性確認をバックグラウンドで開始しました" });
      refetch();
    }
  });

  const filtered = useMemo(() => {
    if (!crosscheckRows) return [];
    if (filter === "all") return crosscheckRows;
    if (filter === "issues") return crosscheckRows.filter((c) => c.judgment !== "ok");
    return crosscheckRows.filter((c) => c.judgment === filter);
  }, [crosscheckRows, filter]);

  const issueCount = crosscheckRows?.filter((c) => c.judgment !== "ok").length || 0;

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRunCheck = () => {
    runCheckMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">クロスチェック</h2>
        <Button size="sm" variant="outline" onClick={handleRunCheck} disabled={runCheckMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${runCheckMutation.isPending ? "animate-spin" : ""}`} />
          手動チェック実行
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">Stripe課金状態 × Discordロール状態の整合性を確認します</p>

      {issueCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm">
          <span className="font-semibold text-destructive">{issueCount}件</span>の不整合が検出されています
        </div>
      )}

      <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="issues">乖離ありのみ</SelectItem>
          <SelectItem value="ok">正常</SelectItem>
          <SelectItem value="needs_relink">要再連携</SelectItem>
          <SelectItem value="needs_grant">要付与</SelectItem>
          <SelectItem value="needs_revoke">要剥奪</SelectItem>
          <SelectItem value="grace_period">猶予期間</SelectItem>
          <SelectItem value="error">エラー</SelectItem>
        </SelectContent>
      </Select>

      {error ? (
        <ErrorBanner error={error} onRetry={refetch} />
      ) : isLoading ? (
        <LoadingSkeleton type="cards" rows={3} />
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center space-y-3">
          <CheckCircle className="h-12 w-12 mx-auto text-success" />
          <p className="font-semibold">不整合なし</p>
          <p className="text-sm text-muted-foreground">すべての会員の課金状態とロール状態が一致しています</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const isExpanded = expandedIds.has(c.memberId);
            return (
              <div key={c.memberId} className={`glass-card rounded-xl p-4 space-y-3 ${c.judgment !== "ok" ? "border-l-4 border-l-destructive" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{c.memberName}</p>
                      <Badge variant={crosscheckJudgmentVariant[c.judgment]}>{crosscheckJudgmentLabel[c.judgment]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{c.discordUsername || "Discord未連携"} ・ {c.planName}</p>
                  </div>
                  {c.judgment !== "ok" && (
                    <button onClick={() => toggleExpand(c.memberId)} className="p-1 rounded hover:bg-muted shrink-0">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                <div className="flex gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">課金:</span>
                    <Badge variant={billingStatusVariant[c.billingStatus]} className="text-xs">{billingStatusLabel[c.billingStatus]}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">ロール:</span>
                    <Badge variant={roleStatusVariant[c.roleStatus]} className="text-xs">{roleStatusLabel[c.roleStatus]}</Badge>
                  </div>
                </div>

                <p className="text-sm text-foreground leading-relaxed">{c.detail}</p>

                {isExpanded && c.judgment !== "ok" && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      <span className="text-muted-foreground font-medium">期待状態:</span>
                      <span className="font-mono">{c.expectedState}</span>
                      <span className="text-muted-foreground font-medium">実際の状態:</span>
                      <span className="font-mono">{c.actualState}</span>
                    </div>
                    <div className="flex items-start gap-2 pt-1 border-t border-border">
                      <ArrowRight className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground font-medium">{c.suggestedAction}</p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">検出: {formatDateTimeJP(c.detectedAt)}</p>

                {c.judgment !== "ok" && (
                  <div className="flex gap-2 flex-wrap">
                    <Button asChild size="sm" variant="ghost"><Link to={`/seller/members/${c.memberId}`}><Eye className="h-3 w-3 mr-1" />詳細</Link></Button>
                    {(c.judgment === "needs_grant" || c.judgment === "needs_relink") && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline"><Shield className="h-3 w-3 mr-1" />再付与</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ロールを再付与しますか？</AlertDialogTitle>
                            <AlertDialogDescription>{c.memberName} にDiscordロールを再付与します。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction onClick={() => toast({ title: "再付与をリクエストしました", description: `${c.memberName} へのロール再付与を処理中です` })}>再付与</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {c.judgment === "needs_revoke" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive"><ShieldOff className="h-3 w-3 mr-1" />剥奪</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ロールを剥奪しますか？</AlertDialogTitle>
                            <AlertDialogDescription>{c.memberName} からDiscordロールを剥奪します。この操作は取り消せません。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => toast({ title: "ロールを剥奪しました", description: `${c.memberName} のロールを剥奪しました`, variant: "destructive" })}>剥奪する</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button size="sm" variant="outline" onClick={() => toast({ title: "再同期中", description: `${c.memberName} の状態を再確認しています` })}>
                      <RefreshCw className="h-3 w-3 mr-1" />再同期
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
