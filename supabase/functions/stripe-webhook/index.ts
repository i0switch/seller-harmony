import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@^14.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN') ?? '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Assign a Discord role to a buyer after successful payment.
 * Errors are caught and logged — they do not break the webhook response.
 */
async function assignDiscordRole(userId: string, sellerId: string, planId: string) {
  try {
    const { data: identity } = await supabaseAdmin
      .from('discord_identities')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: server } = await supabaseAdmin
      .from('discord_servers')
      .select('*')
      .eq('seller_id', sellerId)
      .single();

    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (identity && server && plan?.discord_role_id) {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${server.guild_id}/members/${identity.discord_user_id}/roles/${plan.discord_role_id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        }
      );
      if (!res.ok) {
        console.error(`Discord role assignment failed: ${res.status} ${await res.text()}`);
      }
    }
  } catch (err) {
    console.error('assignDiscordRole error:', err);
  }
}

/**
 * Remove a Discord role from a buyer when a subscription is canceled/expired.
 * Implements Conflict Check: If the user has another ACTIVE membership that grants the SAME role, do not remove it.
 */
async function removeDiscordRole(userId: string, sellerId: string, planId: string) {
  try {
    const { data: identity } = await supabaseAdmin
      .from('discord_identities')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: server } = await supabaseAdmin
      .from('discord_servers')
      .select('*')
      .eq('seller_id', sellerId)
      .single();

    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (identity && server && plan?.discord_role_id) {
      // Conflict check: Does the user have another active membership granting the SAME role?
      const { data: activeMemberships } = await supabaseAdmin
        .from('memberships')
        .select('plan_id, status')
        .eq('buyer_id', userId)
        .in('status', ['active', 'grace_period', 'cancel_scheduled']);

      let hasConflict = false;
      if (activeMemberships) {
        for (const m of activeMemberships) {
          if (m.plan_id === planId) continue;
          const { data: otherPlan } = await supabaseAdmin.from('plans').select('discord_role_id').eq('id', m.plan_id).single();
          if (otherPlan?.discord_role_id === plan.discord_role_id) {
            hasConflict = true;
            break;
          }
        }
      }

      if (!hasConflict) {
        const res = await fetch(
          `https://discord.com/api/v10/guilds/${server.guild_id}/members/${identity.discord_user_id}/roles/${plan.discord_role_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
          }
        );
        if (!res.ok) {
          console.error(`Discord role removal failed: ${res.status} ${await res.text()}`);
        }
      } else {
        console.log(`Skipped removing role ${plan.discord_role_id} due to another active membership.`);
      }
    }
  } catch (err) {
    console.error('removeDiscordRole error:', err);
  }
}

Deno.serve(async (req: Request) => {
  // ─── FAIL CLOSED: Reject if signature or secret is missing ───
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing Stripe-Signature header' }),
      { status: 400 }
    );
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    // Fail closed — refuse to process if webhook secret is not configured
    console.error('STRIPE_WEBHOOK_SECRET is not configured. Rejecting webhook.');
    return new Response(
      JSON.stringify({ error: 'Webhook secret not configured' }),
      { status: 500 }
    );
  }

  // ─── Signature verification (fail closed on any error) ───
  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Webhook signature verification failed:', errorMsg);
    return new Response(
      JSON.stringify({ error: `Signature verification failed: ${errorMsg}` }),
      { status: 400 }
    );
  }

  // ─── Idempotency: skip already-processed events ───
  const { data: existing } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Record event as pending ───
  try {
    await supabaseAdmin.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      processing_status: 'pending',
    });

    // ─── Handle checkout.session.completed ───
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { buyer_id, plan_id, seller_id } = session.metadata || {};

      if (buyer_id && plan_id && seller_id) {
        await supabaseAdmin.from('memberships').upsert(
          {
            buyer_id,
            plan_id,
            seller_id,
            status: 'active',
            stripe_subscription_id: (session.subscription as string) || null,
            stripe_customer_id: (session.customer as string) || null,
          },
          { onConflict: 'buyer_id,plan_id' }
        );
        await assignDiscordRole(buyer_id, seller_id, plan_id);
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await supabaseAdmin
          .from('memberships')
          .update({ status: 'grace_period' })
          .eq('stripe_subscription_id', invoice.subscription);
      }
    } else if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.cancel_at_period_end) {
        await supabaseAdmin
          .from('memberships')
          .update({ status: 'cancel_scheduled' })
          .eq('stripe_subscription_id', sub.id);
      } else if (sub.status === 'active') {
        // Recovered from grace period
        await supabaseAdmin
          .from('memberships')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', sub.id);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('buyer_id, seller_id, plan_id')
        .eq('stripe_subscription_id', sub.id)
        .single();

      if (membership) {
        await supabaseAdmin
          .from('memberships')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', sub.id);

        await removeDiscordRole(membership.buyer_id, membership.seller_id, membership.plan_id);
      }
    }

    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({ processing_status: 'processed' })
      .eq('stripe_event_id', event.id);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Webhook processing error:', err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({
        processing_status: 'failed',
        error_message: errorMsg,
      })
      .eq('stripe_event_id', event.id);

    // Return 200 to prevent Stripe from retrying (event is recorded for manual retry)
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
