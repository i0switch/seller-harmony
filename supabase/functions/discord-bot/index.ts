/// <reference lib="deno.ns" />
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

const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN') || '';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: userData } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const { guild_id, action, role_id, membership_id } = await req.json();

    // Role-based access: sellers/admins can use all actions; buyers can only use grant_role
    const userRole = userData?.role;
    const isBuyer = userRole === 'buyer';
    const isSellerOrAdmin = userRole === 'seller' || userRole === 'platform_admin';

    if (!isSellerOrAdmin && !(isBuyer && action === 'grant_role')) {
      return jsonResponse({ error: 'FORBIDDEN' }, 403, corsHeaders);
    }

    if (action === 'validate_bot_permission') {
      if (!guild_id || !role_id) {
        return jsonResponse({ error: 'DISCORD_GUILD_AND_ROLE_REQUIRED' }, 400, corsHeaders);
      }

      if (!DISCORD_BOT_TOKEN) {
        return jsonResponse({ error: 'DISCORD_BOT_TOKEN_MISSING' }, 500, corsHeaders);
      }

      // UPSERT: Ensure discord_servers record exists for this seller + guild
      // This is needed because onboarding calls validation before the record is saved
      const { error: upsertError } = await supabaseAdmin
        .from('discord_servers')
        .upsert(
          { seller_id: user.id, guild_id, bot_installed: false, bot_permission_status: 'unknown' },
          { onConflict: 'seller_id,guild_id', ignoreDuplicates: true }
        );

      if (upsertError) {
        console.error('Failed to upsert discord_servers:', upsertError);
      }

      // OWNERSHIP CHECK: Verify if this guild belongs to the seller
      const { data: serverData, error: serverError } = await supabaseClient
        .from('discord_servers')
        .select('id')
        .eq('guild_id', guild_id)
        .eq('seller_id', user.id)
        .single();

      if (serverError || !serverData) {
        console.error('discord server ownership check failed', serverError);
        return jsonResponse({ error: 'DISCORD_SERVER_OWNERSHIP_CHECK_FAILED' }, 403, corsHeaders);
      }

      // Get all roles in the guild
      const rolesRes = await fetch(
        `https://discord.com/api/v10/guilds/${guild_id}/roles`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
      );
      if (!rolesRes.ok) {
        console.error('Failed to fetch guild roles', rolesRes.status, await rolesRes.text());
        return jsonResponse({ error: 'DISCORD_GUILD_ROLES_FETCH_FAILED', status: rolesRes.status }, 403, corsHeaders);
      }
      const roles = await rolesRes.json();

      // Get bot's own user info
      const meRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      });
      if (!meRes.ok) {
        console.error('Failed to fetch bot info', meRes.status, await meRes.text());
        return jsonResponse({ error: 'DISCORD_BOT_AUTH_FAILED' }, 500, corsHeaders);
      }
      const me = await meRes.json();

      // Get bot's member info in the guild
      const memberRes = await fetch(
        `https://discord.com/api/v10/guilds/${guild_id}/members/${me.id}`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
      );
      if (!memberRes.ok) {
        console.error('Bot is not in this guild', memberRes.status, await memberRes.text());
        return jsonResponse({ error: 'DISCORD_BOT_NOT_IN_GUILD' }, 403, corsHeaders);
      }
      const member = await memberRes.json();

      // Calculate bot's highest role position
      let botMaxPos = 0;
      for (const rid of member.roles) {
        const r = roles.find((x: { id: string; position: number }) => x.id === rid);
        if (r && r.position > botMaxPos) botMaxPos = r.position;
      }

      // Check if bot can manage the target role
      const targetRole = roles.find((x: { id: string; position: number }) => x.id === role_id);
      if (!targetRole) {
        return jsonResponse({ error: 'DISCORD_ROLE_NOT_FOUND' }, 404, corsHeaders);
      }

      const status = botMaxPos > targetRole.position ? 'ok' : 'insufficient';

      // Fetch Guild info to get the name
      const guildRes = await fetch(
        `https://discord.com/api/v10/guilds/${guild_id}`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
      );
      let guildName = null;
      if (guildRes.ok) {
        const guildData = await guildRes.json();
        guildName = guildData.name;
      }

      // Update DB with permission status (reuse supabaseAdmin from above)
      const { error: finalUpsertError } = await supabaseAdmin
        .from('discord_servers')
        .upsert(
          {
            seller_id: user.id,
            guild_id: guild_id,
            bot_permission_status: status,
            bot_installed: true,
            ...(guildName ? { guild_name: guildName } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'seller_id,guild_id' }
        );

      if (finalUpsertError) {
        console.error('Final upsert failed:', finalUpsertError);
        return jsonResponse({ error: finalUpsertError.message }, 400, corsHeaders);
      }

      return jsonResponse({ status, targetRole, botMaxPos }, 200, corsHeaders);
    }

    if (action === 'grant_role') {
      if (!membership_id) {
        throw new Error('membership_id is required');
      }

      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('memberships')
        .select('id, buyer_id, seller_id, plan_id, status')
        .eq('id', membership_id)
        .maybeSingle();

      if (membershipError || !membership) {
        return jsonResponse({ error: 'MEMBERSHIP_NOT_FOUND' }, 404, corsHeaders);
      }

      const isBuyerOwner = userData?.role === 'buyer' && membership.buyer_id === user.id;
      const isSellerOwner = userData?.role === 'seller' && membership.seller_id === user.id;
      const isPlatformAdmin = userData?.role === 'platform_admin';

      if (!isBuyerOwner && !isSellerOwner && !isPlatformAdmin) {
        return jsonResponse({ error: 'FORBIDDEN' }, 403, corsHeaders);
      }

      if (!['active', 'grace_period', 'cancel_scheduled'].includes(membership.status)) {
        return new Response(
          JSON.stringify({ status: 'skipped', reason: 'membership_not_grantable' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: plan } = await supabaseAdmin
        .from('plans')
        .select('id, seller_id, discord_server_id, discord_role_id')
        .eq('id', membership.plan_id)
        .maybeSingle();

      if (!plan?.discord_role_id) {
        return new Response(
          JSON.stringify({ status: 'skipped', reason: 'discord_role_not_configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let guildId = '';
      if (plan.discord_server_id) {
        const { data: serverById } = await supabaseAdmin
          .from('discord_servers')
          .select('guild_id')
          .eq('id', plan.discord_server_id)
          .maybeSingle();
        guildId = serverById?.guild_id ?? '';
      }

      if (!guildId) {
        // Fallback: only use seller's server if they have exactly one
        // Multiple servers → ambiguous, return error instead of guessing
        const { data: serversBySeller } = await supabaseAdmin
          .from('discord_servers')
          .select('guild_id')
          .eq('seller_id', plan.seller_id);

        if (serversBySeller && serversBySeller.length === 1) {
          guildId = serversBySeller[0].guild_id ?? '';
          console.warn(`[discord-bot] Fallback: plan ${plan.id} has no discord_server_id, using seller's only server`);
        } else if (serversBySeller && serversBySeller.length > 1) {
          return jsonResponse(
            { status: 'failed', reason: 'ambiguous_server', detail: 'Plan has no discord_server_id and seller has multiple servers. Please configure the plan with a specific server.' },
            400,
            corsHeaders,
          );
        }
      }

      if (!guildId) {
        return new Response(
          JSON.stringify({ status: 'skipped', reason: 'discord_server_not_configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: identity } = await supabaseAdmin
        .from('discord_identities')
        .select('discord_user_id')
        .eq('user_id', membership.buyer_id)
        .maybeSingle();

      if (!identity?.discord_user_id) {
        return new Response(
          JSON.stringify({ status: 'skipped', reason: 'discord_not_linked' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const grantRes = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${identity.discord_user_id}/roles/${plan.discord_role_id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        }
      );

      if (!grantRes.ok) {
        const reason = await grantRes.text();

        await supabaseAdmin.from('role_assignments').upsert({
          membership_id: membership.id,
          discord_user_id: identity.discord_user_id,
          guild_id: guildId,
          role_id: plan.discord_role_id,
          actual_state: 'failed',
          error_reason: reason,
        }, { onConflict: 'membership_id' });

        return new Response(
          JSON.stringify({ status: 'failed', reason }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseAdmin.from('role_assignments').upsert({
        membership_id: membership.id,
        discord_user_id: identity.discord_user_id,
        guild_id: guildId,
        role_id: plan.discord_role_id,
        actual_state: 'granted',
        error_reason: null,
      }, { onConflict: 'membership_id' });

      return new Response(
        JSON.stringify({ status: 'ok', membership_id, action: 'role_granted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return jsonResponse({ error: 'UNKNOWN_ACTION' }, 400, corsHeaders);
  } catch (error: unknown) {
    console.error('discord-bot error:', error instanceof Error ? error.message : String(error));
    return jsonResponse({ error: 'DISCORD_INTERNAL_ERROR' }, 500, corsHeaders);
  }
});
