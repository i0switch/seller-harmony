import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SellerPlanNew() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-2xl font-bold">新規プラン作成</h2>
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="space-y-2">
          <Label>プラン名</Label>
          <Input placeholder="例: プレミアム会員" />
        </div>
        <div className="space-y-2">
          <Label>月額料金（円）</Label>
          <Input type="number" placeholder="980" />
        </div>
        <div className="space-y-2">
          <Label>課金タイプ</Label>
          <Select defaultValue="month">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">月額</SelectItem>
              <SelectItem value="once">単発</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Discordロール名</Label>
          <Input placeholder="例: Premium" />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/seller/plans")} className="flex-1">キャンセル</Button>
          <Button onClick={() => navigate("/seller/plans")} className="flex-1">作成</Button>
        </div>
      </div>
    </div>
  );
}
