import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

export class DiscordOAuthError extends Error {
  code: string;

  constructor(message: string, code = "OAUTH_FAILED") {
    super(message);
    this.code = code;
  }
}

export async function callDiscordOAuth(payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new DiscordOAuthError(
      "購入したアカウントでログインした状態で、もう一度Discord連携をやり直してください。",
      "BUYER_LOGIN_REQUIRED",
    );
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/discord-oauth`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new DiscordOAuthError(
      (data as { error?: string }).error || "Discord連携に失敗しました。",
      (data as { code?: string }).code || "OAUTH_FAILED",
    );
  }

  return data;
}
