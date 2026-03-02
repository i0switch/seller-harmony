# Step 01: モックデータ削除・実データ接続への書き換え

> **目的**: フロントエンドのハードコードされたモックデータを削除し、Supabase/Stripe/Discord の実APIからデータを取得するよう修正する
> **実行環境**: Lovable エディタ（https://lovable.dev/projects/228f4fc4-0fbb-435a-9b19-6a6ad65e1f39）
> **前提**: Lovable エディタにログイン済み

---

## 概要

現在のアプリにはフロントエンドに以下のハードコードが残存している:

1. **CheckoutSuccess.tsx** — `mockCheckout` オブジェクト（プラン名・価格・販売者名がハードコード）
2. **DiscordConfirm.tsx** — `mockDiscordUser` オブジェクト（Discord ユーザー情報がハードコード）  
3. **MemberMe.tsx** — ユーザー名 `user_taro#1234` 等がハードコード
4. **SellerDashboard.tsx** — `stripeStatus = "verified"` がハードコード
5. **SellerDiscordSettings.tsx** — Discord検証が `setTimeout` のフェイクロジック
6. **OnboardingStripe.tsx** — 「（デモ用: 完了にする）」ボタンが残存

これらを実API接続に書き換える。

---

## Task 1: CheckoutSuccess.tsx の修正

**ファイル**: `src/pages/buyer/CheckoutSuccess.tsx`

### 現状
```tsx
const mockCheckout = {
  planName: "プレミアム会員",
  sellerName: "星野アイ",
  planType: "subscription" as const,
  price: 2980,
  currency: "JPY",
  nextBillingDate: "2025-03-25",
  guildName: "星野ファンクラブ",
};
```

### 変更内容
URLパラメータ `session_id` を使って Stripe Checkout Session の情報を取得する。

```tsx
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, MessageCircle, AlertTriangle, Clock, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDateJP } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutData {
  planName: string;
  sellerName: string;
  planType: "subscription" | "one_time";
  price: number;
  currency: string;
  nextBillingDate?: string;
  guildName?: string;
}

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [showLater, setShowLater] = useState(false);
  const [plan, setPlan] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCheckoutData() {
      if (!sessionId) {
        setError("セッション情報が見つかりません");
        setLoading(false);
        return;
      }
      try {
        // Supabaseから session_id に紐づく membership + plan + seller を取得
        const { data: membership, error: membershipError } = await supabase
          .from("memberships")
          .select(`
            *,
            plans:plan_id (name, price, currency, interval, discord_server_id),
            seller:seller_id (
              display_name,
              seller_profiles!inner (store_name)
            )
          `)
          .eq("stripe_checkout_session_id", sessionId)
          .maybeSingle();

        if (membershipError) throw membershipError;

        if (membership) {
          const plan = membership.plans;
          const seller = membership.seller;
          
          // Discord server名の取得
          let guildName = "";
          if (plan?.discord_server_id) {
            const { data: server } = await supabase
              .from("discord_servers")
              .select("guild_name")
              .eq("guild_id", plan.discord_server_id)
              .maybeSingle();
            guildName = server?.guild_name || "";
          }

          setPlan({
            planName: plan?.name || "プラン",
            sellerName: seller?.seller_profiles?.[0]?.store_name || seller?.display_name || "販売者",
            planType: plan?.interval === "one_time" ? "one_time" : "subscription",
            price: plan?.price || 0,
            currency: plan?.currency || "JPY",
            nextBillingDate: plan?.interval !== "one_time" 
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
              : undefined,
            guildName,
          });
        } else {
          // session_id に直接対応するデータが無い場合、session_idからStripeのセッション情報を取得
          setError("購入情報の取得に失敗しました。しばらく待ってからページをリロードしてください。");
        }
      } catch (err) {
        console.error("Checkout data fetch error:", err);
        setError("購入情報の読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }
    fetchCheckoutData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="space-y-5">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || "購入情報が見つかりません"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // ... 以下の return 文は現状のJSXをそのまま使用（plan変数を参照）
```

**変更のポイント**:
- `mockCheckout` オブジェクトを削除
- `useSearchParams` で `session_id` を取得
- Supabase から `memberships` → `plans` → `seller_profiles` のリレーションでデータ取得
- ローディング / エラー状態のUI追加

**⚠️ 注意**: `memberships` テーブルに `stripe_checkout_session_id` カラムが必要。なければ `stripe_subscription_id` でStripe APIから取得するフローに変更。

---

## Task 2: DiscordConfirm.tsx の修正

**ファイル**: `src/pages/buyer/DiscordConfirm.tsx`

### 現状
```tsx
const mockDiscordUser = {
  username: "user_taro#1234",
  avatar: "🎮",
  id: "123456789012345678",
};
```

### 変更内容
認証済みユーザーの `discord_identities` からデータを取得。OAuth未実施の場合はOAuth開始画面を表示。

```tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DiscordConfirm() {
  const [discordUser, setDiscordUser] = useState<{username: string; avatar: string; id: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiscordIdentity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("discord_identities")
        .select("discord_user_id, discord_username")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setDiscordUser({
          username: data.discord_username || "Unknown",
          avatar: "🎮",
          id: data.discord_user_id,
        });
      }
      setLoading(false);
    }
    fetchDiscordIdentity();
  }, []);

  // discordUser が null の場合 → OAuth開始フローへ
  // discordUser がある場合 → 現在のUI（確認画面）を表示
```

---

## Task 3: MemberMe.tsx の修正

**ファイル**: `src/pages/buyer/MemberMe.tsx`

### 変更内容
ハードコードされた `user_taro#1234` と `taro.buyer@example.com` を認証ユーザー情報に置換。

```tsx
// ハードコード箇所（約 L179 付近）を以下に変更
const { data: { user } } = await supabase.auth.getUser();
const { data: discordIdentity } = await supabase
  .from("discord_identities")
  .select("discord_username")
  .eq("user_id", user.id)
  .maybeSingle();

// テンプレート内で使用:
// user.email — メールアドレス
// discordIdentity?.discord_username — Discordユーザー名
```

**Stripeカスタマーポータル URL** (L205付近):
```tsx
// 変更前
href="https://billing.stripe.com/p/login/test"

// 変更後 — membership の stripe_customer_id を使ってポータルURLを生成
// Stripe Customer Portal URLはEdge Functionで生成するか、
// Stripeダッシュボードで設定したポータルURLを使用
```

---

## Task 4: SellerDashboard.tsx の修正

**ファイル**: `src/pages/seller/SellerDashboard.tsx`

### 現状
```tsx
const stripeStatus = "verified" as const;
```

### 変更内容
```tsx
const [stripeStatus, setStripeStatus] = useState<"not_started" | "pending" | "verified">("not_started");

useEffect(() => {
  async function fetchStripeStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("stripe_connected_accounts")
      .select("charges_enabled, payouts_enabled, details_submitted")
      .eq("seller_id", user.id)
      .maybeSingle();
    
    if (data?.charges_enabled && data?.payouts_enabled) {
      setStripeStatus("verified");
    } else if (data?.details_submitted) {
      setStripeStatus("pending");
    }
  }
  fetchStripeStatus();
}, []);
```

---

## Task 5: SellerDiscordSettings.tsx の修正

**ファイル**: `src/pages/seller/SellerDiscordSettings.tsx`

### 現状（L52-64付近）
```tsx
const runVerify = () => {
  setVerifying(true);
  setTimeout(() => {
    // フェイク検証ロジック
    setVerifying(false);
  }, 2000);
};
```

### 変更内容
```tsx
const runVerify = async () => {
  setVerifying(true);
  try {
    const { data, error } = await supabase.functions.invoke("discord-bot", {
      body: {
        action: "validate_bot_permission",
        guild_id: guildId,
        role_id: roleId,
      },
    });
    if (error) throw error;
    // data.status === "ok" or "insufficient"
    setVerificationResult(data);
  } catch (err) {
    console.error("Discord verification failed:", err);
    setVerificationResult({ status: "error", message: String(err) });
  } finally {
    setVerifying(false);
  }
};
```

---

## Task 6: OnboardingStripe.tsx — デモボタン削除

**ファイル**: `src/pages/seller/OnboardingStripe.tsx`

### 変更内容
「（デモ用: 完了にする）」ボタンとそれに関連する `mockComplete` 関数を削除する。

**検索キーワード**: `デモ用`, `mockComplete`, `mock`

削除対象:
1. `mockComplete` 関数定義
2. 「（デモ用: 完了にする）」ボタンのJSX

---

## 完了確認

以下をすべて確認:

- [ ] `CheckoutSuccess.tsx` — `mockCheckout` 削除、URLパラメータからデータ取得
- [ ] `DiscordConfirm.tsx` — `mockDiscordUser` 削除、Supabaseからデータ取得
- [ ] `MemberMe.tsx` — ハードコードのユーザー名/メール削除、認証ユーザー使用
- [ ] `SellerDashboard.tsx` — `stripeStatus` をSupabaseから取得
- [ ] `SellerDiscordSettings.tsx` — `setTimeout` をEdge Function呼び出しに変更
- [ ] `OnboardingStripe.tsx` — デモ用ボタン削除
- [ ] ビルドエラーなし
- [ ] TypeScript エラーなし

---

## トラブルシューティング

### `memberships` に `stripe_checkout_session_id` カラムがない
→ マイグレーションでカラム追加が必要:
```sql
ALTER TABLE memberships ADD COLUMN stripe_checkout_session_id text;
CREATE INDEX idx_memberships_checkout_session ON memberships(stripe_checkout_session_id);
```

### Supabase RLS でデータが取得できない
→ RLS ポリシーが正しく設定されているか確認。Buyer は自分の membership のみ SELECT 可能である必要がある。
