// ===== Shared Status Enums =====

// Membership (Buyer perspective)
export type MembershipStatus =
  | "pending_discord"
  | "active"
  | "grace_period"
  | "cancel_scheduled"
  | "payment_failed"
  | "canceled"
  | "expired"
  | "refunded";

export const membershipStatusLabel: Record<MembershipStatus, string> = {
  pending_discord: "Discord連携待ち",
  active: "有効",
  grace_period: "猶予期間",
  cancel_scheduled: "解約予定",
  payment_failed: "決済失敗",
  canceled: "解約済",
  expired: "期限切れ",
  refunded: "返金済",
};
export const membershipStatusVariant: Record<MembershipStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending_discord: "secondary",
  active: "default",
  grace_period: "secondary",
  cancel_scheduled: "outline",
  payment_failed: "destructive",
  canceled: "outline",
  expired: "outline",
  refunded: "secondary",
};

// Discord Link
export type DiscordLinkStatus = "not_linked" | "linked" | "token_expired" | "relink_required";
export const discordLinkStatusLabel: Record<DiscordLinkStatus, string> = {
  not_linked: "未連携",
  linked: "連携済",
  token_expired: "トークン期限切れ",
  relink_required: "再連携が必要",
};
export const discordLinkStatusVariant: Record<DiscordLinkStatus, "default" | "secondary" | "destructive" | "outline"> = {
  not_linked: "outline",
  linked: "default",
  token_expired: "destructive",
  relink_required: "secondary",
};

// Role
export type RoleStatus = "granted" | "pending" | "revoked" | "failed";
export const roleStatusLabel: Record<RoleStatus, string> = {
  granted: "付与済",
  pending: "保留中",
  revoked: "剥奪済",
  failed: "失敗",
};
export const roleStatusVariant: Record<RoleStatus, "default" | "secondary" | "destructive" | "outline"> = {
  granted: "default",
  pending: "secondary",
  revoked: "outline",
  failed: "destructive",
};

// ===== Platform Types =====

export type TenantStatus = "trial" | "active" | "suspended" | "canceled";
export type StripeConnectStatus = "not_started" | "pending" | "verified" | "restricted";
export type WebhookProcessStatus = "success" | "failed" | "pending";
export type RetryJobType = "webhook" | "discord" | "sync";
export type RetryJobStatus = "pending" | "paused" | "exhausted";
export type AnnouncementStatus = "draft" | "published" | "ended";
export type AnnouncementSeverity = "info" | "warning" | "critical";
export type AnnouncementTarget = "all" | "active" | "trial" | "specific";
export type AlertLevel = "error" | "warning" | "info";

export interface PlatformTenant {
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

export interface PlatformWebhookEvent {
  id: string;
  eventType: string;
  processStatus: WebhookProcessStatus;
  signatureVerified: boolean;
  receivedAt: string;
  tenantId: string;
  tenantName: string;
  error: string | null;
  payload: string;
  stripeEventId: string;
}

export interface RetryQueueJob {
  id: string;
  jobType: RetryJobType;
  tenantId: string;
  tenantName: string;
  nextRetryAt: string;
  retryCount: number;
  maxRetries: number;
  lastError: string;
  status: RetryJobStatus;
  createdAt: string;
}

export interface SystemAnnouncement {
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

export interface KillSwitchState {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  lastChangedAt: string;
  lastChangedBy: string;
}

export interface PlatformAlert {
  id: string;
  level: AlertLevel;
  message: string;
  source: string;
  tenantName: string | null;
  timestamp: string;
  resolved: boolean;
}

// ===== Seller Types =====

export type PlanStatus = "published" | "stopped" | "draft";
export type PlanType = "subscription" | "one_time";
export type GrantPolicy = "unlimited" | "limited";
export type SellerMemberBillingStatus = "active" | "past_due" | "canceled" | "unpaid";

export interface SellerProfile {
  id: string;
  displayName: string;
  serviceName: string;
  email: string;
  supportEmail: string;
  stripeStatus: StripeConnectStatus;
  discordGuildId: string;
  discordGuildName: string;
  discordConnected: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
}

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

export interface SellerMember {
  id: string;
  name: string;
  email: string;
  planId: string;
  planName: string;
  billingStatus: SellerMemberBillingStatus;
  discordUsername: string;
  discordId: string;
  discordLinkStatus: DiscordLinkStatus;
  roleStatus: RoleStatus;
  lastError: string | null;
  joinedAt: string;
  lastPayment: string;
}

export interface DiscordValidationResult {
  botInstalled: boolean;
  manageRolesPermission: boolean;
  roleExists: boolean;
  botRoleHierarchy: boolean;
  errorCode: string | null;
  errorMessage: string | null;
}

export type CrosscheckJudgment = "ok" | "needs_relink" | "needs_grant" | "needs_revoke" | "error" | "grace_period";

export interface CrosscheckRow {
  memberId: string;
  memberName: string;
  discordUsername: string;
  planName: string;
  billingStatus: SellerMemberBillingStatus;
  roleStatus: RoleStatus;
  judgment: CrosscheckJudgment;
  detail: string;
  detectedAt: string;
}

export type TimelineSource = "stripe" | "webhook" | "discord" | "manual" | "system";

export interface TimelineEvent {
  id: string;
  source: TimelineSource;
  event: string;
  detail: string;
  timestamp: string;
}

// ===== Buyer Types =====

export interface BuyerMembership {
  id: string;
  planName: string;
  sellerName: string;
  planType: PlanType;
  price: number;
  currency: string;
  status: MembershipStatus;
  discordLinkStatus: DiscordLinkStatus;
  discordUsername: string;
  roleStatus: RoleStatus;
  roleName: string;
  guildName: string;
  nextBillingDate: string | null;
  purchasedAt: string;
  expiresAt: string | null;
}

// ===== API Response =====

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total_count: number;
}

// ===== Label Maps =====

export const tenantStatusLabel: Record<TenantStatus, string> = {
  trial: "試用中", active: "契約中", suspended: "停止中", canceled: "解約済",
};
export const tenantStatusVariant: Record<TenantStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", trial: "secondary", suspended: "destructive", canceled: "outline",
};

