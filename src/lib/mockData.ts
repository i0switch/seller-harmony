// Mock data for the fanclub automation SaaS - Platform Admin focused

// ── Tenants ──
export type TenantStatus = "trial" | "active" | "suspended" | "canceled";
export type StripeConnectStatus = "not_started" | "pending" | "verified" | "restricted";

export interface Tenant {
  id: string;
  name: string;
  email: string;
  status: TenantStatus;
  stripeStatus: StripeConnectStatus;
  discordGuild: string;
  discordConnected: boolean;
  memberCount: number;
  mrr: number;
  errorCount: number;
  createdAt: string;
  lastActiveAt: string;
}

export const mockTenants: Tenant[] = [
  {
    id: "t1", name: "星野アイ", email: "ai@example.com", status: "active",
    stripeStatus: "verified", discordGuild: "星野ファンクラブ", discordConnected: true,
    memberCount: 342, mrr: 512800, errorCount: 1, createdAt: "2024-11-15", lastActiveAt: "2025-02-25T09:30:00Z",
  },
  {
    id: "t2", name: "鈴木花子", email: "hanako@example.com", status: "active",
    stripeStatus: "verified", discordGuild: "はなちゃんねる", discordConnected: true,
    memberCount: 128, mrr: 127200, errorCount: 0, createdAt: "2025-01-03", lastActiveAt: "2025-02-25T08:15:00Z",
  },
  {
    id: "t3", name: "田中太郎", email: "taro@example.com", status: "trial",
    stripeStatus: "pending", discordGuild: "", discordConnected: false,
    memberCount: 0, mrr: 0, errorCount: 0, createdAt: "2025-02-20", lastActiveAt: "2025-02-24T14:00:00Z",
  },
  {
    id: "t4", name: "佐藤美咲", email: "misaki@example.com", status: "active",
    stripeStatus: "verified", discordGuild: "みさきのお部屋", discordConnected: true,
    memberCount: 89, mrr: 87220, errorCount: 0, createdAt: "2024-12-01", lastActiveAt: "2025-02-25T07:45:00Z",
  },
  {
    id: "t5", name: "山田一郎", email: "ichiro@example.com", status: "suspended",
    stripeStatus: "restricted", discordGuild: "山田チャンネル", discordConnected: true,
    memberCount: 45, mrr: 0, errorCount: 5, createdAt: "2024-10-15", lastActiveAt: "2025-02-10T12:00:00Z",
  },
  {
    id: "t6", name: "高橋りな", email: "rina@example.com", status: "canceled",
    stripeStatus: "verified", discordGuild: "りなワールド", discordConnected: false,
    memberCount: 0, mrr: 0, errorCount: 0, createdAt: "2024-09-01", lastActiveAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "t7", name: "中村ケン", email: "ken@example.com", status: "trial",
    stripeStatus: "not_started", discordGuild: "", discordConnected: false,
    memberCount: 0, mrr: 0, errorCount: 0, createdAt: "2025-02-23", lastActiveAt: "2025-02-24T18:00:00Z",
  },
  {
    id: "t8", name: "伊藤さくら", email: "sakura.ito@example.com", status: "active",
    stripeStatus: "verified", discordGuild: "さくらファンクラブ", discordConnected: true,
    memberCount: 210, mrr: 310800, errorCount: 2, createdAt: "2024-11-20", lastActiveAt: "2025-02-25T10:00:00Z",
  },
  {
    id: "t9", name: "渡辺ゆう", email: "yuu@example.com", status: "active",
    stripeStatus: "verified", discordGuild: "ゆうちゃんサロン", discordConnected: true,
    memberCount: 67, mrr: 65660, errorCount: 0, createdAt: "2025-01-10", lastActiveAt: "2025-02-25T06:00:00Z",
  },
  {
    id: "t10", name: "木村そら", email: "sora@example.com", status: "trial",
    stripeStatus: "pending", discordGuild: "", discordConnected: false,
    memberCount: 0, mrr: 0, errorCount: 0, createdAt: "2025-02-22", lastActiveAt: "2025-02-23T20:00:00Z",
  },
  {
    id: "t11", name: "松本ひかり", email: "hikari@example.com", status: "active",
    stripeStatus: "verified", discordGuild: "ひかりサロン", discordConnected: true,
    memberCount: 155, mrr: 151900, errorCount: 0, createdAt: "2024-12-15", lastActiveAt: "2025-02-25T11:00:00Z",
  },
  {
    id: "t12", name: "井上たくや", email: "takuya@example.com", status: "suspended",
    stripeStatus: "restricted", discordGuild: "たくやクラブ", discordConnected: false,
    memberCount: 12, mrr: 0, errorCount: 8, createdAt: "2024-10-01", lastActiveAt: "2025-02-05T09:00:00Z",
  },
];

