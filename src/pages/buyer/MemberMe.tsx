import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function MemberMe() {
  return (
    <div className="glass-card rounded-xl p-6 space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto text-2xl">
          🎫
        </div>
        <h1 className="text-xl font-bold mt-3">user_taro#1234</h1>
        <p className="text-sm text-muted-foreground">taro.buyer@example.com</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">参加プラン</span>
          <span className="font-medium">プレミアム会員</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">月額</span>
          <span className="font-medium">¥2,980</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">ステータス</span>
          <Badge variant="default">有効</Badge>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Discordロール</span>
          <Badge variant="default">プレミアム</Badge>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">次回決済</span>
          <span className="font-medium">2025-03-01</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">入会日</span>
          <span className="font-medium">2024-12-01</span>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <Button variant="outline" className="w-full">プラン変更</Button>
        <Button variant="destructive" className="w-full">解約する</Button>
      </div>
    </div>
  );
}
