/**
 * Mock API Implementation
 * 
 * Implements IPlatformApi, ISellerApi, IBuyerApi interfaces.
 * Replace with real implementation when backend is ready.
 */

import type {
  PaginatedResponse, PlatformTenant, PlatformWebhookEvent, RetryQueueJob,
  SystemAnnouncement, KillSwitchState, PlatformAlert, SellerPlan, SellerMember,
  CrosscheckRow, TimelineEvent, BuyerMembership, DiscordValidationResult,
} from "@/types";
import type {
  IPlatformApi, ISellerApi, IBuyerApi, PlatformStats, SellerStats,
  SellerDiscordSettings, DiscordVerificationEntry,
} from "./api.types";
import {
  mockTenants, mockWebhooks, mockRetryQueue, mockAnnouncements, mockKillSwitches,
  mockAlerts, mockPlans, mockMembers, mockCrosscheck, mockTimeline,
  mockBuyerMemberships, mockSellerStats, mockPlatformStats, mockSellerAnnouncements,
  mockSellerDiscord, mockDiscordVerificationHistory,
} from "@/lib/mockData";

// ===== Config =====

let mockDelay = 400;
let mockErrorRate = 0;

export const setMockDelay = (ms: number) => { mockDelay = ms; };
export const setMockErrorRate = (rate: number) => { mockErrorRate = rate; };

async function simulateRequest<T>(data: T): Promise<T> {
  await new Promise(r => setTimeout(r, mockDelay));
  if (Math.random() < mockErrorRate) {
    throw new Error("モックエラー: サーバーとの通信に失敗しました");
  }
  return data;
}

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    page_size: pageSize,
    total_count: items.length,
  };
}

// ===== Platform Admin API (Mock) =====

export const platformApi: IPlatformApi = {
  getStats: () => simulateRequest(mockPlatformStats as PlatformStats),

  getAlerts: (params?) => {
    let items = [...mockAlerts] as PlatformAlert[];
    if (params?.resolved !== undefined) items = items.filter(a => a.resolved === params.resolved);
    return simulateRequest(items);
  },

  getKillSwitches: () => simulateRequest([...mockKillSwitches] as KillSwitchState[]),

  toggleKillSwitch: (id, enabled) =>
    simulateRequest({ id, enabled, lastChangedAt: new Date().toISOString(), lastChangedBy: "admin@platform.com" }),

  getTenants: (params) => {
    let items = [...mockTenants] as PlatformTenant[];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(t => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q));
    }
    if (params.status && params.status !== "all") items = items.filter(t => t.status === params.status);
    const sk = (params.sortKey || "lastActiveAt") as keyof PlatformTenant;
    items.sort((a, b) => {
      const av = a[sk], bv = b[sk];
      if (typeof av === "number" && typeof bv === "number") return params.sortAsc ? av - bv : bv - av;
      return params.sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return simulateRequest(paginate(items, params.page || 1, params.pageSize || 5));
  },

  getTenantById: (id) => {
    const tenant = mockTenants.find(t => t.id === id);
    return simulateRequest(tenant as PlatformTenant | null || null);
  },

  suspendTenant: (id) => simulateRequest({ id, status: "suspended" }),
  resumeTenant: (id) => simulateRequest({ id, status: "active" }),

  getWebhooks: (params) => {
    let items = [...mockWebhooks] as PlatformWebhookEvent[];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(w => w.eventType.includes(q) || w.tenantName.toLowerCase().includes(q));
    }
    if (params.status && params.status !== "all") items = items.filter(w => w.processStatus === params.status);
    items.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return simulateRequest(paginate(items, params.page || 1, params.pageSize || 5));
  },

  reprocessWebhook: (id) => simulateRequest({ id, status: "pending" }),

  getRetryQueue: (params) => {
    let items = [...mockRetryQueue] as RetryQueueJob[];
    if (params.jobType && params.jobType !== "all") items = items.filter(r => r.jobType === params.jobType);
    if (params.status && params.status !== "all") items = items.filter(r => r.status === params.status);
    return simulateRequest(paginate(items, params.page || 1, params.pageSize || 5));
  },

  retryJob: (id) => simulateRequest({ id, action: "retry" }),
  pauseJob: (id) => simulateRequest({ id, action: "pause" }),
  terminateJob: (id) => simulateRequest({ id, action: "terminate" }),

  getAnnouncements: (params?) => {
    let items = [...mockAnnouncements] as SystemAnnouncement[];
    if (params?.status && params.status !== "all") items = items.filter(a => a.status === params.status);
    return simulateRequest(items);
  },

  saveAnnouncement: (data) => simulateRequest({ ...data, id: data.id || `a${Date.now()}` } as Partial<SystemAnnouncement> & { id: string }),
};

