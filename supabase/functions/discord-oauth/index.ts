/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN');
if (!ALLOWED_ORIGIN) {
  console.error('ALLOWED_ORIGIN is not configured. CORS will reject all cross-origin requests.');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN || 'https://member-bridge-flow.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID') || '';
const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET') || '';

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

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const redirect_uri = url.searchParams.get('redirect_uri') || (ALLOWED_ORIGIN ? `${ALLOWED_ORIGIN}/buyer/discord/result` : 'https://member-bridge-flow.lovable.app/buyer/discord/result');

    // Allowed redirect URI patterns (open-redirect prevention)
    const ALLOWED_REDIRECT_PATTERNS = [
      /^https:\/\/member-bridge-flow\.lovable\.app\/buyer\/discord\/result$/,
    ];

    // Also allow the configured ALLOWED_ORIGIN if set
    const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN');
    if (allowedOrigin) {
      // Escape special regex characters in the origin
      const escaped = allowedOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      ALLOWED_REDIRECT_PATTERNS.push(new RegExp(`^${escaped}\\/buyer\\/discord\\/result$`));
    }

    // In POST body (from frontend)
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const state = body.state || url.searchParams.get('state') || '';
    // Use only the query param redirect_uri (validated above), ignore body.redirect_uri to prevent open redirect
    const actualRedirectUri = redirect_uri;

    // Validate redirect_uri against allowlist
    const isRedirectAllowed = ALLOWED_REDIRECT_PATTERNS.some(p => p.test(actualRedirectUri));
    if (!isRedirectAllowed) {
      return new Response(JSON.stringify({ error: 'Invalid redirect_uri' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client for state storage/verification
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If no code, return Discord authorization URL
    if (!code && !body.code) {
      if (!state) {
        throw new Error("State parameter is required for security.");
      }

      // Server-side state storage: save state bound to user for callback verification
      // BUG-09 fix: Use NULL instead of empty string for placeholder discord_user_id
      await supabaseAdmin.from('discord_identities').upsert({
        user_id: user.id,
        discord_user_id: null, // placeholder until OAuth completes (NULL avoids UNIQUE violation)
        discord_username: '',
        oauth_state: state,
        oauth_state_created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      const stateParam = `&state=${encodeURIComponent(state)}`;
      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(actualRedirectUri)}&response_type=code&scope=identify%20guilds.join${stateParam}`;
      return new Response(JSON.stringify({ url: discordAuthUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actualCode = code || body.code;
    const shouldSave = body.save !== false;

    // ── BUG-B02 fix: Finalize path (save=true without code) ──
    // Discord OAuth codes are one-time use. The 2-step confirmation flow
    // (step 1: exchange code & show user info, step 2: user confirms & save)
    // must NOT re-exchange the code. Instead, tokens are stored on step 1
    // and step 2 only activates memberships using the stored identity.
    if (shouldSave && !actualCode) {
      const { data: existingIdentity } = await supabaseAdmin
        .from('discord_identities')
        .select('discord_user_id, discord_username')
        .eq('user_id', user.id)
        .not('discord_user_id', 'is', null)
        .maybeSingle();

      if (!existingIdentity?.discord_user_id) {
        return new Response(JSON.stringify({ error: 'Discord連携情報が見つかりません。もう一度連携をやり直してください。' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Activate pending_discord memberships
      const { data: activatedMemberships } = await supabaseAdmin
        .from('memberships')
        .update({ status: 'active' })
        .eq('buyer_id', user.id)
        .eq('status', 'pending_discord')
        .select();

      // CAND-P1-02: Auto-grant roles for all activated memberships (2-step flow)
      if (activatedMemberships && activatedMemberships.length > 0) {
        for (const membership of activatedMemberships) {
          await assignDiscordRole(supabaseAdmin, membership.id, user.id, membership.seller_id, membership.plan_id);
        }
      }

      // Clear oauth_state (finalized)
      await supabaseAdmin
        .from('discord_identities')
        .update({ oauth_state: null, oauth_state_created_at: null })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true, saved: true, activated_count: activatedMemberships?.length || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Code exchange path: requires state verification ──
    if (!state) {
      throw new Error("State parameter is required for callback validation.");
    }

    // Server-side state verification: compare submitted state with DB-stored state
    const { data: storedIdentity } = await supabaseAdmin
      .from('discord_identities')
      .select('oauth_state, oauth_state_created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!storedIdentity?.oauth_state || storedIdentity.oauth_state !== state) {
      return new Response(JSON.stringify({ error: 'OAuth state mismatch — possible CSRF attack' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check state is not too old (10 minutes max)
    if (storedIdentity.oauth_state_created_at) {
      const stateAge = Date.now() - new Date(storedIdentity.oauth_state_created_at).getTime();
      if (stateAge > 10 * 60 * 1000) {
        return new Response(JSON.stringify({ error: 'OAuth state expired' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: actualCode,
        redirect_uri: actualRedirectUri,
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to exchange Discord authorization code: ' + (tokenData.error_description || tokenData.error || 'Unknown error'));
    }

    // Get Discord user info
    const meResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const meData = await meResponse.json();

    // BUG-09 fix: Validate discord_user_id is not empty to prevent UNIQUE constraint violation
    if (!meData.id || String(meData.id).trim() === '') {
      throw new Error('Discord API returned an empty user ID. Please try again.');
    }

    // BUG-B02 fix: Always save tokens after code exchange (code is one-time use)
    // When save=false (step 1), store tokens but keep oauth_state for verification.
    // When save=true (single-step flow), clear oauth_state immediately.
    try {
      const { error: upsertError } = await supabaseAdmin.from('discord_identities').upsert({
        user_id: user.id,
        discord_user_id: meData.id,
        discord_username: `${meData.username}${meData.discriminator !== '0' ? `#${meData.discriminator}` : ''}`,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        ...(shouldSave
          ? { oauth_state: null, oauth_state_created_at: null }
          : {}),
      }, { onConflict: 'user_id' });

      if (upsertError) {
        // Postgres error code 23505 is unique_violation
        if (upsertError.code === '23505') {
          return new Response(JSON.stringify({
            error: 'このDiscordアカウントは、すでに別のユーザーアカウントに連携されています。',
            code: 'DISCORD_ALREADY_LINKED'
          }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw upsertError;
      }
    } catch (upsertErr: any) {
      console.error('Upsert discord_identity failed:', upsertErr);
      throw upsertErr;
    }

    if (shouldSave) {
      // Activate any pending_discord memberships for this buyer
      const { data: memberships } = await supabaseAdmin
        .from('memberships')
        .update({ status: 'active' })
        .eq('buyer_id', user.id)
        .eq('status', 'pending_discord')
        .select();

      // CAND-P1-02: Auto-grant roles for all activated memberships
      if (memberships && memberships.length > 0) {
        for (const membership of memberships) {
          // Fire and forget (or track, but we don't want to block the OAuth redirect too long)
          // Actually, since we want to be "irreversible" or at least consistent, we'll wait for them
          await assignDiscordRole(supabaseAdmin, membership.id, user.id, membership.seller_id, membership.plan_id);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      discord_user: {
        id: meData.id,
        username: meData.username,
        discriminator: meData.discriminator,
        avatar: meData.avatar
      },
      saved: shouldSave
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('discord-oauth error:', error?.message || String(error));

    // If it's our custom error response, return it directly
    if (error instanceof Response) return error;

    return new Response(JSON.stringify({
      error: error?.message || 'Internal server error',
      code: error?.code || 'INTERNAL_ERROR'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * CAND-P1-02: Assign a Discord role to a buyer and record the result in role_assignments.
 */
async function assignDiscordRole(supabaseAdmin: any, membershipId: string, userId: string, sellerId: string, planId: string) {
  const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN') || '';
  if (!DISCORD_BOT_TOKEN) return;

  try {
    const { data: identity } = await supabaseAdmin
      .from('discord_identities')
      .select('discord_user_id')
      .eq('user_id', userId)
      .single();

    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('discord_role_id, discord_server_id')
      .eq('id', planId)
      .single();

    if (!identity?.discord_user_id || !plan?.discord_role_id) return;

    let guildId = '';
    if (plan.discord_server_id) {
      const { data: server } = await supabaseAdmin
        .from('discord_servers')
        .select('guild_id')
        .eq('id', plan.discord_server_id)
        .single();
      guildId = server?.guild_id;
    } else {
      // Fallback: use seller's only server if possible
      const { data: servers } = await supabaseAdmin
        .from('discord_servers')
        .select('guild_id')
        .eq('seller_id', sellerId);
      if (servers && servers.length === 1) {
        guildId = servers[0].guild_id;
      }
    }

    if (!guildId) return;

    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${identity.discord_user_id}/roles/${plan.discord_role_id}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    const status = res.ok ? 'granted' : 'failed';
    const reason = res.ok ? null : await res.text();

    await supabaseAdmin.from('role_assignments').upsert({
      membership_id: membershipId,
      discord_user_id: identity.discord_user_id,
      guild_id: guildId,
      role_id: plan.discord_role_id,
      actual_state: status,
      error_reason: reason,
    }, { onConflict: 'membership_id' });

  } catch (err) {
    console.error('assignDiscordRole error:', err);
  }
}