// ── Webhooks ──
export type WebhookStatus = "success" | "failed" | "pending";

export interface WebhookEvent {
  id: string;
  eventType: string;
  processStatus: WebhookStatus;
  signatureVerified: boolean;
  receivedAt: string;
  tenantId: string;
  tenantName: string;
  error: string | null;
  payload: string;
  stripeEventId: string;
}

export const mockWebhooks: WebhookEvent[] = [
  { id: "wh1", eventType: "checkout.session.completed", processStatus: "success", signatureVerified: true, receivedAt: "2025-02-25T10:23:00Z", tenantId: "t1", tenantName: "星野アイ", error: null, payload: '{"id":"cs_123","amount":2980}', stripeEventId: "evt_1abc" },
  { id: "wh2", eventType: "customer.subscription.deleted", processStatus: "success", signatureVerified: true, receivedAt: "2025-02-25T09:15:00Z", tenantId: "t2", tenantName: "鈴木花子", error: null, payload: '{"id":"sub_456"}', stripeEventId: "evt_2def" },
  { id: "wh3", eventType: "invoice.payment_failed", processStatus: "failed", signatureVerified: true, receivedAt: "2025-02-24T22:00:00Z", tenantId: "t1", tenantName: "星野アイ", error: "Discord API rate limit exceeded", payload: '{"id":"in_789"}', stripeEventId: "evt_3ghi" },
  { id: "wh4", eventType: "checkout.session.completed", processStatus: "success", signatureVerified: true, receivedAt: "2025-02-25T08:45:00Z", tenantId: "t4", tenantName: "佐藤美咲", error: null, payload: '{"id":"cs_321"}', stripeEventId: "evt_4jkl" },
  { id: "wh5", eventType: "customer.subscription.updated", processStatus: "success", signatureVerified: true, receivedAt: "2025-02-25T07:30:00Z", tenantId: "t8", tenantName: "伊藤さくら", error: null, payload: '{"id":"sub_654"}', stripeEventId: "evt_5mno" },
  { id: "wh6", eventType: "invoice.payment_failed", processStatus: "failed", signatureVerified: true, receivedAt: "2025-02-24T20:15:00Z", tenantId: "t5", tenantName: "山田一郎", error: "Tenant suspended - skipping processing", payload: '{"id":"in_987"}', stripeEventId: "evt_6pqr" },
  { id: "wh7", eventType: "checkout.session.completed", processStatus: "failed", signatureVerified: false, receivedAt: "2025-02-24T19:00:00Z", tenantId: "t8", tenantName: "伊藤さくら", error: "Signature verification failed", payload: '{}', stripeEventId: "evt_7stu" },
  { id: "wh8", eventType: "customer.subscription.created", processStatus: "success", signatureVerified: true, receivedAt: "2025-02-25T06:00:00Z", tenantId: "t9", tenantName: "渡辺ゆう", error: null, payload: '{"id":"sub_abc"}', stripeEventId: "evt_8vwx" },
  { id: "wh9", eventType: "invoice.paid", processStatus: "success", signatureVerified: true, receivedAt: "2025-02-25T05:30:00Z", tenantId: "t11", tenantName: "松本ひかり", error: null, payload: '{"id":"in_def"}', stripeEventId: "evt_9yza" },
  { id: "wh10", eventType: "account.updated", processStatus: "failed", signatureVerified: true, receivedAt: "2025-02-24T16:00:00Z", tenantId: "t12", tenantName: "井上たくや", error: "Account restricted - manual review required", payload: '{"id":"acct_xyz"}', stripeEventId: "evt_10bcd" },
  { id: "wh11", eventType: "checkout.session.completed", processStatus: "success", signatureVerified: true, receivedAt: "2025-02-25T11:00:00Z", tenantId: "t1", tenantName: "星野アイ", error: null, payload: '{"id":"cs_999"}', stripeEventId: "evt_11efg" },
  { id: "wh12", eventType: "customer.subscription.deleted", processStatus: "pending", signatureVerified: true, receivedAt: "2025-02-25T11:05:00Z", tenantId: "t4", tenantName: "佐藤美咲", error: null, payload: '{"id":"sub_888"}', stripeEventId: "evt_12hij" },
];

// ── Retry Queue ──
export type RetryJobType = "webhook" | "discord" | "sync";
export type RetryStatus = "pending" | "paused" | "exhausted";

export interface RetryJob {
  id: string;
  jobType: RetryJobType;
  tenantId: string;
  tenantName: string;
  nextRetryAt: string;
  retryCount: number;
  maxRetries: number;
  lastError: string;
  status: RetryStatus;
  createdAt: string;
}

