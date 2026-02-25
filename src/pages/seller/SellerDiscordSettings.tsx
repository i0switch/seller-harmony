import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

export default function SellerDiscordSettings() {
  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-2xl font-bold">Discord設定</h2>
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-accent" />
          <div>
            <p className="font-semibold">星野ファンクラブ</p>
            <Badge variant="default">接続済み</Badge>
          </div>
        </div>
        <div className="space-y-2">
          <Label>サーバーID</Label>
          <Input value="123456789012345678" readOnly />
        </div>
        <div className="space-y-2">
          <Label>Bot Token</Label>
          <Input value="••••••••••••••••" type="password" readOnly />
        </div>
        <Button variant="outline" className="w-full">Bot再招待</Button>
        <Button variant="destructive" className="w-full">接続解除</Button>
      </div>
    </div>
  );
}
