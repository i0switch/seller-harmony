/// <reference lib="deno.ns" />
import Stripe from 'https://esm.sh/stripe@14.25.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN');
if (!ALLOWED_ORIGIN) {
  console.error('ALLOWED_ORIGIN is not configured. CORS will reject all cross-origin requests.');
}

const FALLBACK_ALLOWED_ORIGINS = [
  ALLOWED_ORIGIN,
  'https://member-bridge-flow.lovable.app',
  'https://preview--member-bridge-flow.lovable.app',
].filter((origin): origin is string => Boolean(origin));

function getCorsHeaders(req: Request) {
  const requestOrigin = req.headers.get('origin');
  const allowedOrigin = requestOrigin && FALLBACK_ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : (ALLOWED_ORIGIN || 'https://member-bridge-flow.lovable.app');

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin client for queries
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // --- Added: Public GET endpoint to fetch plan details for checkout page ---
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const planId = url.searchParams.get('plan_id');

      if (!planId) {
        return new Response(JSON.stringify({ error: 'plan_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch plan safely using admin client
      // Join seller_profiles via seller_id -> users.id -> seller_profiles.user_id
      const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('id, name, description, price, currency, interval, seller_id, stripe_price_id, discord_server_id, discord_role_id')
        .eq('id', planId)
        .eq('is_public', true)
        .is('deleted_at', null)
        .single();

      if (!plan || planError) {
        return new Response(JSON.stringify({ error: 'Plan not found or inactive' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch seller store_name separately
      const { data: sellerProfile } = await supabaseAdmin
        .from('seller_profiles')
        .select('store_name')
        .eq('user_id', plan.seller_id)
        .single();

      const planWithSeller = {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        seller_store_name: sellerProfile?.store_name ?? 'Store',
      };

      return new Response(JSON.stringify(planWithSeller), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- End GET endpoint ---

    // Auth validation for POST (Checkout session creation)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User-level client for auth verification and RLS-gated reads
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();

    // ── BUG-B06 fix: Cancel all active subscriptions for account deletion ──
    if (body.action === 'cancel_all_subscriptions') {
      const { data: memberships } = await supabaseAdmin
        .from('memberships')
        .select('id, stripe_subscription_id, seller_id')
        .eq('buyer_id', user.id)
        .in('status', ['active', 'grace_period', 'cancel_scheduled', 'payment_failed', 'pending_discord']);

      const results: { id: string; canceled: boolean; error?: string }[] = [];

      for (const m of (memberships || [])) {
        if (!m.stripe_subscription_id) {
          results.push({ id: m.id, canceled: true });
          continue;
        }
        try {
          // Get seller's Stripe Connect account
          const { data: acct } = await supabaseAdmin
            .from('stripe_connected_accounts')
            .select('stripe_account_id')
            .eq('seller_id', m.seller_id)
            .single();

          await stripe.subscriptions.cancel(
            m.stripe_subscription_id,
            acct?.stripe_account_id ? { stripeAccount: acct.stripe_account_id } : undefined
          );
          results.push({ id: m.id, canceled: true });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[stripe-checkout] cancel sub ${m.stripe_subscription_id}:`, msg);
          results.push({ id: m.id, canceled: false, error: msg });
        }
      }

      const failed = results.filter((r) => !r.canceled);
      if (failed.length > 0) {
        return new Response(JSON.stringify({ success: false, error: 'subscription_cancel_failed', results: failed }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabaseAdmin
        .from('memberships')
        .update({ status: 'canceled' })
        .eq('buyer_id', user.id)
        .in('status', ['active', 'grace_period', 'cancel_scheduled', 'payment_failed', 'pending_discord']);

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Create checkout session ──
    const { plan_id } = body;
    if (!plan_id) throw new Error("plan_id is required");

    // Use admin client for plan query to check deleted_at and is_active
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .is('deleted_at', null)
      .single();

    if (!plan) throw new Error("Plan not found");

    // Reject non-public plans (prevent purchasing hidden plans by guessing plan_id)
    if (plan.is_public === false) {
      return new Response(JSON.stringify({ error: 'This plan is not available for purchase' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // BUG-07 fix: Reject deleted or inactive plans
    if (plan.is_active === false) {
      return new Response(JSON.stringify({ error: 'This plan is no longer available' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use admin client for internal data (seller_profiles and stripe accounts)
    const { data: sellerProfile } = await supabaseAdmin
      .from('seller_profiles')
      .select('*')
      .eq('user_id', plan.seller_id)
      .single();

    const { data: accountData } = await supabaseAdmin
      .from('stripe_connected_accounts')
      .select('*')
      .eq('seller_id', plan.seller_id)
      .single();

    if (!accountData) throw new Error("Seller has no Stripe account");

    // Prevent duplicate active subscriptions for the same plan
    const { data: existingMembership } = await supabaseAdmin
      .from('memberships')
      .select('id, status')
      .eq('buyer_id', user.id)
      .eq('plan_id', plan_id)
      .in('status', ['active', 'pending_discord', 'grace_period', 'cancel_scheduled'])
      .maybeSingle();

    if (existingMembership) {
      return new Response(JSON.stringify({ error: 'You already have an active subscription to this plan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = req.headers.get('origin') || ALLOWED_ORIGIN || 'https://member-bridge-flow.lovable.app';
    const feeRate = sellerProfile?.platform_fee_rate_bps ?? 1000;

    const isOneTime = plan.interval === 'one_time';

    const session = await stripe.checkout.sessions.create({
      mode: isOneTime ? 'payment' : 'subscription',
      line_items: [{
        price_data: {
          currency: plan.currency,
          product_data: {
            name: plan.name,
            ...(plan.description ? { description: plan.description } : {}),
          },
          unit_amount: plan.price,
          ...(!isOneTime && {
            recurring: { interval: plan.interval === 'year' ? 'year' : 'month' },
          }),
        },
        quantity: 1,
      }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      client_reference_id: user.id,
      metadata: {
        buyer_id: user.id,
        plan_id: plan.id,
        seller_id: plan.seller_id,
        stripe_account_id: accountData.stripe_account_id,
      },
      ...(isOneTime
        ? {
          payment_intent_data: {
            application_fee_amount: Math.round(plan.price * feeRate / 10000),
          },
        }
        : {
          subscription_data: {
            application_fee_percent: feeRate / 100,
          },
        }),
    }, {
      stripeAccount: accountData.stripe_account_id,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('stripe-checkout error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