export const mockRetryQueue: RetryJob[] = [
  { id: "rq1", jobType: "webhook", tenantId: "t1", tenantName: "星野アイ", nextRetryAt: "2025-02-25T12:00:00Z", retryCount: 2, maxRetries: 5, lastError: "Discord API rate limit exceeded", status: "pending", createdAt: "2025-02-24T22:00:00Z" },
  { id: "rq2", jobType: "discord", tenantId: "t5", tenantName: "山田一郎", nextRetryAt: "2025-02-25T14:00:00Z", retryCount: 4, maxRetries: 5, lastError: "Bot removed from guild", status: "pending", createdAt: "2025-02-23T10:00:00Z" },
  { id: "rq3", jobType: "sync", tenantId: "t8", tenantName: "伊藤さくら", nextRetryAt: "2025-02-25T13:00:00Z", retryCount: 1, maxRetries: 3, lastError: "Stripe API timeout", status: "pending", createdAt: "2025-02-25T07:00:00Z" },
  { id: "rq4", jobType: "discord", tenantId: "t12", tenantName: "井上たくや", nextRetryAt: "", retryCount: 5, maxRetries: 5, lastError: "Account restricted", status: "exhausted", createdAt: "2025-02-20T08:00:00Z" },
  { id: "rq5", jobType: "webhook", tenantId: "t8", tenantName: "伊藤さくら", nextRetryAt: "", retryCount: 3, maxRetries: 5, lastError: "Signature verification failed", status: "paused", createdAt: "2025-02-24T19:00:00Z" },
];

// ── Announcements ──
export type AnnouncementStatus = "draft" | "published" | "ended";
export type AnnouncementSeverity = "info" | "warning" | "critical";
export type AnnouncementTarget = "all" | "active" | "trial" | "specific";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  targetScope: AnnouncementTarget;
  status: AnnouncementStatus;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export const mockAnnouncements: Announcement[] = [
  { id: "a1", title: "メンテナンスのお知らせ", body: "2025年3月1日 2:00-4:00 にシステムメンテナンスを実施します。この間、決済処理およびDiscordロール付与が一時停止されます。", severity: "warning", targetScope: "all", status: "published", startsAt: "2025-02-25", endsAt: "2025-03-02", isPublished: true, createdAt: "2025-02-20", updatedAt: "2025-02-20" },
  { id: "a2", title: "新機能リリース: クロスチェック機能", body: "Stripe決済とDiscordロールの整合性を自動チェックする機能をリリースしました。Sellerダッシュボードからご利用いただけます。", severity: "info", targetScope: "active", status: "published", startsAt: "2025-02-15", endsAt: "2025-03-15", isPublished: true, createdAt: "2025-02-15", updatedAt: "2025-02-15" },
  { id: "a3", title: "Stripe Connect仕様変更のご案内", body: "2025年4月よりStripe Connectの手数料体系が変更されます。詳細は追ってご連絡いたします。", severity: "info", targetScope: "all", status: "draft", startsAt: "", endsAt: "", isPublished: false, createdAt: "2025-02-24", updatedAt: "2025-02-24" },
  { id: "a4", title: "Discord API障害に関するお知らせ", body: "2025年2月10日に発生したDiscord API障害により、一部のロール付与に遅延が発生しました。現在は復旧済みです。", severity: "critical", targetScope: "all", status: "ended", startsAt: "2025-02-10", endsAt: "2025-02-12", isPublished: false, createdAt: "2025-02-10", updatedAt: "2025-02-12" },
];

// ── Alerts ──
export type AlertLevel = "error" | "warning" | "info";

export interface PlatformAlert {
  id: string;
  level: AlertLevel;
  message: string;
  source: string;
  tenantName: string | null;
  timestamp: string;
  resolved: boolean;
}

export const mockAlerts: PlatformAlert[] = [
  { id: "al1", level: "error", message: "Webhook処理失敗: Discord API rate limit (星野アイ)", source: "webhook_processor", tenantName: "星野アイ", timestamp: "2025-02-24T22:00:00Z", resolved: false },
  { id: "al2", level: "error", message: "リトライ上限到達: 井上たくや (discord role grant)", source: "retry_worker", tenantName: "井上たくや", timestamp: "2025-02-24T16:00:00Z", resolved: false },
  { id: "al3", level: "warning", message: "テナント山田一郎のStripeアカウントがrestricted状態", source: "stripe_monitor", tenantName: "山田一郎", timestamp: "2025-02-23T08:00:00Z", resolved: false },
  { id: "al4", level: "warning", message: "署名検証失敗のWebhookを検出 (伊藤さくら)", source: "webhook_processor", tenantName: "伊藤さくら", timestamp: "2025-02-24T19:00:00Z", resolved: false },
  { id: "al5", level: "info", message: "番人バッチ正常完了: 不整合0件", source: "watchdog", tenantName: null, timestamp: "2025-02-25T03:00:00Z", resolved: true },
  { id: "al6", level: "error", message: "Discord Bot接続断: 井上たくや", source: "discord_monitor", tenantName: "井上たくや", timestamp: "2025-02-22T15:00:00Z", resolved: false },
];