export const stripeStatusLabel: Record<StripeConnectStatus, string> = {
  not_started: "未開始", pending: "審査中", verified: "認証済", restricted: "制限中",
};

export const webhookStatusLabel: Record<WebhookProcessStatus, string> = {
  success: "成功", failed: "失敗", pending: "処理中",
};
export const webhookStatusVariant: Record<WebhookProcessStatus, "default" | "destructive" | "secondary"> = {
  success: "default", failed: "destructive", pending: "secondary",
};

export const retryJobTypeLabel: Record<RetryJobType, string> = {
  webhook: "Webhook", discord: "Discord", sync: "同期",
};
export const retryStatusLabel: Record<RetryJobStatus, string> = {
  pending: "待機中", paused: "保留", exhausted: "上限到達",
};
export const retryStatusVariant: Record<RetryJobStatus, "default" | "secondary" | "destructive"> = {
  pending: "default", paused: "secondary", exhausted: "destructive",
};

export const announcementStatusLabel: Record<AnnouncementStatus, string> = {
  draft: "下書き", published: "公開中", ended: "終了",
};
export const announcementSeverityLabel: Record<AnnouncementSeverity, string> = {
  info: "情報", warning: "注意", critical: "重大",
};

export const planStatusLabel: Record<PlanStatus, string> = {
  published: "公開中", stopped: "停止", draft: "下書き",
};
export const planStatusVariant: Record<PlanStatus, "default" | "secondary" | "outline"> = {
  published: "default", stopped: "secondary", draft: "outline",
};
export const planTypeLabel: Record<PlanType, string> = {
  subscription: "月額", one_time: "単発",
};

export const sellerBillingStatusLabel: Record<SellerMemberBillingStatus, string> = {
  active: "有効", past_due: "支払い遅延", canceled: "解約済", unpaid: "未払い",
};
export const sellerBillingStatusVariant: Record<SellerMemberBillingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", past_due: "secondary", canceled: "destructive", unpaid: "destructive",
};

export const crosscheckJudgmentLabel: Record<CrosscheckJudgment, string> = {
  ok: "正常", needs_relink: "要再連携", needs_grant: "要付与", needs_revoke: "要剥奪", error: "エラー", grace_period: "猶予期間",
};
export const crosscheckJudgmentVariant: Record<CrosscheckJudgment, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default", needs_relink: "secondary", needs_grant: "outline", needs_revoke: "destructive", error: "destructive", grace_period: "secondary",
};

export const timelineSourceLabel: Record<TimelineSource, string> = {
  stripe: "Stripe", webhook: "Webhook", discord: "Discord", manual: "手動操作", system: "システム",
};

// ===== Helpers =====

export const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

export const formatDateTimeJP = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export const formatDateJP = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP");
};
