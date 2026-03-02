/// <reference lib="deno.ns" />
import Stripe from 'npm:stripe@^14.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN');
if (!ALLOWED_ORIGIN) {
  console.error('ALLOWED_ORIGIN is not configured. CORS will reject all cross-origin requests.');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN || 'https://member-bridge-flow.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req: Request) => {
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
      const { data: plan } = await supabaseAdmin
        .from('plans')
        .select(`*, seller_profiles (store_name)`)
        .eq('id', planId)
        .eq('status', 'published')
        .is('deleted_at', null)
        .single();

      if (!plan || plan.is_active === false) {
        return new Response(JSON.stringify({ error: 'Plan not found or inactive' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(plan), {
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

    const { plan_id } = await req.json();
    if (!plan_id) throw new Error("plan_id is required");

    // Use admin client for plan query to check deleted_at and is_active
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .is('deleted_at', null)
      .single();

    if (!plan) throw new Error("Plan not found");

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
            description: plan.description || '',
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
    console.error('stripe-checkout error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