// ── Kill Switches ──
export interface KillSwitch {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  lastChangedAt: string;
  lastChangedBy: string;
}

export const mockKillSwitches: KillSwitch[] = [
  { id: "ks1", name: "Webhook処理停止", description: "すべてのStripe Webhook受信・処理を停止します。受信したイベントはキューに蓄積されます。", enabled: false, lastChangedAt: "2025-02-20T03:00:00Z", lastChangedBy: "admin@platform.com" },
  { id: "ks2", name: "Discord付与停止", description: "新規のDiscordロール付与処理を停止します。決済は継続されますが、ロール付与は保留されます。", enabled: false, lastChangedAt: "2025-02-15T10:00:00Z", lastChangedBy: "admin@platform.com" },
  { id: "ks3", name: "Discord剥奪停止", description: "解約・不払い時のDiscordロール剥奪処理を停止します。", enabled: false, lastChangedAt: "2025-02-15T10:00:00Z", lastChangedBy: "admin@platform.com" },
  { id: "ks4", name: "番人同期停止", description: "日次の整合性チェック（番人バッチ）を停止します。不整合の自動検知・修復が行われなくなります。", enabled: false, lastChangedAt: "2025-02-25T03:00:00Z", lastChangedBy: "system" },
];

// ── Seller Plans ──
export type PlanStatus = "published" | "stopped" | "draft";
export type PlanType = "subscription" | "one_time";
export type GrantPolicy = "unlimited" | "limited";

export interface SellerPlan {
  id: string;
  name: string;
  description: string;
  planType: PlanType;
  price: number;
  currency: string;
  status: PlanStatus;
  discordGuildId: string;
  discordRoleId: string;
  discordRoleName: string;
  memberCount: number;
  grantPolicy: GrantPolicy;
  grantDays: number | null;
  createdAt: string;
}

export const mockPlans: SellerPlan[] = [
  { id: "p1", name: "スタンダード会員", description: "基本コンテンツへのアクセスとコミュニティ参加", planType: "subscription", price: 980, currency: "JPY", status: "published", discordGuildId: "1234567890", discordRoleId: "role_standard", discordRoleName: "スタンダード", memberCount: 210, grantPolicy: "unlimited", grantDays: null, createdAt: "2024-11-20" },
  { id: "p2", name: "プレミアム会員", description: "限定配信・優先サポート付きプレミアムプラン", planType: "subscription", price: 2980, currency: "JPY", status: "published", discordGuildId: "1234567890", discordRoleId: "role_premium", discordRoleName: "プレミアム", memberCount: 85, grantPolicy: "unlimited", grantDays: null, createdAt: "2024-11-20" },
  { id: "p3", name: "VIP会員", description: "1on1相談・限定イベント参加権付き最上位プラン", planType: "subscription", price: 9800, currency: "JPY", status: "published", discordGuildId: "1234567890", discordRoleId: "role_vip", discordRoleName: "VIP", memberCount: 47, grantPolicy: "unlimited", grantDays: null, createdAt: "2024-12-01" },
  { id: "p4", name: "ワンタイムパス（30日）", description: "30日間限定のお試しアクセス", planType: "one_time", price: 500, currency: "JPY", status: "stopped", discordGuildId: "1234567890", discordRoleId: "role_trial", discordRoleName: "お試し", memberCount: 12, grantPolicy: "limited", grantDays: 30, createdAt: "2025-01-10" },
  { id: "p5", name: "年末限定パス", description: "年末限定の特別コンテンツへのアクセス（下書き）", planType: "one_time", price: 1500, currency: "JPY", status: "draft", discordGuildId: "1234567890", discordRoleId: "role_special", discordRoleName: "年末限定", memberCount: 0, grantPolicy: "limited", grantDays: 14, createdAt: "2025-02-20" },
];

export const planStatusLabel: Record<PlanStatus, string> = { published: "公開中", stopped: "停止", draft: "下書き" };
export const planStatusVariant: Record<PlanStatus, "default" | "secondary" | "outline"> = { published: "default", stopped: "secondary", draft: "outline" };
export const planTypeLabel: Record<PlanType, string> = { subscription: "月額", one_time: "単発" };

// ── Seller Members ──
export type MemberBillingStatus = "active" | "past_due" | "canceled" | "unpaid";
export type DiscordLinkStatus = "linked" | "unlinked" | "expired";
export type RoleStatus = "granted" | "pending" | "revoked" | "error";

