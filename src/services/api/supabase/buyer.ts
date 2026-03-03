import type { IBuyerApi } from "@/services/api.types";
import type { BuyerMembership, MembershipStatus, DiscordLinkStatus, RoleStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export const buyerApi: IBuyerApi = {

  async getMemberships(): Promise<BuyerMembership[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get memberships with plan data (FK exists: memberships.plan_id → plans.id)
    const { data: memberships, error } = await supabase
      .from("memberships")
      .select(`
        *,
        plans:plan_id (
          name, price, currency, interval,
          discord_server_id
        ),
        role_assignments(actual_state)
      `)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!memberships) return [];

    // Gather unique seller_ids and discord_server_ids for batch lookups
    const sellerIds = [...new Set(memberships.map(m => m.seller_id))];
    const discordServerIds = [...new Set(
      memberships
        .map(m => (m.plans as { discord_server_id?: string } | null)?.discord_server_id)
        .filter(Boolean)
    )];

    // Batch fetch seller profiles
    const { data: sellers } = await supabase
      .from("seller_profiles")
      .select("user_id, store_name")
      .in("user_id", sellerIds);
    const sellerMap = new Map((sellers || []).map(s => [s.user_id, s.store_name]));

    // Batch fetch discord servers
    const { data: servers } = discordServerIds.length > 0
      ? await supabase
        .from("discord_servers")
        .select("id, guild_name")
        .in("id", discordServerIds)
      : { data: [] };
    const serverMap = new Map((servers || []).map(s => [s.id, s.guild_name]));

    // Check if buyer has Discord identity
    const { data: discordIdentity } = await supabase
      .from("discord_identities")
      .select("discord_username")
      .eq("user_id", user.id)
      .maybeSingle();

    return memberships.map(m => {
      const plan = m.plans as { name?: string; price?: number; currency?: string; interval?: string; discord_server_id?: string } | null;
      const discordServerId = plan?.discord_server_id;
      const roleAssignment = (m.role_assignments as any)?.[0];

      // Determine Discord link status
      let discordLinkStatus: DiscordLinkStatus = "not_linked";
      let discordUsername = "";
      if (discordIdentity) {
        discordLinkStatus = "linked";
        discordUsername = discordIdentity.discord_username || "";
      }

      // CAND-P1-02: Determine role status based on role_assignments actual_state
      // This is the source of truth, avoiding incorrect assumptions.
      let roleStatus: RoleStatus = "pending";
      if (!discordIdentity) {
        roleStatus = "pending"; // Waiting for user to link Discord
      } else if (roleAssignment) {
        const state = roleAssignment.actual_state;
        if (state === "granted") roleStatus = "granted";
        else if (state === "failed") roleStatus = "failed";
        else if (state === "revoked") roleStatus = "revoked";
        else if (state === "revoke_failed") roleStatus = "failed";
      } else if (m.status === "active") {
        roleStatus = "pending"; // Provisioning in progress or needs retry
      } else if (["canceled", "expired", "refunded"].includes(m.status)) {
        roleStatus = "revoked";
      }

      return {
        id: m.id,
        planName: plan?.name || "プラン",
        sellerName: sellerMap.get(m.seller_id) || "販売者",
        planType: plan?.interval === "one_time" ? "one_time" as const : "subscription" as const,
        price: plan?.price || 0,
        currency: plan?.currency || "JPY",
        status: m.status as MembershipStatus,
        discordLinkStatus,
        discordUsername,
        roleStatus,
        roleName: "",  // Would need Discord API call to resolve
        guildName: serverMap.get(discordServerId) || "",
        nextBillingDate: plan?.interval !== "one_time"
          ? (m.current_period_end
            ? new Date(m.current_period_end).toISOString().split("T")[0]
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
          : null,
        purchasedAt: m.created_at,
        expiresAt: m.entitlement_ends_at,
      };
    });
  },

  async requestRoleGrant(membershipId: string): Promise<{ membershipId: string; action: string }> {
    // Invoke the discord-bot Edge Function to re-grant role
    const { data, error } = await supabase.functions.invoke("discord-bot", {
      body: { action: "grant_role", membership_id: membershipId },
    });
    if (error) throw error;
    if (data?.status === 'failed') {
      throw new Error(data.reason || 'Role grant failed');
    }
    if (data?.status === 'skipped') {
      return { membershipId, action: `role_grant_skipped:${data.reason || 'unknown'}` };
    }
    return { membershipId, action: data?.action || "role_granted" };
  },

  async relinkDiscord(membershipId: string): Promise<{ membershipId: string; action: string }> {
    // Redirect to Discord OAuth flow handled by frontend
    return { membershipId, action: "relink_initiated" };
  },
};
