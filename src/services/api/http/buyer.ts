import type { IBuyerApi } from "@/services/api.types";
import type { BuyerMembership } from "@/types";
import { httpClient } from "./client";

export const buyerApi: IBuyerApi = {
    getMemberships: () => httpClient.get<BuyerMembership[]>("/api/buyer/memberships"),
    requestRoleGrant: (id) => httpClient.post<{ membershipId: string, action: string }>(`/api/buyer/memberships/${id}/grant`),
    relinkDiscord: (id) => httpClient.post<{ membershipId: string, action: string }>(`/api/buyer/memberships/${id}/relink`),
};