export interface SellerMember {
  id: string;
  name: string;
  email: string;
  planId: string;
  planName: string;
  billingStatus: MemberBillingStatus;
  discordUsername: string;
  discordId: string;
  discordLinkStatus: DiscordLinkStatus;
  roleStatus: RoleStatus;
  lastError: string | null;
  joinedAt: string;
  lastPayment: string;
}

export const mockMembers: SellerMember[] = [
  { id: "m1", name: "太郎", email: "taro.buyer@example.com", planId: "p2", planName: "プレミアム会員", billingStatus: "active", discordUsername: "user_taro#1234", discordId: "123456789", discordLinkStatus: "linked", roleStatus: "granted", lastError: null, joinedAt: "2024-12-01", lastPayment: "2025-02-01" },
  { id: "m2", name: "さくら", email: "sakura@example.com", planId: "p1", planName: "スタンダード会員", billingStatus: "active", discordUsername: "sakura_fan#5678", discordId: "987654321", discordLinkStatus: "linked", roleStatus: "granted", lastError: null, joinedAt: "2025-01-15", lastPayment: "2025-02-15" },
  { id: "m3", name: "ゴーストユーザー", email: "ghost@example.com", planId: "p1", planName: "スタンダード会員", billingStatus: "canceled", discordUsername: "ghost_user#0000", discordId: "111222333", discordLinkStatus: "linked", roleStatus: "granted", lastError: "ロール剥奪失敗: Bot権限不足", joinedAt: "2024-10-01", lastPayment: "2025-01-01" },
  { id: "m4", name: "ユウキ", email: "yuuki@example.com", planId: "p3", planName: "VIP会員", billingStatus: "active", discordUsername: "yuuki_vip#9999", discordId: "444555666", discordLinkStatus: "linked", roleStatus: "granted", lastError: null, joinedAt: "2025-01-20", lastPayment: "2025-02-20" },
  { id: "m5", name: "リカ", email: "rika@example.com", planId: "p2", planName: "プレミアム会員", billingStatus: "past_due", discordUsername: "rika_chan#1111", discordId: "777888999", discordLinkStatus: "linked", roleStatus: "granted", lastError: null, joinedAt: "2024-11-01", lastPayment: "2025-01-01" },
  { id: "m6", name: "ケンタ", email: "kenta@example.com", planId: "p1", planName: "スタンダード会員", billingStatus: "active", discordUsername: "", discordId: "", discordLinkStatus: "unlinked", roleStatus: "pending", lastError: "Discord未連携", joinedAt: "2025-02-10", lastPayment: "2025-02-10" },
  { id: "m7", name: "マイ", email: "mai@example.com", planId: "p4", planName: "ワンタイムパス（30日）", billingStatus: "active", discordUsername: "mai_desu#2222", discordId: "222333444", discordLinkStatus: "linked", roleStatus: "granted", lastError: null, joinedAt: "2025-02-01", lastPayment: "2025-02-01" },
  { id: "m8", name: "ソウタ", email: "souta@example.com", planId: "p2", planName: "プレミアム会員", billingStatus: "unpaid", discordUsername: "souta#3333", discordId: "555666777", discordLinkStatus: "linked", roleStatus: "error", lastError: "Discord API error: Unknown Role", joinedAt: "2024-12-15", lastPayment: "2024-12-15" },
];

export const billingStatusLabel: Record<MemberBillingStatus, string> = { active: "有効", past_due: "支払い遅延", canceled: "解約済", unpaid: "未払い" };
export const billingStatusVariant: Record<MemberBillingStatus, "default" | "secondary" | "destructive" | "outline"> = { active: "default", past_due: "secondary", canceled: "destructive", unpaid: "destructive" };
export const discordLinkLabel: Record<DiscordLinkStatus, string> = { linked: "連携済", unlinked: "未連携", expired: "期限切れ" };
export const roleStatusLabel: Record<RoleStatus, string> = { granted: "付与済", pending: "保留", revoked: "剥奪済", error: "エラー" };
export const roleStatusVariant: Record<RoleStatus, "default" | "secondary" | "destructive" | "outline"> = { granted: "default", pending: "secondary", revoked: "outline", error: "destructive" };

// ── Crosscheck ──
export type CrosscheckJudgment = "ok" | "needs_relink" | "needs_grant" | "needs_revoke" | "error" | "grace_period";

export interface CrosscheckItem {
  memberId: string;
  memberName: string;
  discordUsername: string;
  planName: string;
  billingStatus: MemberBillingStatus;
  roleStatus: RoleStatus;
  judgment: CrosscheckJudgment;
  detail: string;
  detectedAt: string;
}

