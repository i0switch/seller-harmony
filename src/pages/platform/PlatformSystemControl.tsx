import { useState } from "react";
import { mockKillSwitches, formatDateTimeJP } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PlatformSystemControl() {
  const [switches, setSwitches] = useState(mockKillSwitches.map((k) => ({ ...k })));
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);
  const [pendingValue, setPendingValue] = useState(false);

  const handleToggle = (idx: number, newVal: boolean) => {
    setConfirmIdx(idx);
    setPendingValue(newVal);
  };

  const confirmToggle = () => {
    if (confirmIdx === null) return;
    setSwitches((prev) =>
      prev.map((s, i) =>
        i === confirmIdx ? { ...s, enabled: pendingValue, lastChangedAt: new Date().toISOString(), lastChangedBy: "admin@platform.com" } : s
      )
    );
    setConfirmIdx(null);
  };

  const activeCount = switches.filter((s) => s.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-accent" />
        <h2 className="text-2xl font-bold">システム制御（Kill Switch）</h2>
      </div>

      {/* Status Summary */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${activeCount > 0 ? "bg-destructive/10 border border-destructive/30" : "glass-card"}`}>
        {activeCount > 0 ? (
          <>
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">{activeCount}個のKill Switchが有効です</p>
              <p className="text-sm text-muted-foreground">一部の自動処理が停止されています</p>
            </div>
          </>
        ) : (
          <>
            <Shield className="h-5 w-5 text-success" />
            <div>
              <p className="font-semibold">すべて正常稼働中</p>
              <p className="text-sm text-muted-foreground">すべての自動処理が有効です</p>
            </div>
          </>
        )}
      </div>

      {/* Switch List */}
      <div className="space-y-3">
        {switches.map((ks, idx) => (
          <div key={ks.id} className={`glass-card rounded-xl p-5 ${ks.enabled ? "border-destructive/40" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{ks.name}</p>
                  <Badge variant={ks.enabled ? "destructive" : "secondary"}>
                    {ks.enabled ? "停止中" : "稼働中"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{ks.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  最終変更: {formatDateTimeJP(ks.lastChangedAt)} by {ks.lastChangedBy}
                </p>
              </div>
              <Switch
                checked={ks.enabled}
                onCheckedChange={(v) => handleToggle(idx, v)}
                className="shrink-0"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmIdx !== null} onOpenChange={() => setConfirmIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingValue ? "⚠️ 自動処理を停止しますか？" : "自動処理を再開しますか？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmIdx !== null && (
                <>
                  <strong>{switches[confirmIdx].name}</strong> を
                  {pendingValue ? "停止" : "再開"}します。
                  {pendingValue && " この操作により関連する自動処理がすべて停止されます。"}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className={pendingValue ? "bg-destructive text-destructive-foreground" : ""}
              onClick={confirmToggle}
            >
              {pendingValue ? "停止する" : "再開する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
