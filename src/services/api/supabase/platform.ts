import type { IPlatformApi, PlatformStats } from "@/services/api.types";
import type {
  PaginatedResponse,
  PlatformTenant,
  PlatformWebhookEvent,
  RetryQueueJob,
  SystemAnnouncement,
  KillSwitchState,
  PlatformAlert,
  TenantStatus,
  StripeConnectStatus,
  WebhookProcessStatus,
  RetryJobStatus,
} from "@/types";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_KILL_SWITCHES: KillSwitchState[] = [
  {
    id: "webhook_auto_process",
    name: "Webhook自動処理",
    description: "Stripe Webhookの自動処理を停止します",
    enabled: false,
    lastChangedAt: new Date(0).toISOString(),
    lastChangedBy: "system",
  },
  {
    id: "discord_role_grant",
    name: "Discordロール付与",
    description: "Discordロールの自動付与を停止します",
    enabled: false,
    lastChangedAt: new Date(0).toISOString(),
    lastChangedBy: "system",
  },
  {
    id: "retry_worker",
    name: "リトライワーカー",
    description: "失敗ジョブの自動再試行を停止します",
    enabled: false,
    lastChangedAt: new Date(0).toISOString(),
    lastChangedBy: "system",
  },
];

function toTenantStatus(input: string | null | undefined): TenantStatus {
  if (input === "active") return "active";
  if (input === "suspended") return "suspended";
  if (input === "canceled") return "canceled";
  return "trial";
}

function toStripeStatus(account: {
  details_submitted?: boolean | null;
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
} | null | undefined): StripeConnectStatus {
  if (!account) return "not_started";
  if (account.details_submitted && account.charges_enabled && account.payouts_enabled) return "verified";
  if (account.details_submitted) return "pending";
  return "restricted";
}

function toWebhookStatus(status: string | null | undefined): WebhookProcessStatus {
  if (!status) return "pending";
  const normalized = status.toLowerCase();
  if (normalized.includes("fail") || normalized.includes("error")) return "failed";
  if (normalized.includes("success") || normalized.includes("processed") || normalized.includes("done")) return "success";
  return "pending";
}

function toRetryStatus(status: string | null | undefined): RetryJobStatus {
  if (!status) return "pending";
  const normalized = status.toLowerCase();
  if (normalized.includes("pause")) return "paused";
  if (normalized.includes("exhaust") || normalized.includes("dead")) return "exhausted";
  return "pending";
}

function toPlatformAnnouncement(row: {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  target_scope: "all" | "active" | "trial" | "specific";
  status: "draft" | "published" | "ended";
  starts_at: string | null;
  ends_at: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}): SystemAnnouncement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    severity: row.severity,
    targetScope: row.target_scope,
    status: row.status,
    startsAt: row.starts_at ?? "",
    endsAt: row.ends_at ?? "",
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listTenantsAll(): Promise<PlatformTenant[]> {
  const [{ data: profiles }, { data: users }, { data: discordServers }, { data: stripeAccounts }, { data: memberships }, { data: plans }, { data: webhooks }] = await Promise.all([
    supabase.from("seller_profiles").select("user_id, store_name, status, created_at, updated_at"),
    supabase.from("users").select("id, email"),
    supabase.from("discord_servers").select("seller_id, guild_name, bot_installed"),
    supabase.from("stripe_connected_accounts").select("seller_id, details_submitted, charges_enabled, payouts_enabled"),
    supabase.from("memberships").select("seller_id, plan_id, status"),
    supabase.from("plans").select("id, seller_id, price"),
    supabase.from("stripe_webhook_events").select("seller_id, processing_status"),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u.email]));
  const discordMap = new Map((discordServers ?? []).map((d) => [d.seller_id, d]));
  const stripeMap = new Map((stripeAccounts ?? []).map((s) => [s.seller_id, s]));

  const planPriceMap = new Map((plans ?? []).map((p) => [p.id, p.price ?? 0]));

  const membershipsBySeller = new Map<string, { memberCount: number; mrr: number }>();
  (memberships ?? []).forEach((m) => {
    if (!m.seller_id) return;
    const current = membershipsBySeller.get(m.seller_id) ?? { memberCount: 0, mrr: 0 };
    const activeLike = ["active", "grace_period", "cancel_scheduled"].includes(m.status ?? "");
    if (activeLike) {
      current.memberCount += 1;
      current.mrr += planPriceMap.get(m.plan_id ?? "") ?? 0;
    }
    membershipsBySeller.set(m.seller_id, current);
  });

  const webhookErrorBySeller = new Map<string, number>();
  (webhooks ?? []).forEach((w) => {
    if (!w.seller_id) return;
    const failed = toWebhookStatus(w.processing_status) === "failed";
    if (!failed) return;
    webhookErrorBySeller.set(w.seller_id, (webhookErrorBySeller.get(w.seller_id) ?? 0) + 1);
  });

  return (profiles ?? []).map((profile) => {
    const sellerId = profile.user_id;
    const memberAgg = membershipsBySeller.get(sellerId) ?? { memberCount: 0, mrr: 0 };
    const discord = discordMap.get(sellerId);
    const stripe = stripeMap.get(sellerId);

    return {
      id: sellerId,
      name: profile.store_name || "テナント",
      email: userMap.get(sellerId) ?? "",
      status: toTenantStatus(profile.status),
      stripeStatus: toStripeStatus(stripe),
      discordGuild: discord?.guild_name ?? "",
      discordConnected: !!discord?.bot_installed,
      memberCount: memberAgg.memberCount,
      mrr: memberAgg.mrr,
      errorCount: webhookErrorBySeller.get(sellerId) ?? 0,
      createdAt: profile.created_at,
      lastActiveAt: profile.updated_at,
    };
  });
}

