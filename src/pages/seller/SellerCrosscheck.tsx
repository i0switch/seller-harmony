import { mockCrosscheck } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function SellerCrosscheck() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">クロスチェック</h2>
        <Button size="sm" variant="outline">手動チェック実行</Button>
      </div>
      <p className="text-sm text-muted-foreground">Stripe決済状態とDiscordロールの整合性を確認します</p>
      {mockCrosscheck.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-success" />
          <p className="mt-3 font-semibold">不整合なし</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mockCrosscheck.map((c) => (
            <div key={c.memberId} className="glass-card rounded-xl p-4 space-y-2 border-destructive/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="font-semibold">{c.discordUsername}</p>
                <Badge variant="destructive">要対応</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{c.issue}</p>
              <p className="text-xs text-muted-foreground">検出: {new Date(c.detectedAt).toLocaleString("ja-JP")}</p>
              <Button size="sm" variant="destructive">自動修復</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
