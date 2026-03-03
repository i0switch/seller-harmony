import { supabase } from "@/integrations/supabase/client";

export class ApiError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string,
        public hint?: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Get current Supabase auth token for API requests.
 * Returns Authorization header value or null.
 */
async function getAuthToken(): Promise<string | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ? `Bearer ${session.access_token}` : null;
    } catch {
        return null;
    }
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
    try {
        // Inject auth token
        const token = await getAuthToken();
        const headers = new Headers(options.headers);
        if (token && !headers.has('Authorization')) {
            headers.set('Authorization', token);
        }
        headers.set('X-Requested-With', 'XMLHttpRequest');

        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            let errorData;
            try {
                const contentType = response.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    errorData = await response.json();
                } else {
                    errorData = { detail: response.statusText };
                }
            } catch {
                errorData = { detail: response.statusText };
            }

            const message = errorData.detail || errorData.message || "An error occurred";
            const code = errorData.code || `HTTP_${response.status}`;
            throw new ApiError(response.status, code, message);
        }
        return response.json() as Promise<T>;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(0, "NETWORK_ERROR", "ネットワークエラーが発生しました。サーバーが起動していない可能性があります。");
    }
}

export const httpClient = {
    async get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
        const url = new URL(path, BASE_URL);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }
        return request<T>(url.toString(), { method: "GET" });
    },

    async post<T>(path: string, body?: unknown): Promise<T> {
        const url = new URL(path, BASE_URL);
        return request<T>(url.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
        });
    },

    request
};
