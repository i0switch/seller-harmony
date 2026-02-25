import type { IPlatformApi, PlatformStats } from "@/services/api.types";
import type { PaginatedResponse, PlatformTenant, PlatformWebhookEvent, RetryQueueJob, SystemAnnouncement, KillSwitchState, PlatformAlert } from "@/types";
import { httpClient } from "./client";

export const platformApi: IPlatformApi = {
    getStats: () => httpClient.get<PlatformStats>("/api/platform/stats"),
    getAlerts: (params?) => httpClient.get<PlatformAlert[]>("/api/platform/alerts", params as Record<string, string | number | boolean>),
    getKillSwitches: () => httpClient.get<KillSwitchState[]>("/api/platform/kill-switches"),
    toggleKillSwitch: (id, enabled) => httpClient.post<{ id: string, enabled: boolean }>(`/api/platform/kill-switches/${id}/toggle`, { enabled }),
    getTenants: (params) => httpClient.get<PaginatedResponse<PlatformTenant>>("/api/platform/tenants", params as Record<string, string | number | boolean>),
    getTenantById: (id) => httpClient.get<PlatformTenant | null>(`/api/platform/tenants/${id}`),
    suspendTenant: (id) => httpClient.post<{ id: string, status: string }>(`/api/platform/tenants/${id}/suspend`),
    resumeTenant: (id) => httpClient.post<{ id: string, status: string }>(`/api/platform/tenants/${id}/resume`),
    getWebhooks: (params) => httpClient.get<PaginatedResponse<PlatformWebhookEvent>>("/api/platform/webhooks", params as Record<string, string | number | boolean>),
    reprocessWebhook: (id) => httpClient.post<{ id: string, status: string }>(`/api/platform/webhooks/${id}/reprocess`),
    getRetryQueue: (params) => httpClient.get<PaginatedResponse<RetryQueueJob>>("/api/platform/retry-queue", params as Record<string, string | number | boolean>),
    retryJob: (id) => httpClient.post<{ id: string, action: string }>(`/api/platform/retry-queue/${id}/retry`),
    pauseJob: (id) => httpClient.post<{ id: string, action: string }>(`/api/platform/retry-queue/${id}/pause`),
    terminateJob: (id) => { throw new Error("Not Implemented") },
    getAnnouncements: (params?) => httpClient.get<SystemAnnouncement[]>("/api/platform/announcements", params as Record<string, string | number | boolean>),
    saveAnnouncement: (data) => { throw new Error("Not Implemented") },
};
