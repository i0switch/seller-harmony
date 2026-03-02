/// <reference lib="deno.ns" />
import Stripe from 'npm:stripe@^14.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN') ?? '';

// Fail-closed: Reject if critical secrets are not configured
if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not configured. Webhook handler will reject all requests.');
}

/**
 * Write an entry to audit_logs with correlation_id linked to the Stripe event.
 */
async function writeAuditLog(
  action: string,
  details: Record<string, unknown>,
  correlationId: string
) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      after_state: details as unknown as Record<string, unknown>,
      correlation_id: correlationId,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

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
        console.log('Skipped removing role due to another active membership.');
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
        // Check if the buyer already has a Discord identity linked
        const { data: discordIdentity } = await supabaseAdmin
          .from('discord_identities')
          .select('id')
          .eq('user_id', buyer_id)
          .maybeSingle();

        const initialStatus = discordIdentity ? 'active' : 'pending_discord';

        // BUG-10 fix: Retrieve subscription to get current_period_end
        let currentPeriodEnd: string | null = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(
              session.subscription as string,
              undefined,
              { stripeAccount: session.metadata?.stripe_account_id || undefined }
            );
            if (sub.current_period_end) {
              currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
            }
          } catch (err) {
            console.error('[stripe-webhook] Failed to retrieve subscription for current_period_end:', err);
          }
        }

        const { error: upsertError } = await supabaseAdmin.from('memberships').upsert(
          {
            buyer_id,
            plan_id,
            seller_id,
            status: initialStatus,
            stripe_subscription_id: (session.subscription as string) || null,
            stripe_customer_id: (session.customer as string) || null,
            current_period_end: currentPeriodEnd,
            entitlement_ends_at: null, // Reset if it was previously canceled
          },
          { onConflict: 'buyer_id,plan_id' }
        );

        if (upsertError) {
          console.error('[stripe-webhook] membership upsert error:', upsertError);
          throw new Error(`Membership upsert failed: ${upsertError.message}`);
        }

        if (discordIdentity) {
          await assignDiscordRole(buyer_id, seller_id, plan_id);
        }

        await writeAuditLog('create', {
          entity: 'membership',
          buyer_id,
          plan_id,
          seller_id,
          status: initialStatus,
        }, event.id);
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        // BUG-10 fix: Also update current_period_end on payment success
        let periodEnd: string | null = null;
        try {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          if (sub.current_period_end) {
            periodEnd = new Date(sub.current_period_end * 1000).toISOString();
          }
        } catch (err) {
          console.error('[stripe-webhook] Failed to retrieve subscription period_end:', err);
        }

        // Recover status from grace_period to active upon successful payment
        await supabaseAdmin
          .from('memberships')
          .update({
            status: 'active',
            grace_period_started_at: null,
            grace_period_ends_at: null,
            ...(periodEnd ? { current_period_end: periodEnd } : {}),
          })
          .eq('stripe_subscription_id', invoice.subscription)
          .eq('status', 'grace_period');

        await writeAuditLog('update', {
          entity: 'membership',
          action_detail: 'grace_period_recovered',
          subscription_id: invoice.subscription,
        }, event.id);
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        // Transition to grace_period
        const now = new Date();
        const endsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // default 3 days grace period
        await supabaseAdmin
          .from('memberships')
          .update({
            status: 'grace_period',
            grace_period_started_at: now.toISOString(),
            grace_period_ends_at: endsAt.toISOString()
          })
          .eq('stripe_subscription_id', invoice.subscription);

        await writeAuditLog('update', {
          entity: 'membership',
          action_detail: 'payment_failed_grace_period',
          subscription_id: invoice.subscription,
        }, event.id);
      }
    } else if (event.type === 'invoice.voided') {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const now = new Date().toISOString();
        const { data: updatedMembership } = await supabaseAdmin
          .from('memberships')
          .update({
            status: 'payment_failed',
            final_payment_failure_at: now
          })
          .eq('stripe_subscription_id', invoice.subscription)
          .select('buyer_id, seller_id, plan_id, manual_override')
          .maybeSingle();

        await writeAuditLog('update', {
          entity: 'membership',
          action_detail: 'invoice_voided_payment_failed',
          subscription_id: invoice.subscription,
        }, event.id);

        if (updatedMembership) {
          if (!updatedMembership.manual_override) {
            await removeDiscordRole(updatedMembership.buyer_id, updatedMembership.seller_id, updatedMembership.plan_id);
          } else {
            console.log('Manual override active. Skipping role removal for voided invoice.');
          }
        }
      }
    } else if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.cancel_at_period_end) {
        await supabaseAdmin
          .from('memberships')
          .update({
            status: 'cancel_scheduled',
            revoke_scheduled_at: new Date(sub.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', sub.id);

        await writeAuditLog('cancel', {
          entity: 'membership',
          action_detail: 'cancel_scheduled',
          subscription_id: sub.id,
          period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }, event.id);
      } else if (sub.status === 'active') {
        // Full recovery or state sync
        await supabaseAdmin
          .from('memberships')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', sub.id)
          .not('status', 'in', '("cancel_scheduled")');
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('buyer_id, seller_id, plan_id, manual_override')
        .eq('stripe_subscription_id', sub.id)
        .single();

      if (membership) {
        await supabaseAdmin
          .from('memberships')
          .update({
            status: 'canceled',
            entitlement_ends_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', sub.id);

        // Respect manual override: do not revoke if flag is true
        if (!membership.manual_override) {
          await removeDiscordRole(membership.buyer_id, membership.seller_id, membership.plan_id);
          await writeAuditLog('revoke_role', {
            entity: 'membership',
            buyer_id: membership.buyer_id,
            plan_id: membership.plan_id,
            reason: 'subscription_deleted',
          }, event.id);
        } else {
          console.log('Manual override active. Skipping role removal.');
          await writeAuditLog('override', {
            entity: 'membership',
            buyer_id: membership.buyer_id,
            plan_id: membership.plan_id,
            reason: 'manual_override_active',
          }, event.id);
        }
      }
    } else if (event.type === 'charge.refunded') {
      // ─── Handle charge.refunded → transition to refunded ───
      const charge = event.data.object as Stripe.Charge;
      const invoiceId = charge.invoice as string | null;
      if (invoiceId) {
        // Retrieve the invoice to find the subscription
        const invoice = await stripe.invoices.retrieve(invoiceId);
        if (invoice.subscription) {
          const { data: membership } = await supabaseAdmin
            .from('memberships')
            .select('buyer_id, seller_id, plan_id, manual_override')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (membership) {
            await supabaseAdmin
              .from('memberships')
              .update({ status: 'refunded' })
              .eq('stripe_subscription_id', invoice.subscription);

            if (!membership.manual_override) {
              await removeDiscordRole(membership.buyer_id, membership.seller_id, membership.plan_id);
            }

            await writeAuditLog('refund', {
              entity: 'membership',
              buyer_id: membership.buyer_id,
              plan_id: membership.plan_id,
              charge_id: charge.id,
            }, event.id);
          }
        }
      }
    } else if (event.type === 'charge.dispute.created') {
      // ─── Handle charge.dispute.created → set risk_flag ───
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = dispute.charge as string;
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        const invoiceId = charge.invoice as string | null;
        if (invoiceId) {
          const invoice = await stripe.invoices.retrieve(invoiceId);
          if (invoice.subscription) {
            await supabaseAdmin
              .from('memberships')
              .update({
                risk_flag: true,
                dispute_status: dispute.status,
              })
              .eq('stripe_subscription_id', invoice.subscription);

            await writeAuditLog('update', {
              entity: 'membership',
              action_detail: 'dispute_created',
              dispute_id: dispute.id,
              dispute_status: dispute.status,
            }, event.id);
          }
        }
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

    // Return 5xx so Stripe retries automatically.
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
