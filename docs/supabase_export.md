# Supabase 実装内容・エクスポート資料

このドキュメントは、Seller Harmonyプロジェクトにおいて、Supabaseのバックエンド（データーベース、トリガー、Edge Functions）にデプロイまたは適用された処理をすべて一つにまとめたものです。

---

## 1. データベーススキーマ & RLSポリシー (SQL マイグレーション)
ディレクトリ: `supabase/migrations/20240101000000_01_initial_schema.sql`

```sql
-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom ENUM Types
CREATE TYPE user_role AS ENUM ('platform_admin', 'seller', 'buyer');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid', 'incomplete');
CREATE TYPE plan_interval AS ENUM ('one_time', 'monthly', 'yearly');

-- 3. Core Tables
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'buyer',
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.seller_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  description TEXT,
  support_email TEXT,
  platform_fee_rate_bps INTEGER NOT NULL DEFAULT 1000, -- 10%
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stripe_connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID UNIQUE NOT NULL REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'express',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.discord_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID UNIQUE NOT NULL REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE,
  guild_id TEXT UNIQUE NOT NULL,
  guild_name TEXT,
  bot_permission_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'jpy',
  interval plan_interval NOT NULL DEFAULT 'monthly',
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  discord_role_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.discord_identities (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  discord_user_id TEXT UNIQUE NOT NULL,
  discord_username TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT UNIQUE,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(buyer_id, plan_id)
);

CREATE TABLE public.role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  discord_role_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'failed', 'revoked'
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message TEXT
);

CREATE TABLE public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'failed'
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE public.system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_roles user_role[] NOT NULL DEFAULT '{seller, buyer}',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_seller_profiles_modtime BEFORE UPDATE ON public.seller_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_stripe_connected_accounts_modtime BEFORE UPDATE ON public.stripe_connected_accounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_discord_servers_modtime BEFORE UPDATE ON public.discord_servers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_plans_modtime BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_discord_identities_modtime BEFORE UPDATE ON public.discord_identities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_memberships_modtime BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_system_announcements_modtime BEFORE UPDATE ON public.system_announcements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seller profiles are viewable by everyone" ON public.seller_profiles FOR SELECT USING (true);
CREATE POLICY "Sellers can update their own profile" ON public.seller_profiles FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Sellers can manage their own plans" ON public.plans FOR ALL USING (auth.uid() = seller_id);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view their own memberships" ON public.memberships FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can view their customers memberships" ON public.memberships FOR SELECT USING (auth.uid() = seller_id);
-- System handles INSERT/UPDATE via service role

ALTER TABLE public.discord_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can manage their own discord servers" ON public.discord_servers FOR ALL USING (auth.uid() = seller_id);

ALTER TABLE public.discord_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own discord identity" ON public.discord_identities FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.stripe_connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can view their own stripe account" ON public.stripe_connected_accounts FOR SELECT USING (auth.uid() = seller_id);
```

---

## 2. 自動ユーザー登録用トリガー (Auth → Public)
ディレクトリ: `supabase/migrations/20240101000001_handle_new_user.sql`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role user_role;
BEGIN
  -- Determine role from metadata (default to buyer)
  assigned_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role, 
    'buyer'::user_role
  );

  INSERT INTO public.users (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    assigned_role
  );
  
  -- If role is seller, auto-create a profile
  IF assigned_role = 'seller' THEN
    INSERT INTO public.seller_profiles (user_id, store_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)) || ' Store');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 3. Edge Functions

Supabase Edge Functionsとして実装され、実行コンテキスト（Deno Deploy）上にホスティングされているコード群です。

### 3.1 Stripe オンボーディング (`stripe-onboarding/index.ts`)
販売者がStripe Expressアカウントを作成し、口座情報の手続きを行う画面へのリンクを生成します。

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
});

function getOrigin(req: Request) {
  const origin = req.headers.get('origin') || req.headers.get('referer');
  if (origin) {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  }
  return 'http://localhost:5173';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

    let { data: accountData } = await supabaseClient.from('stripe_connected_accounts').select('*').eq('seller_id', user.id).single();
    let accountId = accountData?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express', email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      });
      accountId = account.id;
      await supabaseClient.from('stripe_connected_accounts').insert({ seller_id: user.id, stripe_account_id: accountId, account_type: 'express' });
    }

    const origin = getOrigin(req);
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/seller/onboarding/stripe?refresh=true`,
      return_url: `${origin}/seller/onboarding/discord`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});
```

