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
import { withTimeout } from "@/lib/async";

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

function toSellerBillingStatus(status: string): SellerMember["billingStatus"] {
  if (status === "payment_failed" || status === "grace_period") return "past_due";
  if (status === "canceled" || status === "expired" || status === "refunded") return "canceled";
  return "active";
}

// ─── implementation ─────────────────────────────────────────────────

export const sellerApi: ISellerApi = {

  // ── Stats ──────────────────────────────────────────────────────────
  async getStats(): Promise<SellerStats> {
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      "販売者情報の取得がタイムアウトしました。",
    );
    if (!user) throw new Error("Not authenticated");

    const [{ count: totalMembers }, { data: plans }] = await withTimeout(
      Promise.all([
        supabase
          .from("seller_memberships_public")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("plans")
          .select("id, price, is_public")
          .eq("seller_id", user.id)
          .is("deleted_at", null),
      ]),
      "ダッシュボード統計の取得がタイムアウトしました。",
    );

    const activePlans = plans?.filter((p) => p.is_public).length ?? 0;

    // Calculate MRR: sum of (active_member_count * plan_price) for each plan
    const { data: activeMemberships } = await withTimeout(
      supabase
        .from("seller_memberships_public")
        .select("plan_id")
        .in("status", ["active", "grace_period", "cancel_scheduled"]),
      "会員統計の取得がタイムアウトしました。",
    );

    let mrr = 0;
    if (activeMemberships && plans) {
      const planPriceMap = new Map(plans.map(p => [p.id, p.price ?? 0]));
      for (const m of activeMemberships) {
        mrr += planPriceMap.get(m.plan_id) ?? 0;
      }
    }

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
    const { data, error } = await withTimeout(
      supabase
        .from("system_announcements")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(10),
      "お知らせの取得がタイムアウトしました。",
    );

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
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      "Discord設定取得のための認証確認がタイムアウトしました。",
    );
    if (!user) throw new Error("Not authenticated");

    const { data: dsArray } = await withTimeout(
      supabase
        .from("discord_servers")
        .select("*")
        .eq("seller_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1),
      "Discord設定の取得がタイムアウトしました。",
    );
    const ds = dsArray?.[0];

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
      defaultRoleId: (ds as { default_role_id?: string | null }).default_role_id ?? "",
      defaultRoleName: "",
      lastVerifiedAt: ds.updated_at ?? "",
      verificationHistory: [] as DiscordVerificationEntry[],
    };
  },

  async saveDiscordSettings(settings: Partial<SellerDiscordSettings>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = { updated_at: new Date().toISOString() };
    if (settings.guildId !== undefined) updates.guild_id = settings.guildId;
    if (settings.botConnected !== undefined) updates.bot_installed = settings.botConnected;
    if (settings.botHasManageRoles !== undefined) updates.bot_permission_status = settings.botHasManageRoles ? 'ok' : 'unknown';
    if (settings.defaultRoleId !== undefined) updates.default_role_id = settings.defaultRoleId;

    const { error } = await supabase
      .from("discord_servers")
      .upsert(
        { seller_id: user.id, ...updates },
        { onConflict: 'seller_id,guild_id', ignoreDuplicates: false }
      );

    if (error) throw new Error(error.message);
  },

  // ── Plans CRUD ─────────────────────────────────────────────────────
  async getPlans(params?): Promise<SellerPlan[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    let query = supabase
      .from("plans")
      .select("*, discord_servers(*)")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (params?.status === "published") {
      query = query.eq("is_public", true).is("deleted_at", null);
    } else if (params?.status === "draft") {
      query = query.eq("is_public", false).is("deleted_at", null);
    } else if (params?.status === "stopped") {
      query = query.not("deleted_at", "is", null);
    }
    // No filter = return all plans (including stopped)

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(toSellerPlan);
  },

  async getPlanById(id): Promise<SellerPlan | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("plans")
      .select("*, discord_servers(*)")
      .eq("id", id)
      .eq("seller_id", user.id)
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
    let defaultRoleId: string | null = null;
    if (planData.discordGuildId) {
      const { data: ds } = await supabase
        .from("discord_servers")
        .select("id, default_role_id")
        .eq("seller_id", user.id)
        .eq("guild_id", planData.discordGuildId)
        .maybeSingle();
      discord_server_id = ds?.id ?? null;
      defaultRoleId = ds?.default_role_id ?? null;
    } else {
      const { data: servers } = await supabase
        .from("discord_servers")
        .select("id, default_role_id")
        .eq("seller_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      const fallbackServer = servers?.[0];
      discord_server_id = fallbackServer?.id ?? null;
      defaultRoleId = fallbackServer?.default_role_id ?? null;
    }

    const row = {
      seller_id: user.id,
      name: planData.name!,
      description: planData.description ?? null,
      price: planData.price!,
      currency: planData.currency ?? "jpy",
      interval: toInterval(planData.planType),
      discord_server_id,
      discord_role_id: planData.discordRoleId || defaultRoleId || null,
      is_public: planData.status === "published",
      // BUG-H04: Distinguish "stopped" from "draft" via deleted_at
      deleted_at: planData.status === "stopped" ? new Date().toISOString() : null,
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
      .from("seller_memberships_public")
      .select("id, buyer_id, plan_id, status, created_at, updated_at", { count: "exact" })
      .range(from, to)
      .order("created_at", { ascending: false });

    if (params.billingStatus && params.billingStatus !== "all") {
      query = query.eq("status", params.billingStatus as "pending_discord" | "active" | "grace_period" | "cancel_scheduled" | "payment_failed" | "canceled" | "expired" | "refunded");
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const planIds = [...new Set((data ?? []).map((row) => row.plan_id))];
    const { data: plans } = planIds.length > 0
      ? await supabase
        .from("plans")
        .select("id, name")
        .in("id", planIds)
      : { data: [] };
    const planNameMap = new Map((plans ?? []).map((plan) => [plan.id, plan.name]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: SellerMember[] = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.buyer_id ?? "",
      email: r.buyer_id ?? "",
      planId: r.plan_id ?? "",
      planName: planNameMap.get(r.plan_id) ?? "",
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("seller_memberships_public")
      .select("id, buyer_id, plan_id, status, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    const { data: plan } = await supabase
      .from("plans")
      .select("name")
      .eq("id", data.plan_id)
      .maybeSingle();

    return {
      id: data.id,
      name: data.buyer_id ?? "",
      email: data.buyer_id ?? "",
      planId: data.plan_id ?? "",
      planName: plan?.name ?? "",
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

  async getMemberTimeline(memberId): Promise<TimelineEvent[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const events: TimelineEvent[] = [];

    const { data: membership } = await supabase
      .from("seller_memberships_public")
      .select("id, status, created_at, updated_at")
      .eq("id", memberId)
      .maybeSingle();

    if (!membership) return [];

    events.push({
      id: `${memberId}:created`,
      source: "system",
      event: "membership.created",
      detail: `会員が作成されました（status: ${membership.status}）`,
      timestamp: membership.created_at,
    });

    events.push({
      id: `${memberId}:updated`,
      source: "system",
      event: "membership.updated",
      detail: `最新状態: ${membership.status}`,
      timestamp: membership.updated_at,
    });

    const { data: roleAssignments } = await supabase
      .from("role_assignments")
      .select("id, actual_state, error_reason, updated_at")
      .eq("membership_id", memberId)
      .order("updated_at", { ascending: false })
      .limit(10);

    (roleAssignments ?? []).forEach((ra) => {
      events.push({
        id: `ra:${ra.id}`,
        source: "discord",
        event: `role.${ra.actual_state}`,
        detail: ra.error_reason ? `ロール処理失敗: ${ra.error_reason}` : "Discordロール状態が更新されました",
        timestamp: ra.updated_at,
      });
    });

    return events.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  },

  // ── Crosscheck ─────────────────────────────────────────────────────
  async getCrosscheck(params?): Promise<CrosscheckRow[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: memberships, error } = await supabase
      .from("seller_memberships_public")
      .select("id, buyer_id, status, updated_at, plan_id")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    if (!memberships?.length) return [];

    const planIds = [...new Set(memberships.map((row) => row.plan_id))];
    const { data: plans } = planIds.length > 0
      ? await supabase
        .from("plans")
        .select("id, name")
        .in("id", planIds)
      : { data: [] };
    const planNameMap = new Map((plans ?? []).map((plan) => [plan.id, plan.name]));

    const buyerIds = [...new Set(memberships.map((m) => m.buyer_id))];
    const membershipIds = memberships.map((m) => m.id);

    const { data: discordIdentities } = await supabase
      .from("discord_identities")
      .select("user_id, discord_username")
      .in("user_id", buyerIds);

    const { data: roleAssignments } = await supabase
      .from("role_assignments")
      .select("membership_id, actual_state, updated_at")
      .in("membership_id", membershipIds)
      .order("updated_at", { ascending: false });

    const identityMap = new Map((discordIdentities ?? []).map((d) => [d.user_id, d.discord_username ?? ""]));
    const assignmentMap = new Map<string, { actual_state: string; updated_at: string }>();
    (roleAssignments ?? []).forEach((ra) => {
      if (!assignmentMap.has(ra.membership_id)) {
        assignmentMap.set(ra.membership_id, { actual_state: ra.actual_state, updated_at: ra.updated_at });
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: CrosscheckRow[] = memberships.map((m: any) => {
      const discordUsername = identityMap.get(m.buyer_id) ?? "";
      const assignment = assignmentMap.get(m.id);

      let roleStatus: CrosscheckRow["roleStatus"] = "pending";
      if (assignment?.actual_state === "granted") roleStatus = "granted";
      if (assignment?.actual_state === "revoked") roleStatus = "revoked";
      if (assignment?.actual_state === "failed") roleStatus = "failed";

      let judgment: CrosscheckRow["judgment"] = "ok";
      let detail = "整合しています";
      const expectedState = "課金有効かつDiscord連携時にロール付与";
      const actualState = `membership=${m.status}, discord=${discordUsername ? "linked" : "not_linked"}, role=${roleStatus}`;
      let suggestedAction = "不要";

      const bill = toSellerBillingStatus(m.status);
      if (!discordUsername && bill === "active") {
        judgment = "needs_relink";
        detail = "Discord連携が未完了です";
        suggestedAction = "購入者にDiscord再連携を案内";
      } else if (bill === "active" && roleStatus !== "granted") {
        judgment = "needs_grant";
        detail = "ロール付与が未完了です";
        suggestedAction = "ロール再付与を実行";
      } else if ((bill === "canceled" || bill === "unpaid") && roleStatus === "granted") {
        judgment = "needs_revoke";
        detail = "課金停止後もロールが残存しています";
        suggestedAction = "ロール剥奪を実行";
      } else if (bill === "past_due") {
        judgment = "grace_period";
        detail = "決済猶予期間です";
        suggestedAction = "状態監視";
      } else if (roleStatus === "failed") {
        judgment = "error";
        detail = "直近ロール同期が失敗しています";
        suggestedAction = "Discord権限と対象ロールを確認";
      }

      return {
        memberId: m.id,
        memberName: m.buyer_id,
        discordUsername,
        planName: planNameMap.get(m.plan_id) ?? "",
        billingStatus: bill,
        roleStatus,
        judgment,
        detail,
        detectedAt: assignment?.updated_at ?? m.updated_at,
        expectedState,
        actualState,
        suggestedAction,
      };
    });

    if (params?.judgment) {
      return rows.filter((row) => row.judgment === params.judgment);
    }

    return rows;
  },

  async overrideMember(memberId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("memberships")
      .update({ manual_override: true })
      .eq("id", memberId)
      .eq("seller_id", user.id);

    if (error) throw new Error(error.message);
  },

  async retryDiscordRole(memberId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: member, error: fetchErr } = await supabase
      .from("seller_memberships_public")
      .select("buyer_id, seller_id, plan_id")
      .eq("id", memberId)
      .single();

    if (fetchErr || !member) throw new Error("Member not found");

    // Call edge function to invoke retry
    const { error } = await supabase.functions.invoke("discord-bot", {
      body: {
        action: "grant_role",
        membership_id: memberId
      }
    });

    if (error) throw new Error(error.message);
  },

  async runCrosscheck(): Promise<{ jobId: string }> {
    return { jobId: `crosscheck-${Date.now()}` };
  },

  // ── Webhooks ────────────────────────────────────────────────────────
  async getWebhooks(params): Promise<PaginatedResponse<PlatformWebhookEvent>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;

    // Use minimal seller-facing view (raw payload is not exposed to sellers)
    let query = supabase
      .from("seller_webhook_events_public")
      .select("id, event_type, processing_status, error_message, created_at, stripe_event_id", { count: "exact" })
      .order("created_at", { ascending: false });

    if (params?.status && params.status !== "all") {
      query = query.eq("processing_status", params.status);
    }

    // Server-side pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.warn("getWebhooks error:", error.message);
      return { items: [], page, page_size: pageSize, total_count: 0 };
    }

    const total = count ?? 0;
    const paged = data ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: PlatformWebhookEvent[] = paged.map((row: any) => ({
      id: row.id,
      eventType: row.event_type,
      processStatus: row.processing_status,
      signatureVerified: true,
      receivedAt: row.created_at,
      tenantId: user.id,
      tenantName: "",
      error: row.error_message,
      payload: "",
      stripeEventId: row.stripe_event_id,
    }));

    return { items, page, page_size: pageSize, total_count: total };
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
