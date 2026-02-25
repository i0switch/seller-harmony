import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDateTimeJP } from "@/types";
import { platformApi } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, AlertTriangle } from "lucide-react";
import { ErrorBanner } from "@/components/shared";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PlatformSystemControl() {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: switches = [], isLoading, error, refetch } = useQuery({
    queryKey: ["platform", "killSwitches"],
    queryFn: () => platformApi.getKillSwitches(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => platformApi.toggleKillSwitch(id, enabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform", "killSwitches"] });
      const target = switches.find(s => s.id === variables.id);
      const name = target?.name || "機能";
      toast({
        title: variables.enabled ? "⚠️ 自動処理を停止しました" : "✅ 自動処理を再開しました",
        description: `${name} を${variables.enabled ? "停止" : "再開"}しました`,
        variant: variables.enabled ? "destructive" : "default",
      });
      setConfirmId(null);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "Kill Switchの切り替えに失敗しました",
        variant: "destructive",
      });
      setConfirmId(null);
    }
  });

  const handleToggle = (id: string, newVal: boolean) => {
    setConfirmId(id);
    setPendingValue(newVal);
  };

  const confirmToggle = () => {
    if (confirmId === null) return;
    toggleMutation.mutate({ id: confirmId, enabled: pendingValue });
  };

  if (error) return <ErrorBanner error={error} onRetry={refetch} />;

  const activeCount = switches.filter((s) => s.enabled).length;
  const targetSwitch = confirmId ? switches.find(s => s.id === confirmId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-accent" />
        <h2 className="text-2xl font-bold">システム制御（Kill Switch）</h2>
      </div>

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

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 glass-card rounded-xl animate-pulse" />)}
          </div>
        ) : (
          switches.map((ks) => (
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
                  onCheckedChange={(v) => handleToggle(ks.id, v)}
                  className="shrink-0"
                  disabled={toggleMutation.isPending && confirmId === ks.id}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        {targetSwitch && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{pendingValue ? "⚠️ 自動処理を停止しますか？" : "自動処理を再開しますか？"}</AlertDialogTitle>
              <AlertDialogDescription>
                {`${targetSwitch.name} を${pendingValue ? "停止" : "再開"}します。${pendingValue ? " この操作により関連する自動処理がすべて停止されます。" : ""}`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                className={pendingValue ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  confirmToggle();
                }}
              >
                {pendingValue ? "停止する" : "再開する"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