export const crosscheckJudgmentLabel: Record<CrosscheckJudgment, string> = {
  ok: "正常", needs_relink: "要再連携", needs_grant: "要付与", needs_revoke: "要剥奪", error: "エラー", grace_period: "猶予期間",
};
export const crosscheckJudgmentVariant: Record<CrosscheckJudgment, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default", needs_relink: "secondary", needs_grant: "outline", needs_revoke: "destructive", error: "destructive", grace_period: "secondary",
};

export const mockCrosscheck: CrosscheckItem[] = [
  { memberId: "m1", memberName: "太郎", discordUsername: "user_taro#1234", planName: "プレミアム会員", billingStatus: "active", roleStatus: "granted", judgment: "ok", detail: "正常", detectedAt: "2025-02-25T08:00:00Z" },
  { memberId: "m2", memberName: "さくら", discordUsername: "sakura_fan#5678", planName: "スタンダード会員", billingStatus: "active", roleStatus: "granted", judgment: "ok", detail: "正常", detectedAt: "2025-02-25T08:00:00Z" },
  { memberId: "m3", memberName: "ゴーストユーザー", discordUsername: "ghost_user#0000", planName: "スタンダード会員", billingStatus: "canceled", roleStatus: "granted", judgment: "needs_revoke", detail: "Stripe解約済みだがDiscordロール付与中", detectedAt: "2025-02-25T08:00:00Z" },
  { memberId: "m5", memberName: "リカ", discordUsername: "rika_chan#1111", planName: "プレミアム会員", billingStatus: "past_due", roleStatus: "granted", judgment: "grace_period", detail: "支払い遅延中（猶予期間3日目）", detectedAt: "2025-02-25T08:00:00Z" },
  { memberId: "m6", memberName: "ケンタ", discordUsername: "", planName: "スタンダード会員", billingStatus: "active", roleStatus: "pending", judgment: "needs_relink", detail: "決済完了だがDiscord未連携のためロール未付与", detectedAt: "2025-02-25T08:00:00Z" },
  { memberId: "m8", memberName: "ソウタ", discordUsername: "souta#3333", planName: "プレミアム会員", billingStatus: "unpaid", roleStatus: "error", judgment: "error", detail: "Discord API error: Unknown Role - ロールIDの確認が必要", detectedAt: "2025-02-25T08:00:00Z" },
];

// ── Member Timeline ──
export type TimelineSource = "stripe" | "webhook" | "discord" | "manual" | "system";
export interface TimelineEvent {
  id: string;
  source: TimelineSource;
  event: string;
  detail: string;
  timestamp: string;
}

export const mockTimeline: Record<string, TimelineEvent[]> = {
  m1: [
    { id: "tl1", source: "stripe", event: "checkout.session.completed", detail: "プレミアム会員を購入（¥2,980）", timestamp: "2024-12-01T10:00:00Z" },
    { id: "tl2", source: "discord", event: "role_granted", detail: "ロール「プレミアム」を付与", timestamp: "2024-12-01T10:01:00Z" },
    { id: "tl3", source: "stripe", event: "invoice.paid", detail: "月額決済成功（¥2,980）", timestamp: "2025-01-01T00:05:00Z" },
    { id: "tl4", source: "stripe", event: "invoice.paid", detail: "月額決済成功（¥2,980）", timestamp: "2025-02-01T00:05:00Z" },
  ],
  m3: [
    { id: "tl10", source: "stripe", event: "checkout.session.completed", detail: "スタンダード会員を購入（¥980）", timestamp: "2024-10-01T12:00:00Z" },
    { id: "tl11", source: "discord", event: "role_granted", detail: "ロール「スタンダード」を付与", timestamp: "2024-10-01T12:01:00Z" },
    { id: "tl12", source: "stripe", event: "customer.subscription.deleted", detail: "サブスクリプション解約", timestamp: "2025-01-15T09:00:00Z" },
    { id: "tl13", source: "system", event: "revoke_attempted", detail: "ロール剥奪試行 → 失敗: Bot権限不足", timestamp: "2025-01-15T09:01:00Z" },
    { id: "tl14", source: "system", event: "crosscheck_alert", detail: "番人バッチで不整合検出", timestamp: "2025-02-25T03:00:00Z" },
  ],
  m8: [
    { id: "tl20", source: "stripe", event: "checkout.session.completed", detail: "プレミアム会員を購入（¥2,980）", timestamp: "2024-12-15T15:00:00Z" },
    { id: "tl21", source: "discord", event: "role_grant_failed", detail: "ロール付与失敗: Unknown Role", timestamp: "2024-12-15T15:01:00Z" },
    { id: "tl22", source: "webhook", event: "invoice.payment_failed", detail: "決済失敗", timestamp: "2025-01-15T00:05:00Z" },
  ],
};