### 3.2 Stripe チェックアウト (`stripe-checkout/index.ts`)
購入者が「プランを購入」を押した際に、Stripe Checkout Sessionを生成します。

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { plan_id } = await req.json();
    const { data: plan } = await supabaseClient.from('plans').select('*, seller_profiles(*)').eq('id', plan_id).single();
    const { data: accountData } = await supabaseClient.from('stripe_connected_accounts').select('*').eq('seller_id', plan.seller_id).single();

    const origin = req.headers.get('origin') || 'http://localhost:5173';
    const feeRate = plan.seller_profiles?.platform_fee_rate_bps ?? 1000; 

    const session = await stripe.checkout.sessions.create({
      mode: plan.interval === 'one_time' ? 'payment' : 'subscription',
      line_items: [{
        price_data: {
          currency: plan.currency,
          product_data: { name: plan.name, description: plan.description || '' },
          unit_amount: plan.price,
          ...(plan.interval !== 'one_time' && { recurring: { interval: plan.interval } })
        },
        quantity: 1,
      }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`, 
      client_reference_id: user.id,
      metadata: { buyer_id: user.id, plan_id: plan.id, seller_id: plan.seller_id },
      ...(plan.interval === 'one_time' ? { payment_intent_data: { application_fee_amount: Math.round(plan.price * feeRate / 10000) } } : { subscription_data: { application_fee_percent: feeRate / 100 } })
    }, { stripeAccount: accountData.stripe_account_id });

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});
```

### 3.3 Discord OAuth (`discord-oauth/index.ts`)
購入者がDiscord連携を行う際のOAuth2 Authorization Code Flowをハンドルし、DBへ情報を保存します。

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID') || '';
const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET') || '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const redirect_uri = url.searchParams.get('redirect_uri') || 'http://localhost:5173/buyer/discord/result';

    if (!code) {
       const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=identify%20guilds.join`;
       return new Response(JSON.stringify({ url: discordAuthUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({ client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const tokenData = await tokenResponse.json();

    const meResponse = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const meData = await meResponse.json();

    await supabaseClient.from('discord_identities').upsert({
       user_id: user.id, discord_user_id: meData.id, discord_username: `${meData.username}${meData.discriminator !== '0' ? `#${meData.discriminator}` : ''}`,
       access_token: tokenData.access_token, refresh_token: tokenData.refresh_token,
       token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({ success: true, discord_user: meData }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});
```

### 3.4 Discord Bot 権限検証 (`discord-bot/index.ts`)
販売者が連携したDiscordサーバーに対し、管理者（Bot）の権限が十分にあるか（上位ロールの付与が可能か）を調べます。

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN') || '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user?.user_metadata?.role !== 'seller' && user?.user_metadata?.role !== 'platform_admin') throw new Error("Forbidden");

    const { guild_id, action, role_id } = await req.json();

    if (action === "validate_bot_permission") {
      const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guild_id}/roles`, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
      const roles = await rolesRes.json();
      
      const meRes = await fetch(`https://discord.com/api/v10/users/@me`, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
      const me = await meRes.json();
      
      const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guild_id}/members/${me.id}`, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
      const member = await memberRes.json();
      
      let botMaxPos = 0;
      for (const rid of member.roles) {
         const r = roles.find((x: any) => x.id === rid);
         if (r && r.position > botMaxPos) botMaxPos = r.position;
      }
      
      const targetRole = roles.find((x: any) => x.id === role_id);
      const status = botMaxPos > targetRole.position ? "ok" : "insufficient";

      await supabaseClient.from('discord_servers').update({ bot_permission_status: status }).eq('guild_id', guild_id).eq('seller_id', user.id);
      return new Response(JSON.stringify({ status, targetRole, botMaxPos }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});
```

### 3.5 Stripe Webhook (`stripe-webhook/index.ts`)
Stripe側の課金状況を検知し、DBの更新やDiscordロール自動付与（非同期）を司ります。これのみ署名検証を利用するため `verify_jwt: false` です。

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const discordBotToken = Deno.env.get('DISCORD_BOT_TOKEN') ?? '';

const stripe = new Stripe(STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

async function assignDiscordRole(userId: string, sellerId: string, planId: string) {
  try {
     const { data: identity } = await supabaseAdmin.from('discord_identities').select('*').eq('user_id', userId).single();
     const { data: server } = await supabaseAdmin.from('discord_servers').select('*').eq('seller_id', sellerId).single();
     const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', planId).single();
     
     if (identity && server && plan?.discord_role_id) {
       await fetch(`https://discord.com/api/v10/guilds/${server.guild_id}/members/${identity.discord_user_id}/roles/${plan.discord_role_id}`, {
          method: 'PUT', headers: { Authorization: `Bot ${discordBotToken}` }
       });
     }
  } catch (err) {}
}

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('Stripe-Signature');
  if (!signature || !STRIPE_WEBHOOK_SECRET) return new Response('Missing secret', { status: 400 });

  let event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return new Response(`Error: ${err.message}`, { status: 400 });
  }

  try {
    await supabaseAdmin.from('stripe_webhook_events').insert({ stripe_event_id: event.id, event_type: event.type, payload: event, processing_status: 'pending' });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { buyer_id, plan_id, seller_id } = session.metadata || {};

      if (buyer_id && plan_id && seller_id) {
        await supabaseAdmin.from('memberships').upsert({
          buyer_id, plan_id, seller_id, status: 'active', stripe_subscription_id: session.subscription as string | null,
          current_period_end: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        }, { onConflict: 'buyer_id,plan_id' });
        await assignDiscordRole(buyer_id, seller_id, plan_id);
      }
    }

    await supabaseAdmin.from('stripe_webhook_events').update({ processing_status: 'processed' }).eq('stripe_event_id', event.id);
    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    await supabaseAdmin.from('stripe_webhook_events').update({ processing_status: 'failed', processing_error: err.message }).eq('stripe_event_id', event.id);
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
});
```
