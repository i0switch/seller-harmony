import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PlatformSystemControl() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">システム制御</h2>
      <div className="space-y-4">
        <div className="glass-card rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold">番人バッチ（日次整合性チェック）</p>
            <p className="text-sm text-muted-foreground">最終実行: 2025-02-25 03:00</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="default">正常</Badge>
            <Button size="sm" variant="outline">手動実行</Button>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold">Webhook受信</p>
            <p className="text-sm text-muted-foreground">Stripe Webhookの受信制御</p>
          </div>
          <Badge variant="default">稼働中</Badge>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold">新規テナント登録</p>
            <p className="text-sm text-muted-foreground">販売者の新規登録受付</p>
          </div>
          <Badge variant="default">受付中</Badge>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold">メンテナンスモード</p>
            <p className="text-sm text-muted-foreground">全サービスを一時停止</p>
          </div>
          <Badge variant="secondary">OFF</Badge>
        </div>
      </div>
    </div>
  );
}
