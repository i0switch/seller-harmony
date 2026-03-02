/// <reference lib="deno.ns" />
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN') || '';

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

    // Only sellers and platform admins can use this endpoint
    const { data: userData } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'seller' && userData?.role !== 'platform_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { guild_id, action, role_id } = await req.json();

    if (action === 'validate_bot_permission') {
      if (!guild_id || !role_id) {
        throw new Error('guild_id and role_id are required');
      }

      // UPSERT: Ensure discord_servers record exists for this seller + guild
      // This is needed because onboarding calls validation before the record is saved
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

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
        return new Response(JSON.stringify({ error: 'Forbidden: You do not own this server' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get all roles in the guild
      const rolesRes = await fetch(
        `https://discord.com/api/v10/guilds/${guild_id}/roles`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
      );
      if (!rolesRes.ok) throw new Error('Failed to fetch guild roles');
      const roles = await rolesRes.json();

      // Get bot's own user info
      const meRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      });
      if (!meRes.ok) throw new Error('Failed to fetch bot info');
      const me = await meRes.json();

      // Get bot's member info in the guild
      const memberRes = await fetch(
        `https://discord.com/api/v10/guilds/${guild_id}/members/${me.id}`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
      );
      if (!memberRes.ok) throw new Error('Bot is not in this guild');
      const member = await memberRes.json();

      // Calculate bot's highest role position
      let botMaxPos = 0;
      for (const rid of member.roles) {
        const r = roles.find((x: { id: string; position: number }) => x.id === rid);
        if (r && r.position > botMaxPos) botMaxPos = r.position;
      }

      // Check if bot can manage the target role
      const targetRole = roles.find((x: { id: string; position: number }) => x.id === role_id);
      if (!targetRole) throw new Error('Target role not found in guild');

      const status = botMaxPos > targetRole.position ? 'ok' : 'insufficient';

      // Update DB with permission status (reuse supabaseAdmin from above)
      await supabaseAdmin
        .from('discord_servers')
        .update({ bot_permission_status: status })
        .eq('guild_id', guild_id)
        .eq('seller_id', user.id);

      return new Response(
        JSON.stringify({ status, targetRole, botMaxPos }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
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
