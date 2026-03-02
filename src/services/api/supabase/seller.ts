/**
 * Supabase-direct Seller API implementation.
 *
 * Replaces the HTTP client that pointed to localhost:8000 (mock FastAPI backend)
 * with real Supabase queries using RLS (auth.uid() = seller_id).
 */

import type {
  ISellerApi,
  SellerStats,
  SellerDiscordSettings,
  DiscordVerificationEntry,
} from "@/services/api.types";
import type {
  PaginatedResponse,
  SellerPlan,
  SellerMember,
  CrosscheckRow,
  TimelineEvent,
  PlatformWebhookEvent,
  DiscordValidationResult,
  SystemAnnouncement,
  PlanType,
  GrantPolicy,
} from "@/types";
import { supabase } from "@/integrations/supabase/client";

// ─── helpers ────────────────────────────────────────────────────────

/** Map DB interval enum → frontend PlanType */
function toPlanType(interval: string): PlanType {
  if (interval === "one_time") return "one_time";
  if (interval === "year") return "subscription_year";
  return "subscription";
}

/** Map frontend PlanType → DB interval enum */
function toInterval(planType?: PlanType): "one_time" | "month" | "year" {
  if (planType === "one_time") return "one_time";
  if (planType === "subscription_year") return "year";
  return "month";
}

/** Map DB booleans → frontend PlanStatus */
function toPlanStatus(is_public: boolean, deleted_at: string | null): SellerPlan["status"] {
  if (deleted_at) return "stopped";
  return is_public ? "published" : "draft";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSellerPlan(row: any): SellerPlan {
  const ds = row.discord_servers;
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    planType: toPlanType(row.interval),
    price: row.price,
    currency: row.currency ?? "jpy",
    status: toPlanStatus(row.is_public, row.deleted_at),
    discordGuildId: ds ? ds.guild_id : "",
    discordRoleId: row.discord_role_id ?? "",
    discordRoleName: "",
    memberCount: 0,
    grantPolicy: "unlimited" as GrantPolicy,
    grantDays: null,
    createdAt: row.created_at,
  };
}

// ─── implementation ─────────────────────────────────────────────────

