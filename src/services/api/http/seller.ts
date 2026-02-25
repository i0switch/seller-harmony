import type { ISellerApi, SellerStats, SellerDiscordSettings } from "@/services/api.types";
import type { PaginatedResponse, SellerPlan, SellerMember, CrosscheckRow, TimelineEvent, PlatformWebhookEvent, DiscordValidationResult, SystemAnnouncement } from "@/types";
import { httpClient } from "./client";

export const sellerApi: ISellerApi = {
    getStats: () => httpClient.get<SellerStats>("/api/seller/stats"),
    getAnnouncements: () => httpClient.get<SystemAnnouncement[]>("/api/seller/announcements"),
    getDiscordSettings: () => httpClient.get<SellerDiscordSettings>("/api/seller/discord/settings"),
    getPlans: (params?) => httpClient.get<SellerPlan[]>("/api/seller/plans", params as Record<string, string | number | boolean>),
    getPlanById: (id) => httpClient.get<SellerPlan | null>(`/api/seller/plans/${id}`),
    savePlan: (data) => httpClient.post<SellerPlan>("/api/seller/plans", data),
    getMembers: (params) => httpClient.get<PaginatedResponse<SellerMember>>("/api/seller/members", params as Record<string, string | number | boolean>),
    getMemberById: (id) => httpClient.get<SellerMember | null>(`/api/seller/members/${id}`),
    getMemberTimeline: (id) => httpClient.get<TimelineEvent[]>(`/api/seller/members/${id}/timeline`),
    getCrosscheck: (params?) => httpClient.get<CrosscheckRow[]>("/api/seller/crosscheck", params as Record<string, string | number | boolean>),
    runCrosscheck: () => httpClient.post<{ jobId: string }>("/api/seller/crosscheck/run"),
    getWebhooks: (params) => httpClient.get<PaginatedResponse<PlatformWebhookEvent>>("/api/seller/webhooks", params as Record<string, string | number | boolean>),
    validateDiscord: (guildId, roleId) => httpClient.post<DiscordValidationResult>("/api/seller/discord/validate", { guildId, roleId }),
};
