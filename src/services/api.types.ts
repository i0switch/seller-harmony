/**
 * API Interface Definitions
 * 
 * All API clients implement these interfaces.
 * Swap mock implementation for real one (Supabase / FastAPI) by changing the import.
 */

import type {
  PaginatedResponse, PlatformTenant, PlatformWebhookEvent, RetryQueueJob,
  SystemAnnouncement, KillSwitchState, PlatformAlert, SellerPlan, SellerMember,
  CrosscheckRow, TimelineEvent, BuyerMembership, DiscordValidationResult,
} from "@/types";

// ===== Shared Params =====

export interface ListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortKey?: string;
  sortAsc?: boolean;
}

// ===== Platform Admin API =====

export interface IPlatformApi {
  getStats(): Promise<PlatformStats>;
  getAlerts(params?: { resolved?: boolean }): Promise<PlatformAlert[]>;
  getKillSwitches(): Promise<KillSwitchState[]>;
  toggleKillSwitch(id: string, enabled: boolean): Promise<{ id: string; enabled: boolean }>;

  getTenants(params: ListParams & SortParams & { status?: string }): Promise<PaginatedResponse<PlatformTenant>>;
  getTenantById(id: string): Promise<PlatformTenant | null>;
  suspendTenant(id: string): Promise<{ id: string; status: string }>;
  resumeTenant(id: string): Promise<{ id: string; status: string }>;

  getWebhooks(params: ListParams & { status?: string }): Promise<PaginatedResponse<PlatformWebhookEvent>>;
  reprocessWebhook(id: string): Promise<{ id: string; status: string }>;

  getRetryQueue(params: { jobType?: string; status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<RetryQueueJob>>;
  retryJob(id: string): Promise<{ id: string; action: string }>;
  pauseJob(id: string): Promise<{ id: string; action: string }>;
  terminateJob(id: string): Promise<{ id: string; action: string }>;

  getAnnouncements(params?: { status?: string }): Promise<SystemAnnouncement[]>;
  saveAnnouncement(data: Partial<SystemAnnouncement>): Promise<Partial<SystemAnnouncement> & { id: string }>;
}

export interface PlatformStats {
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  canceledTenants: number;
  totalMembers: number;
  totalMRR: number;
  webhookFailures: number;
  retryPending: number;
  discordApiFailures: number;
  unresolvedAlerts: number;
}

// ===== Seller API =====

export interface SellerStats {
  totalMembers: number;
  activePlans: number;
  mrr: number;
  churnRate: number;
  newMembersThisMonth: number;
  webhooksToday: number;
}

export interface SellerDiscordSettings {
  guildId: string;
  guildName: string;
  botConnected: boolean;
  botHasManageRoles: boolean;
  defaultRoleId: string;
  defaultRoleName: string;
  lastVerifiedAt: string;
  verificationHistory: DiscordVerificationEntry[];
}

export interface DiscordVerificationEntry {
  id: string;
  timestamp: string;
  success: boolean;
  checks: {
    botInstalled: boolean;
    manageRolesPermission: boolean;
    roleExists: boolean;
    botRoleHierarchy: boolean;
  };
  errorCode: string | null;
  errorMessage: string | null;
}

export interface ISellerApi {
  getStats(): Promise<SellerStats>;
  getAnnouncements(): Promise<Array<{ id: string; title: string; body: string; severity: string; startsAt: string; endsAt: string }>>;
  getDiscordSettings(): Promise<SellerDiscordSettings>;

  getPlans(params?: { status?: string }): Promise<SellerPlan[]>;
  getPlanById(id: string): Promise<SellerPlan | null>;
  savePlan(data: Partial<SellerPlan>): Promise<Partial<SellerPlan> & { id: string }>;

  getMembers(params: ListParams & SortParams & { billingStatus?: string }): Promise<PaginatedResponse<SellerMember>>;
  getMemberById(id: string): Promise<SellerMember | null>;
  getMemberTimeline(memberId: string): Promise<TimelineEvent[]>;

  getCrosscheck(params?: { judgment?: string }): Promise<CrosscheckRow[]>;
  runCrosscheck(): Promise<{ jobId: string }>;

  getWebhooks(params: ListParams & { status?: string }): Promise<PaginatedResponse<PlatformWebhookEvent>>;

  validateDiscord(guildId: string, roleId?: string): Promise<DiscordValidationResult>;
}

// ===== Buyer API =====

export interface IBuyerApi {
  getMemberships(): Promise<BuyerMembership[]>;
  requestRoleGrant(membershipId: string): Promise<{ membershipId: string; action: string }>;
  relinkDiscord(membershipId: string): Promise<{ membershipId: string; action: string }>;
}