async function listAlertsAll(): Promise<PlatformAlert[]> {
  const [{ data: failedWebhooks }, { data: roleFailures }, { data: profiles }] = await Promise.all([
    supabase
      .from("stripe_webhook_events")
      .select("id, event_type, error_message, processing_status, created_at, seller_id")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("role_assignments")
      .select("id, error_reason, actual_state, updated_at, membership_id")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase.from("seller_profiles").select("user_id, store_name"),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.store_name]));

  const webhookAlerts: PlatformAlert[] = (failedWebhooks ?? [])
    .filter((w) => toWebhookStatus(w.processing_status) === "failed")
    .map((w) => ({
      id: `wh:${w.id}`,
      level: "error",
      message: `${w.event_type} の処理に失敗しました`,
      source: "stripe-webhook",
      tenantName: w.seller_id ? profileMap.get(w.seller_id) ?? null : null,
      timestamp: w.created_at,
      resolved: false,
    }));

  const roleAlerts: PlatformAlert[] = (roleFailures ?? [])
    .filter((r) => (r.actual_state ?? "").includes("fail"))
    .map((r) => ({
      id: `ra:${r.id}`,
      level: "warning",
      message: r.error_reason || "Discordロール同期でエラーが発生しました",
      source: "discord-role-sync",
      tenantName: null,
      timestamp: r.updated_at,
      resolved: false,
    }));

  return [...webhookAlerts, ...roleAlerts]
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, 100);
}