export const sellerApi: ISellerApi = {

  // ── Stats ──────────────────────────────────────────────────────────
  async getStats(): Promise<SellerStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { count: totalMembers } = await supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "active");

    const { data: plans } = await supabase
      .from("plans")
      .select("id, price, is_public")
      .eq("seller_id", user.id)
      .is("deleted_at", null);

    const activePlans = plans?.filter((p) => p.is_public).length ?? 0;
    const mrr = plans?.filter((p) => p.is_public).reduce((sum, p) => sum + (p.price ?? 0), 0) ?? 0;

    return {
      totalMembers: totalMembers ?? 0,
      activePlans,
      mrr,
      churnRate: 0,
      newMembersThisMonth: 0,
      webhooksToday: 0,
    };
  },

  // ── Announcements (platform-level, read-only for sellers) ──────────
  async getAnnouncements(): Promise<SystemAnnouncement[]> {
    const { data, error } = await supabase
      .from("system_announcements")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.warn("getAnnouncements error:", error.message);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      title: (r.title as string) ?? "",
      body: (r.body as string) ?? "",
      severity: r.severity ?? "info",
      targetScope: r.target_scope ?? "all",
      status: r.status ?? "active",
      startsAt: r.starts_at ?? r.created_at ?? "",
      endsAt: r.ends_at ?? "",
      isPublished: r.is_published ?? true,
      createdAt: r.created_at ?? "",
      updatedAt: r.updated_at ?? "",
    })) as SystemAnnouncement[];
  },

  // ── Discord Settings ────────────────────────────────────────────────
  async getDiscordSettings(): Promise<SellerDiscordSettings> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: ds } = await supabase
      .from("discord_servers")
      .select("*")
      .eq("seller_id", user.id)
      .maybeSingle();

    if (!ds) {
      return {
        guildId: "",
        guildName: "",
        botConnected: false,
        botHasManageRoles: false,
        defaultRoleId: "",
        defaultRoleName: "",
        lastVerifiedAt: "",
        verificationHistory: [],
      };
    }

    return {
      guildId: ds.guild_id ?? "",
      guildName: ds.guild_name ?? "",
      botConnected: ds.bot_installed ?? false,
      botHasManageRoles: ds.bot_permission_status === "ok",
      defaultRoleId: "",
      defaultRoleName: "",
      lastVerifiedAt: ds.updated_at ?? "",
      verificationHistory: [] as DiscordVerificationEntry[],
    };
  },

  // ── Plans CRUD ─────────────────────────────────────────────────────
  async getPlans(params?): Promise<SellerPlan[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    let query = supabase
      .from("plans")
      .select("*, discord_servers(*)")
      .eq("seller_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (params?.status === "published") {
      query = query.eq("is_public", true);
    } else if (params?.status === "draft") {
      query = query.eq("is_public", false);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(toSellerPlan);
  },

  async getPlanById(id): Promise<SellerPlan | null> {
    const { data, error } = await supabase
      .from("plans")
      .select("*, discord_servers(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return toSellerPlan(data);
  },

  async savePlan(planData): Promise<Partial<SellerPlan> & { id: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Resolve discord_server_id from guildId
    let discord_server_id: string | null = null;
    if (planData.discordGuildId) {
      const { data: ds } = await supabase
        .from("discord_servers")
        .select("id")
        .eq("seller_id", user.id)
        .eq("guild_id", planData.discordGuildId)
        .maybeSingle();
      discord_server_id = ds?.id ?? null;
    }

    const row = {
      seller_id: user.id,
      name: planData.name!,
      description: planData.description ?? null,
      price: planData.price!,
      currency: planData.currency ?? "jpy",
      interval: toInterval(planData.planType),
      discord_server_id,
      discord_role_id: planData.discordRoleId ?? null,
      is_public: planData.status === "published",
      updated_at: new Date().toISOString(),
    };

    if (planData.id) {
      // Update
      const { data, error } = await supabase
        .from("plans")
        .update(row)
        .eq("id", planData.id)
        .eq("seller_id", user.id)
        .select("*, discord_servers(*)")
        .single();
      if (error) throw new Error(error.message);
      return toSellerPlan(data);
    }

    // Insert
    const { data, error } = await supabase
      .from("plans")
      .insert(row)
      .select("*, discord_servers(*)")
      .single();
    if (error) throw new Error(error.message);
    return toSellerPlan(data);
  },

  // ── Members ─────────────────────────────────────────────────────────
  async getMembers(params): Promise<PaginatedResponse<SellerMember>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("memberships")
      .select("*, plans(name)", { count: "exact" })
      .eq("seller_id", user.id)
      .range(from, to)
      .order("created_at", { ascending: false });

    if (params.billingStatus && params.billingStatus !== "all") {
      query = query.eq("status", params.billingStatus as "pending_discord" | "active" | "grace_period" | "cancel_scheduled" | "payment_failed" | "canceled" | "expired" | "refunded");
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: SellerMember[] = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.buyer_id ?? "",
      email: r.buyer_id ?? "",
      planId: r.plan_id ?? "",
      planName: r.plans?.name ?? "",
      billingStatus: r.status ?? "active",
      discordUsername: "",
      discordId: "",
      discordLinkStatus: "not_linked" as const,
      roleStatus: "pending" as const,
      lastError: null,
      joinedAt: r.created_at ?? "",
      lastPayment: r.updated_at ?? "",
    }));

    return { items, page, page_size: pageSize, total_count: count ?? 0 };
  },

  async getMemberById(id): Promise<SellerMember | null> {
    const { data, error } = await supabase
      .from("memberships")
      .select("*, plans(name)")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.buyer_id ?? "",
      email: data.buyer_id ?? "",
      planId: data.plan_id ?? "",
      planName: (data.plans as unknown as { name: string })?.name ?? "",
      billingStatus: data.status ?? "active",
      discordUsername: "",
      discordId: "",
      discordLinkStatus: "not_linked" as const,
      roleStatus: "pending" as const,
      lastError: null,
      joinedAt: data.created_at,
      lastPayment: data.updated_at,
    } as SellerMember;
  },

  async getMemberTimeline(_memberId): Promise<TimelineEvent[]> {
    return [];
  },

  // ── Crosscheck ─────────────────────────────────────────────────────
  async getCrosscheck(_params?): Promise<CrosscheckRow[]> {
    return [];
  },

  async runCrosscheck(): Promise<{ jobId: string }> {
    return { jobId: "not_implemented" };
  },

  // ── Webhooks ────────────────────────────────────────────────────────
  async getWebhooks(params): Promise<PaginatedResponse<PlatformWebhookEvent>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    return { items: [], page, page_size: pageSize, total_count: 0 };
  },

  // ── Discord Validation (proxy to Edge Function) ────────────────────
  async validateDiscord(guildId, roleId?): Promise<DiscordValidationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data, error } = await supabase.functions.invoke("discord-bot", {
      body: {
        action: "validate_bot_permission",
        guild_id: guildId,
        role_id: roleId,
      },
    });

    if (error) throw new Error(error.message);
    return data as DiscordValidationResult;
  },
};
