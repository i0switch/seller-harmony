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

async function request<T>(url: string, options: RequestInit): Promise<T> {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
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