export const timelineSourceLabel: Record<TimelineSource, string> = {
  stripe: "Stripe", webhook: "Webhook", discord: "Discord", manual: "手動操作", system: "システム",
};

// ── Seller Discord Settings ──
export const mockSellerDiscord = {
  guildId: "1234567890",
  guildName: "星野ファンクラブ",
  botConnected: true,
  botHasManageRoles: true,
  defaultRoleId: "role_standard",
  defaultRoleName: "スタンダード",
  lastVerifiedAt: "2025-02-24T10:00:00Z",
};

// ── System Announcements for Seller ──
export const mockSellerAnnouncements = [
  { id: "sa1", title: "メンテナンスのお知らせ", body: "2025年3月1日 2:00-4:00 にシステムメンテナンスを実施します。", severity: "warning" as const, startsAt: "2025-02-25", endsAt: "2025-03-02" },
];

// ── Buyer Mock Data ──
export type BuyerBillingStatus = "active" | "grace_period" | "cancel_scheduled" | "payment_failed" | "expired" | "refunded";
export type BuyerDiscordStatus = "linked" | "unlinked" | "failed";
export type BuyerRoleStatus = "granted" | "pending" | "revoked" | "error";

export interface BuyerPlan {
  id: string;
  planName: string;
  sellerName: string;
  planType: PlanType;
  price: number;
  currency: string;
  billingStatus: BuyerBillingStatus;
  discordStatus: BuyerDiscordStatus;
  discordUsername: string;
  roleStatus: BuyerRoleStatus;
  roleName: string;
  guildName: string;
  nextBillingDate: string | null;
  purchasedAt: string;
  expiresAt: string | null;
}

export const mockBuyerPlans: BuyerPlan[] = [
  {
    id: "bp1", planName: "プレミアム会員", sellerName: "星野アイ", planType: "subscription",
    price: 2980, currency: "JPY", billingStatus: "active", discordStatus: "linked",
    discordUsername: "user_taro#1234", roleStatus: "granted", roleName: "プレミアム",
    guildName: "星野ファンクラブ", nextBillingDate: "2025-03-01", purchasedAt: "2024-12-01", expiresAt: null,
  },
  {
    id: "bp2", planName: "スタンダード会員", sellerName: "鈴木花子", planType: "subscription",
    price: 980, currency: "JPY", billingStatus: "cancel_scheduled", discordStatus: "linked",
    discordUsername: "user_taro#1234", roleStatus: "granted", roleName: "スタンダード",
    guildName: "はなちゃんねる", nextBillingDate: "2025-03-15", purchasedAt: "2025-01-15", expiresAt: "2025-03-15",
  },
  {
    id: "bp3", planName: "ワンタイムパス（30日）", sellerName: "佐藤美咲", planType: "one_time",
    price: 500, currency: "JPY", billingStatus: "expired", discordStatus: "linked",
    discordUsername: "user_taro#1234", roleStatus: "revoked", roleName: "お試し",
    guildName: "みさきのお部屋", nextBillingDate: null, purchasedAt: "2025-01-01", expiresAt: "2025-01-31",
  },
  {
    id: "bp4", planName: "VIP会員", sellerName: "伊藤さくら", planType: "subscription",
    price: 9800, currency: "JPY", billingStatus: "payment_failed", discordStatus: "linked",
    discordUsername: "user_taro#1234", roleStatus: "granted", roleName: "VIP",
    guildName: "さくらファンクラブ", nextBillingDate: null, purchasedAt: "2025-02-01", expiresAt: null,
  },
];

export const buyerBillingStatusLabel: Record<BuyerBillingStatus, string> = {
  active: "有効", grace_period: "猶予期間", cancel_scheduled: "解約予定",
  payment_failed: "決済失敗", expired: "期限切れ", refunded: "返金済",
};
export const buyerBillingStatusVariant: Record<BuyerBillingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", grace_period: "secondary", cancel_scheduled: "outline",
  payment_failed: "destructive", expired: "outline", refunded: "secondary",
};
export const buyerDiscordStatusLabel: Record<BuyerDiscordStatus, string> = { linked: "連携済", unlinked: "未連携", failed: "連携失敗" };
export const buyerRoleStatusLabel: Record<BuyerRoleStatus, string> = { granted: "付与済", pending: "保留中", revoked: "剥奪済", error: "エラー" };
export const buyerRoleStatusVariant: Record<BuyerRoleStatus, "default" | "secondary" | "destructive" | "outline"> = {
  granted: "default", pending: "secondary", revoked: "outline", error: "destructive",
};