export const platformApi: IPlatformApi = {
  async getStats(): Promise<PlatformStats> {
    try {
      const [tenants, alerts, webhooks, roleAssignments] = await Promise.all([
        listTenantsAll(),
        listAlertsAll(),
        supabase.from("stripe_webhook_events").select("processing_status"),
        supabase.from("role_assignments").select("actual_state"),
      ]);

      const activeTenants = tenants.filter((t) => t.status === "active").length;
      const trialTenants = tenants.filter((t) => t.status === "trial").length;
      const suspendedTenants = tenants.filter((t) => t.status === "suspended").length;
      const canceledTenants = tenants.filter((t) => t.status === "canceled").length;
      const totalMembers = tenants.reduce((sum, t) => sum + t.memberCount, 0);
      const totalMRR = tenants.reduce((sum, t) => sum + t.mrr, 0);

      const webhookRows = webhooks.data ?? [];
      const webhookFailures = webhookRows.filter((w) => toWebhookStatus(w.processing_status) === "failed").length;
      const retryPending = webhookRows.filter((w) => toWebhookStatus(w.processing_status) === "pending").length;

      const roleRows = roleAssignments.data ?? [];
      const discordApiFailures = roleRows.filter((r) => (r.actual_state ?? "").includes("fail")).length;

      return {
        activeTenants,
        trialTenants,
        suspendedTenants,
        canceledTenants,
        totalMembers,
        totalMRR,
        webhookFailures,
        retryPending,
        discordApiFailures,
        unresolvedAlerts: alerts.filter((a) => !a.resolved).length,
      };
    } catch {
      return {
        activeTenants: 0,
        trialTenants: 0,
        suspendedTenants: 0,
        canceledTenants: 0,
        totalMembers: 0,
        totalMRR: 0,
        webhookFailures: 0,
        retryPending: 0,
        discordApiFailures: 0,
        unresolvedAlerts: 0,
      };
    }
  },

  async getAlerts(params): Promise<PlatformAlert[]> {
    try {
      const all = await listAlertsAll();
      if (typeof params?.resolved === "boolean") {
        return all.filter((a) => a.resolved === params.resolved);
      }
      return all;
    } catch {
      return [];
    }
  },

  async getKillSwitches(): Promise<KillSwitchState[]> {
    return DEFAULT_KILL_SWITCHES;
  },

  async toggleKillSwitch(id, enabled): Promise<{ id: string; enabled: boolean }> {
    return { id, enabled };
  },

  async getTenants(params): Promise<PaginatedResponse<PlatformTenant>> {
    try {
      const all = await listTenantsAll();

      let filtered = all;
      if (params.status && params.status !== "all") {
        filtered = filtered.filter((t) => t.status === params.status);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q));
      }

      if (params.sortKey) {
        filtered = [...filtered].sort((a, b) => {
          const aVal = a[params.sortKey as keyof PlatformTenant];
          const bVal = b[params.sortKey as keyof PlatformTenant];
          if (aVal === bVal) return 0;
          const dir = params.sortAsc ? 1 : -1;
          return (aVal! > bVal! ? 1 : -1) * dir;
        });
      }

      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const from = (page - 1) * pageSize;
      const items = filtered.slice(from, from + pageSize);

      return {
        items,
        page,
        page_size: pageSize,
        total_count: filtered.length,
      };
    } catch {
      return { items: [], page: params.page ?? 1, page_size: params.pageSize ?? 10, total_count: 0 };
    }
  },

  async getTenantById(id): Promise<PlatformTenant | null> {
    const all = await listTenantsAll();
    return all.find((t) => t.id === id) ?? null;
  },

  async suspendTenant(id): Promise<{ id: string; status: string }> {
    await supabase
      .from("seller_profiles")
      .update({ status: "suspended", updated_at: new Date().toISOString() })
      .eq("user_id", id);
    return { id, status: "suspended" };
  },

  async resumeTenant(id): Promise<{ id: string; status: string }> {
    await supabase
      .from("seller_profiles")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("user_id", id);
    return { id, status: "active" };
  },

  async getWebhooks(params): Promise<PaginatedResponse<PlatformWebhookEvent>> {
    try {
      const [{ data: webhooks }, { data: profiles }] = await Promise.all([
        supabase
          .from("stripe_webhook_events")
          .select("id, event_type, processing_status, created_at, seller_id, error_message, payload, stripe_event_id")
          .order("created_at", { ascending: false }),
        supabase.from("seller_profiles").select("user_id, store_name"),
      ]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.store_name]));

      let items: PlatformWebhookEvent[] = (webhooks ?? []).map((w) => ({
        id: w.id,
        eventType: w.event_type,
        processStatus: toWebhookStatus(w.processing_status),
        signatureVerified: true,
        receivedAt: w.created_at,
        tenantId: w.seller_id ?? "",
        tenantName: w.seller_id ? profileMap.get(w.seller_id) ?? "不明テナント" : "プラットフォーム",
        error: w.error_message,
        payload: JSON.stringify(w.payload ?? {}, null, 2),
        stripeEventId: w.stripe_event_id,
      }));

      if (params.status && params.status !== "all") {
        items = items.filter((w) => w.processStatus === params.status);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((w) => w.eventType.toLowerCase().includes(q) || w.tenantName.toLowerCase().includes(q));
      }

      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const from = (page - 1) * pageSize;

      return {
        items: items.slice(from, from + pageSize),
        page,
        page_size: pageSize,
        total_count: items.length,
      };
    } catch {
      return { items: [], page: params.page ?? 1, page_size: params.pageSize ?? 10, total_count: 0 };
    }
  },

  async reprocessWebhook(id): Promise<{ id: string; status: string }> {
    await supabase
      .from("stripe_webhook_events")
      .update({ processing_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", id);
    return { id, status: "pending" };
  },

  async getRetryQueue(params): Promise<PaginatedResponse<RetryQueueJob>> {
    try {
      const [{ data: webhooks }, { data: profiles }] = await Promise.all([
        supabase
          .from("stripe_webhook_events")
          .select("id, seller_id, processing_status, error_message, created_at, updated_at")
          .order("updated_at", { ascending: false }),
        supabase.from("seller_profiles").select("user_id, store_name"),
      ]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.store_name]));

      let items: RetryQueueJob[] = (webhooks ?? [])
        .filter((w) => toWebhookStatus(w.processing_status) !== "success")
        .map((w) => ({
          id: w.id,
          jobType: "webhook",
          tenantId: w.seller_id ?? "",
          tenantName: w.seller_id ? profileMap.get(w.seller_id) ?? "不明テナント" : "プラットフォーム",
          nextRetryAt: w.updated_at ?? w.created_at,
          retryCount: 1,
          maxRetries: 5,
          lastError: w.error_message ?? "処理待ち",
          status: toRetryStatus(w.processing_status),
          createdAt: w.created_at,
        }));

      if (params.jobType && params.jobType !== "all") {
        items = items.filter((i) => i.jobType === params.jobType);
      }
      if (params.status && params.status !== "all") {
        items = items.filter((i) => i.status === params.status);
      }

      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const from = (page - 1) * pageSize;

      return {
        items: items.slice(from, from + pageSize),
        page,
        page_size: pageSize,
        total_count: items.length,
      };
    } catch {
      return { items: [], page: params.page ?? 1, page_size: params.pageSize ?? 10, total_count: 0 };
    }
  },

  async retryJob(id): Promise<{ id: string; action: string }> {
    await supabase
      .from("stripe_webhook_events")
      .update({ processing_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", id);
    return { id, action: "retry" };
  },

  async pauseJob(id): Promise<{ id: string; action: string }> {
    await supabase
      .from("stripe_webhook_events")
      .update({ processing_status: "paused", updated_at: new Date().toISOString() })
      .eq("id", id);
    return { id, action: "pause" };
  },

  async terminateJob(id): Promise<{ id: string; action: string }> {
    await supabase
      .from("stripe_webhook_events")
      .update({ processing_status: "exhausted", updated_at: new Date().toISOString() })
      .eq("id", id);
    return { id, action: "terminate" };
  },

  async getAnnouncements(params): Promise<SystemAnnouncement[]> {
    try {
      let query = supabase
        .from("system_announcements")
        .select("id, title, body, severity, target_scope, status, starts_at, ends_at, is_published, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (params?.status) {
        query = query.eq("status", params.status as "draft" | "published" | "ended");
      }

      const { data, error } = await query;
      if (error) return [];
      return (data ?? []).map(toPlatformAnnouncement);
    } catch {
      return [];
    }
  },

  async saveAnnouncement(data): Promise<Partial<SystemAnnouncement> & { id: string }> {
    const payload = {
      id: data.id,
      title: data.title ?? "",
      body: data.body ?? "",
      severity: data.severity ?? "info",
      target_scope: data.targetScope ?? "all",
      status: data.status ?? (data.isPublished ? "published" : "draft"),
      starts_at: data.startsAt || null,
      ends_at: data.endsAt || null,
      is_published: data.isPublished ?? false,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from("system_announcements")
      .upsert(payload)
      .select("id, title, body, severity, target_scope, status, starts_at, ends_at, is_published, created_at, updated_at")
      .single();

    if (error || !saved) {
      throw new Error(error?.message ?? "save failed");
    }

    return toPlatformAnnouncement(saved);
  },
};
