import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { mockPlans, planTypeLabel, planStatusLabel, formatCurrency, type PlanType, type GrantPolicy } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Loader2, CheckCircle, XCircle } from "lucide-react";

type DiscordCheck = "idle" | "checking" | "ok" | "error";

export default function SellerPlanEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const existing = isNew ? null : mockPlans.find((p) => p.id === id);

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [planType, setPlanType] = useState<PlanType>(existing?.planType ?? "subscription");
  const [price, setPrice] = useState(existing?.price?.toString() ?? "");
  const [currency] = useState("JPY");
  const [isPublished, setIsPublished] = useState(existing?.status === "published");
  const [guildId, setGuildId] = useState(existing?.discordGuildId ?? "1234567890");
  const [roleId, setRoleId] = useState(existing?.discordRoleId ?? "");
  const [grantPolicy, setGrantPolicy] = useState<GrantPolicy>(existing?.grantPolicy ?? "unlimited");
  const [grantDays, setGrantDays] = useState(existing?.grantDays?.toString() ?? "30");
  const [discordCheck, setDiscordCheck] = useState<DiscordCheck>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "プラン名を入力してください";
    if (!price || Number(price) <= 0) e.price = "有効な金額を入力してください";
    if (!roleId.trim()) e.roleId = "DiscordロールIDを入力してください";
    if (planType === "one_time" && grantPolicy === "limited" && (!grantDays || Number(grantDays) <= 0)) {
      e.grantDays = "有効な日数を入力してください";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkDiscord = () => {
    setDiscordCheck("checking");
    setTimeout(() => {
      setDiscordCheck(guildId.length >= 10 && roleId.length > 0 ? "ok" : "error");
    }, 1200);
  };

  const handleSave = () => {
    if (!validate()) return;
    navigate("/seller/plans");
  };

  if (!isNew && !existing) {
    return (
      <div className="space-y-4">
        <Link to="/seller/plans" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> プラン一覧
        </Link>
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">プランが見つかりません</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Link to="/seller/plans" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> プラン一覧
      </Link>

      <h2 className="text-2xl font-bold">{isNew ? "新規プラン作成" : `${existing!.name} を編集`}</h2>

      {!isNew && existing!.memberCount > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-muted-foreground">このプランには{existing!.memberCount}名の会員がいます。価格変更は既存会員には適用されません。</p>
        </div>
      )}

      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="space-y-2">
          <Label>プラン名 <span className="text-destructive">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: プレミアム会員" />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label>説明</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="プランの説明..." rows={3} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>種別</Label>
            <Select value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="subscription">月額（サブスク）</SelectItem>
                <SelectItem value="one_time">単発</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>金額（{currency}） <span className="text-destructive">*</span></Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="980" />
            {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
          </div>
        </div>

        {/* Grant Policy for one_time */}
        {planType === "one_time" && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <Label className="text-sm font-medium">権限付与期間ポリシー</Label>
            <Select value={grantPolicy} onValueChange={(v) => setGrantPolicy(v as GrantPolicy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unlimited">無期限</SelectItem>
                <SelectItem value="limited">期限付き</SelectItem>
              </SelectContent>
            </Select>
            {grantPolicy === "limited" && (
              <div className="space-y-2">
                <Label>付与日数</Label>
                <Input type="number" value={grantDays} onChange={(e) => setGrantDays(e.target.value)} placeholder="30" />
                {errors.grantDays && <p className="text-xs text-destructive">{errors.grantDays}</p>}
              </div>
            )}
          </div>
        )}

        {/* Discord settings */}
        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-medium">Discord設定</Label>
          <div className="space-y-2">
            <Label className="text-xs">DiscordサーバーID</Label>
            <Input value={guildId} onChange={(e) => setGuildId(e.target.value)} placeholder="サーバーID" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">DiscordロールID <span className="text-destructive">*</span></Label>
            <Input value={roleId} onChange={(e) => { setRoleId(e.target.value); setDiscordCheck("idle"); }} placeholder="ロールID" />
            {errors.roleId && <p className="text-xs text-destructive">{errors.roleId}</p>}
          </div>
          <Button size="sm" variant="outline" onClick={checkDiscord} disabled={discordCheck === "checking" || !roleId}>
            {discordCheck === "checking" ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />検証中</> : "Discord設定を検証"}
          </Button>
          {discordCheck === "ok" && <p className="text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" />検証OK</p>}
          {discordCheck === "error" && <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" />検証NG - サーバーIDとロールIDを確認してください</p>}
        </div>

        {/* Publish */}
        <div className="flex items-center gap-3 border-t pt-4">
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          <Label>公開する</Label>
        </div>

        {isPublished && discordCheck !== "ok" && discordCheck !== "idle" && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Discord設定の検証が未完了です。公開前に検証してください。
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/seller/plans")} className="flex-1">キャンセル</Button>
          <Button onClick={handleSave} className="flex-1">{isNew ? "作成" : "保存"}</Button>
        </div>
      </div>
    </div>
  );
}