// Alias for services/mockApi compatibility (uses MembershipStatus from types)
export const mockBuyerMemberships = [
  {
    id: "bp1", planName: "プレミアム会員", sellerName: "星野アイ", planType: "subscription" as const,
    price: 2980, currency: "JPY", status: "active" as const, discordLinkStatus: "linked" as const,
    discordUsername: "user_taro#1234", roleStatus: "granted" as const, roleName: "プレミアム",
    guildName: "星野ファンクラブ", nextBillingDate: "2025-03-01", purchasedAt: "2024-12-01", expiresAt: null,
  },
  {
    id: "bp2", planName: "スタンダード会員", sellerName: "鈴木花子", planType: "subscription" as const,
    price: 980, currency: "JPY", status: "cancel_scheduled" as const, discordLinkStatus: "linked" as const,
    discordUsername: "user_taro#1234", roleStatus: "granted" as const, roleName: "スタンダード",
    guildName: "はなちゃんねる", nextBillingDate: "2025-03-15", purchasedAt: "2025-01-15", expiresAt: "2025-03-15",
  },
  {
    id: "bp3", planName: "ワンタイムパス（30日）", sellerName: "佐藤美咲", planType: "one_time" as const,
    price: 500, currency: "JPY", status: "expired" as const, discordLinkStatus: "linked" as const,
    discordUsername: "user_taro#1234", roleStatus: "revoked" as const, roleName: "お試し",
    guildName: "みさきのお部屋", nextBillingDate: null, purchasedAt: "2025-01-01", expiresAt: "2025-01-31",
  },
  {
    id: "bp4", planName: "VIP会員", sellerName: "伊藤さくら", planType: "subscription" as const,
    price: 9800, currency: "JPY", status: "payment_failed" as const, discordLinkStatus: "linked" as const,
    discordUsername: "user_taro#1234", roleStatus: "granted" as const, roleName: "VIP",
    guildName: "さくらファンクラブ", nextBillingDate: null, purchasedAt: "2025-02-01", expiresAt: null,
  },
  {
    id: "bp5", planName: "初心者パス", sellerName: "渡辺ゆう", planType: "subscription" as const,
    price: 500, currency: "JPY", status: "pending_discord" as const, discordLinkStatus: "not_linked" as const,
    discordUsername: "", roleStatus: "pending" as const, roleName: "初心者",
    guildName: "ゆうちゃんサロン", nextBillingDate: "2025-03-25", purchasedAt: "2025-02-25", expiresAt: null,
  },
];

// ── Computed Stats ──
export const mockPlatformStats = {
  activeTenants: mockTenants.filter((t) => t.status === "active").length,
  trialTenants: mockTenants.filter((t) => t.status === "trial").length,
  suspendedTenants: mockTenants.filter((t) => t.status === "suspended").length,
  canceledTenants: mockTenants.filter((t) => t.status === "canceled").length,
  totalMembers: mockTenants.reduce((s, t) => s + t.memberCount, 0),
  totalMRR: mockTenants.reduce((s, t) => s + t.mrr, 0),
  webhookFailures: mockWebhooks.filter((w) => w.processStatus === "failed").length,
  retryPending: mockRetryQueue.filter((r) => r.status === "pending").length,
  discordApiFailures: mockAlerts.filter((a) => a.source === "discord_monitor" && !a.resolved).length + mockRetryQueue.filter((r) => r.jobType === "discord" && r.status !== "exhausted").length,
  unresolvedAlerts: mockAlerts.filter((a) => !a.resolved).length,
};

export const mockSellerStats = {
  totalMembers: 342, activePlans: 3, mrr: 512800, churnRate: 2.1, newMembersThisMonth: 28, webhooksToday: 12,
};

// ── Helpers ──
export const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

export const tenantStatusLabel: Record<TenantStatus, string> = {
  trial: "試用中", active: "契約中", suspended: "停止中", canceled: "解約済",
};
export const tenantStatusVariant: Record<TenantStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", trial: "secondary", suspended: "destructive", canceled: "outline",
};

export const stripeStatusLabel: Record<StripeConnectStatus, string> = {
  not_started: "未開始", pending: "審査中", verified: "認証済", restricted: "制限中",
};

export const retryJobTypeLabel: Record<RetryJobType, string> = {
  webhook: "Webhook", discord: "Discord", sync: "同期",
};
export const retryStatusLabel: Record<RetryStatus, string> = {
  pending: "待機中", paused: "保留", exhausted: "上限到達",
};

export const announcementStatusLabel: Record<AnnouncementStatus, string> = {
  draft: "下書き", published: "公開中", ended: "終了",
};
export const announcementSeverityLabel: Record<AnnouncementSeverity, string> = {
  info: "情報", warning: "注意", critical: "重大",
};

export const formatDateTimeJP = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};
export const formatDateJP = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP");
};
