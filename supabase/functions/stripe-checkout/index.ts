import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
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
    // Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { plan_id } = await req.json();
    if (!plan_id) throw new Error("plan_id is required");

    const { data: plan } = await supabaseClient
      .from('plans')
      .select('*, seller_profiles(*)')
      .eq('id', plan_id)
      .single();

    if (!plan) throw new Error("Plan not found");

    const { data: accountData } = await supabaseClient
      .from('stripe_connected_accounts')
      .select('*')
      .eq('seller_id', plan.seller_id)
      .single();

    if (!accountData) throw new Error("Seller has no Stripe account");

    const origin = req.headers.get('origin') || 'http://localhost:5173';
    const feeRate = plan.seller_profiles?.platform_fee_rate_bps ?? 1000;

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
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
