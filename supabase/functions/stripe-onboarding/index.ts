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

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
});

// Security: Validate origin against allowlist to prevent open redirect
const ALLOWED_ORIGINS = [
  ALLOWED_ORIGIN,
  'https://member-bridge-flow.lovable.app',
  'https://preview--member-bridge-flow.lovable.app',
].filter(Boolean) as string[];

function getOrigin(req: Request): string {
  const origin = req.headers.get('origin') || req.headers.get('referer');
  if (origin) {
    try {
      const url = new URL(origin);
      const candidate = `${url.protocol}//${url.host}`;
      if (ALLOWED_ORIGINS.includes(candidate)) {
        return candidate;
      }
    } catch {
      // Invalid URL — fall through to default
    }
  }
  return ALLOWED_ORIGIN || 'https://member-bridge-flow.lovable.app';
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // BUG-08 fix: Verify user has seller role before allowing Stripe onboarding
    const { data: userData } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || (userData.role !== 'seller' && userData.role !== 'platform_admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only sellers can create Stripe accounts' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if seller already has a Stripe account
    const { data: accountData } = await supabaseClient
      .from('stripe_connected_accounts')
      .select('*')
      .eq('seller_id', user.id)
      .single();

    let accountId = accountData?.stripe_account_id;

    if (!accountId) {
      // Create new Stripe Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      // Store in DB via service role (RLS blocks anon insert)
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabaseAdmin.from('stripe_connected_accounts').insert({
        seller_id: user.id,
        stripe_account_id: accountId,
        account_type: 'express',
      });
    }

    const origin = getOrigin(req);
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/seller/onboarding/stripe?refresh=true`,
      return_url: `${origin}/seller/onboarding/discord`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('stripe-onboarding error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
