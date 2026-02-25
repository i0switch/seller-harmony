/**
 * Mock API Service Layer
 * 
 * Simulates API calls with configurable delay and error simulation.
 * All list endpoints return PaginatedResponse<T>.
 * Replace with real API calls (Supabase / FastAPI) when ready.
 */

import type {
  PaginatedResponse, PlatformTenant, PlatformWebhookEvent, RetryQueueJob,
  SystemAnnouncement, KillSwitchState, PlatformAlert, SellerPlan, SellerMember,
  CrosscheckRow, TimelineEvent, BuyerMembership,
} from "@/types";
import {
  mockTenants, mockWebhooks, mockRetryQueue, mockAnnouncements, mockKillSwitches,
  mockAlerts, mockPlans, mockMembers, mockCrosscheck, mockTimeline,
  mockBuyerMemberships, mockSellerStats, mockPlatformStats, mockSellerAnnouncements,
  mockSellerDiscord,
} from "@/lib/mockData";

// ===== Config =====

let mockDelay = 400; // ms
let mockErrorRate = 0; // 0-1, 0 = no errors

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

// ===== Platform Admin API =====

export const platformApi = {
  getStats: () => simulateRequest(mockPlatformStats),

  getAlerts: (params?: { resolved?: boolean }) => {
    let items = [...mockAlerts] as PlatformAlert[];
    if (params?.resolved !== undefined) items = items.filter(a => a.resolved === params.resolved);
    return simulateRequest(items);
  },

  getKillSwitches: () => simulateRequest([...mockKillSwitches] as KillSwitchState[]),

  toggleKillSwitch: (id: string, enabled: boolean) =>
    simulateRequest({ id, enabled, lastChangedAt: new Date().toISOString(), lastChangedBy: "admin@platform.com" }),

  getTenants: (params: { search?: string; status?: string; sortKey?: string; sortAsc?: boolean; page?: number; pageSize?: number }) => {
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

  getTenantById: (id: string) => {
    const tenant = mockTenants.find(t => t.id === id);
    return simulateRequest(tenant || null);
  },

  suspendTenant: (id: string) => simulateRequest({ id, status: "suspended" as const }),
  resumeTenant: (id: string) => simulateRequest({ id, status: "active" as const }),

  getWebhooks: (params: { search?: string; status?: string; page?: number; pageSize?: number }) => {
    let items = [...mockWebhooks] as PlatformWebhookEvent[];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(w => w.eventType.includes(q) || w.tenantName.toLowerCase().includes(q));
    }
    if (params.status && params.status !== "all") items = items.filter(w => w.processStatus === params.status);
    items.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return simulateRequest(paginate(items, params.page || 1, params.pageSize || 5));
  },

  reprocessWebhook: (id: string) => simulateRequest({ id, status: "pending" as const }),

  getRetryQueue: (params: { jobType?: string; status?: string; page?: number; pageSize?: number }) => {
    let items = [...mockRetryQueue] as RetryQueueJob[];
    if (params.jobType && params.jobType !== "all") items = items.filter(r => r.jobType === params.jobType);
    if (params.status && params.status !== "all") items = items.filter(r => r.status === params.status);
    return simulateRequest(paginate(items, params.page || 1, params.pageSize || 5));
  },

  retryJob: (id: string) => simulateRequest({ id, action: "retry" }),
  pauseJob: (id: string) => simulateRequest({ id, action: "pause" }),
  terminateJob: (id: string) => simulateRequest({ id, action: "terminate" }),

  getAnnouncements: (params?: { status?: string }) => {
    let items = [...mockAnnouncements] as SystemAnnouncement[];
    if (params?.status && params.status !== "all") items = items.filter(a => a.status === params.status);
    return simulateRequest(items);
  },

  saveAnnouncement: (data: Partial<SystemAnnouncement>) => simulateRequest({ ...data, id: data.id || `a${Date.now()}` }),
};

// ===== Seller API =====

export const sellerApi = {
  getStats: () => simulateRequest(mockSellerStats),
  getAnnouncements: () => simulateRequest(mockSellerAnnouncements),
  getDiscordSettings: () => simulateRequest(mockSellerDiscord),

  getPlans: (params?: { status?: string }) => {
    let items = [...mockPlans] as SellerPlan[];
    if (params?.status && params.status !== "all") items = items.filter(p => p.status === params.status);
    return simulateRequest(items);
  },

  getPlanById: (id: string) => {
    const plan = mockPlans.find(p => p.id === id);
    return simulateRequest(plan || null);
  },

  savePlan: (data: Partial<SellerPlan>) => simulateRequest({ ...data, id: data.id || `p${Date.now()}` }),

  getMembers: (params: { search?: string; billingStatus?: string; sortKey?: string; sortAsc?: boolean; page?: number; pageSize?: number }) => {
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

  getMemberById: (id: string) => {
    const member = mockMembers.find(m => m.id === id);
    return simulateRequest(member || null);
  },

  getMemberTimeline: (memberId: string) => {
    const events = (mockTimeline[memberId] || []) as TimelineEvent[];
    return simulateRequest(events);
  },

  getCrosscheck: (params?: { judgment?: string }) => {
    let items = [...mockCrosscheck] as CrosscheckRow[];
    if (params?.judgment && params.judgment !== "all") items = items.filter(c => c.judgment === params.judgment);
    return simulateRequest(items);
  },

  getWebhooks: (params: { search?: string; status?: string; page?: number; pageSize?: number }) => {
    let items = mockWebhooks.filter(w => w.tenantId === "t1") as PlatformWebhookEvent[];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(w => w.eventType.includes(q));
    }
    if (params.status && params.status !== "all") items = items.filter(w => w.processStatus === params.status);
    items.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return simulateRequest(paginate(items, params.page || 1, params.pageSize || 5));
  },

  validateDiscord: (guildId: string, roleId?: string) =>
    simulateRequest({
      botInstalled: true,
      manageRolesPermission: true,
      roleExists: !!roleId,
      botRoleHierarchy: !!roleId,
      errorCode: null,
      errorMessage: null,
    }),
};

// ===== Buyer API =====

export const buyerApi = {
  getMemberships: () => simulateRequest(mockBuyerMemberships as BuyerMembership[]),
  requestRoleGrant: (membershipId: string) => simulateRequest({ membershipId, action: "role_grant_requested" }),
};
