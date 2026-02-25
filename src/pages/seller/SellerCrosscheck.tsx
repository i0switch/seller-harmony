import { useState, useMemo } from "react";
import { mockCrosscheck, crosscheckJudgmentLabel, crosscheckJudgmentVariant, billingStatusLabel, billingStatusVariant, roleStatusLabel, roleStatusVariant, formatDateTimeJP, type CrosscheckJudgment } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { RefreshCw, Shield, ShieldOff, Eye, CheckCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SellerCrosscheck() {
  const [filter, setFilter] = useState<CrosscheckJudgment | "all" | "issues">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return mockCrosscheck;
    if (filter === "issues") return mockCrosscheck.filter((c) => c.judgment !== "ok");
    return mockCrosscheck.filter((c) => c.judgment === filter);
  }, [filter]);

  const issueCount = mockCrosscheck.filter((c) => c.judgment !== "ok").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">クロスチェック</h2>
        <Button size="sm" variant="outline"><RefreshCw className="h-4 w-4 mr-1" />手動チェック実行</Button>
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

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center space-y-3">
          <CheckCircle className="h-12 w-12 mx-auto text-success" />
          <p className="font-semibold">不整合なし</p>
          <p className="text-sm text-muted-foreground">すべての会員の課金状態とロール状態が一致しています</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.memberId} className={`glass-card rounded-xl p-4 space-y-3 ${c.judgment !== "ok" ? "border-l-4 border-l-destructive" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{c.memberName}</p>
                    <Badge variant={crosscheckJudgmentVariant[c.judgment]}>{crosscheckJudgmentLabel[c.judgment]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.discordUsername || "Discord未連携"} ・ {c.planName}</p>
                </div>
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

              <p className="text-sm text-muted-foreground">{c.detail}</p>
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
                          <AlertDialogAction>再付与</AlertDialogAction>
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
                          <AlertDialogDescription>{c.memberName} からDiscordロールを剥奪します。</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground">剥奪する</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button size="sm" variant="outline"><RefreshCw className="h-3 w-3 mr-1" />再同期</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