// ===== Seller API (Mock) =====

export const sellerApi: ISellerApi = {
  getStats: () => simulateRequest(mockSellerStats as SellerStats),
  getAnnouncements: () => simulateRequest(mockSellerAnnouncements),
  getDiscordSettings: () => simulateRequest({
    ...mockSellerDiscord,
    verificationHistory: mockDiscordVerificationHistory,
  } as SellerDiscordSettings),

  getPlans: (params?) => {
    let items = [...mockPlans] as SellerPlan[];
    if (params?.status && params.status !== "all") items = items.filter(p => p.status === params.status);
    return simulateRequest(items);
  },

  getPlanById: (id) => {
    const plan = mockPlans.find(p => p.id === id);
    return simulateRequest(plan as SellerPlan | null || null);
  },

  savePlan: (data) => simulateRequest({ ...data, id: data.id || `p${Date.now()}` } as Partial<SellerPlan> & { id: string }),

  getMembers: (params) => {
    let items = [...mockMembers] as SellerMember[];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.discordUsername.toLowerCase().includes(q));
    }
    if (params.billingStatus && params.billingStatus !== "all") items = items.filter(m => m.billingStatus === params.billingStatus);
    const sk = (params.sortKey || "joinedAt") as keyof SellerMember;
    items.sort((a, b) => {
      const av = String(a[sk]), bv = String(b[sk]);
      return params.sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return simulateRequest(paginate(items, params.page || 1, params.pageSize || 5));
  },

  getMemberById: (id) => {
    const member = mockMembers.find(m => m.id === id);
    return simulateRequest(member as SellerMember | null || null);
  },

  getMemberTimeline: (memberId) => {
    const events = (mockTimeline[memberId] || []) as TimelineEvent[];
    return simulateRequest(events);
  },

  getCrosscheck: (params?) => {
    let items = [...mockCrosscheck] as CrosscheckRow[];
    if (params?.judgment && params.judgment !== "all") {
      if (params.judgment === "issues") {
        items = items.filter(c => c.judgment !== "ok");
      } else {
        items = items.filter(c => c.judgment === params.judgment);
      }
    }
    return simulateRequest(items);
  },

  runCrosscheck: () => simulateRequest({ jobId: `cc_${Date.now()}` }),

  getWebhooks: (params) => {
    let items = mockWebhooks.filter(w => w.tenantId === "t1") as PlatformWebhookEvent[];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(w => w.eventType.includes(q));
    }
    if (params.status && params.status !== "all") items = items.filter(w => w.processStatus === params.status);
    items.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return simulateRequest(paginate(items, params.page || 1, params.pageSize || 5));
  },

  validateDiscord: (guildId, roleId?) =>
    simulateRequest({
      botInstalled: true,
      manageRolesPermission: true,
      roleExists: !!roleId,
      botRoleHierarchy: !!roleId,
      errorCode: null,
      errorMessage: null,
    } as DiscordValidationResult),
};

// ===== Buyer API (Mock) =====

export const buyerApi: IBuyerApi = {
  getMemberships: () => simulateRequest(mockBuyerMemberships as BuyerMembership[]),
  requestRoleGrant: (membershipId) => simulateRequest({ membershipId, action: "role_grant_requested" }),
  relinkDiscord: (membershipId) => simulateRequest({ membershipId, action: "discord_relink_initiated" }),
};
