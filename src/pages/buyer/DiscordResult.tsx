import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, AlertTriangle, MessageCircle, RotateCcw, Mail, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { callDiscordOAuth, DiscordOAuthError } from "@/lib/discordOAuth";

interface DiscordAuthResult {
  discordUsername: string;
  guildName: string;
  roleName: string;
  planName: string;
}

export default function DiscordResult() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [authResult, setAuthResult] = useState<DiscordAuthResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [errorCode, setErrorCode] = useState("OAUTH_FAILED");

  useEffect(() => {
    if (errorParam) {
      setErrorMessage("Discord認証がキャンセルされたか、エラーが発生しました。");
      setStatus("error");
      return;
    }

    if (!code) {
      setErrorMessage("無効なリクエストです。認証コードが見つかりません。");
      setStatus("error");
      return;
    }

    const savedState = sessionStorage.getItem("discord_oauth_state");
    if (!state || state !== savedState) {
      setErrorMessage("セキュリティ検証に失敗しました。もう一度連携をやり直してください。");
      setStatus("error");
      return;
    }

    const fetchUserInfo = async () => {
      try {
        // Step 1: Fetch user info without saving (save: false)
        const data = await callDiscordOAuth({
          code,
          state,
          redirect_uri: `${window.location.origin}/buyer/discord/result`,
          save: false,
        }) as { discord_user?: { username?: string } };

        setAuthResult({
          discordUsername: data.discord_user?.username || "Discord User",
          guildName: "対象サーバー",
          roleName: "該当ロール",
          planName: "プラン",
        });
        setStatus("success"); // We'll use a local state to distinguish between "Confirming" and "Finalized"
      } catch (err: any) {
        console.error("OAuth exchange failed:", err);
        if (err instanceof DiscordOAuthError) {
          setErrorCode(err.code);
        }
        if (err.code === 'DISCORD_ALREADY_LINKED') {
          setErrorMessage(err.message || "このDiscordアカウントは、すでに別のユーザーアカウントに連携されています。");
          setStatus("error");
          // Store the specific error code to show specialized UI
          setAuthResult({ code: 'DISCORD_ALREADY_LINKED' } as any);
        } else if (err.code === 'BUYER_LOGIN_REQUIRED' || err.code === 'OAUTH_STATE_MISMATCH' || err.code === 'OAUTH_STATE_REQUIRED' || err.code === 'OAUTH_STATE_EXPIRED') {
          setErrorMessage(err.message || "購入したアカウントでログインし直して、もう一度Discord連携をやり直してください。");
          setStatus("error");
        } else {
          setErrorMessage(err.message || "Discord情報の取得に失敗しました。");
          setStatus("error");
        }
      }
    };

    fetchUserInfo();
  }, [code, errorParam, state]);

  const handleFinalize = async () => {
    setConfirmingSave(true);
    try {
      // Step 2: Finalize save (no code needed — tokens already stored from step 1)
      // BUG-B02 fix: Discord OAuth codes are one-time use, so we must NOT re-send the code
      const data = await callDiscordOAuth({ save: true }) as { success?: boolean };
      if (!data?.success) {
        throw new DiscordOAuthError("連携の最終処理に失敗しました。", "DISCORD_FINALIZE_FAILED");
      }

      sessionStorage.removeItem("discord_oauth_state");
      setIsFinalized(true);
      setConfirmingSave(false);
    } catch (err: any) {
      console.error(err);
      if (err instanceof DiscordOAuthError) {
        setErrorCode(err.code);
      }
      if (err.code === 'DISCORD_ALREADY_LINKED') {
        setErrorMessage(err.message || "このDiscordアカウントは、すでに別のユーザーアカウントに連携されています。");
        setAuthResult({ code: 'DISCORD_ALREADY_LINKED' } as any);
      } else if (err.code === 'BUYER_LOGIN_REQUIRED' || err.code === 'OAUTH_STATE_MISMATCH' || err.code === 'OAUTH_STATE_REQUIRED' || err.code === 'OAUTH_STATE_EXPIRED') {
        setErrorMessage(err.message || "購入したアカウントでログインし直して、もう一度Discord連携をやり直してください。");
      } else {
        setErrorMessage("連携の最終処理に失敗しました。");
      }
      setStatus("error");
      setConfirmingSave(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Discordと連携しています...</p>
      </div>
    );
  }

  if (status === "success" && authResult && (authResult as any).discordUsername) {
    return (
      <div className="space-y-5">
        {/* Success / Confirm */}
        <div className="glass-card rounded-xl p-6 text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            {isFinalized ? (
              <CheckCircle className="h-10 w-10 text-success" />
            ) : (
              <MessageCircle className="h-10 w-10 text-accent" />
            )}
          </div>
          <h1 className="text-xl font-bold">
            {isFinalized ? "連携完了！🎉" : "アカウントを確認してください"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isFinalized
              ? "Discordサーバーに参加し、ロールが付与されました。"
              : "連携するDiscordアカウントが以下で間違いないか確認してください。"}
          </p>
        </div>

        {/* Details */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Discordアカウント</span>
              <span className="font-medium">{authResult.discordUsername}</span>
            </div>
            {isFinalized && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">参加サーバー</span>
                  <span className="font-medium">{authResult.guildName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">付与ロール</span>
                  <Badge variant="default">{authResult.roleName}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">プラン</span>
                  <span className="font-medium">{authResult.planName}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {isFinalized ? (
          <>
            <div className="glass-card rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold">次のステップ</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MessageCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                  <p>Discordアプリで「{authResult.guildName}」サーバーを確認してください</p>
                </div>
                <div className="flex items-start gap-2">
                  <ExternalLink className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                  <p>限定チャンネルにアクセスできるようになっています</p>
                </div>
              </div>
            </div>
            <Button asChild className="w-full h-12 text-base font-bold">
              <Link to="/member/me">マイページへ</Link>
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleFinalize}
              disabled={confirmingSave}
              className="w-full h-12 text-base font-bold"
            >
              {confirmingSave ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              このアカウントで連携を完了する
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/buyer/discord/confirm">別のアカウントを試す</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Failure state
  const isLinkedError = (authResult as any)?.code === 'DISCORD_ALREADY_LINKED';

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-xl p-6 text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <XCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">連携に失敗しました</h1>
        <p className="text-sm text-muted-foreground">
          Discord連携中に問題が発生しました。以下をご確認ください。
        </p>
      </div>

      {/* Error Details */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {errorMessage || "予期せぬエラーが発生しました。"}
        </AlertDescription>
      </Alert>

      {isLinkedError ? (
        <div className="glass-card border-accent/20 rounded-xl p-5 space-y-3 bg-accent/5">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-accent">
            <RotateCcw className="h-4 w-4" /> 復旧のためのヒント
          </h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>このDiscordアカウントは、すでに別のメールアドレスで作成したアカウントに連携されている可能性があります。</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>以前、別のメールアドレス（Googleログイン等）でログインしていませんでしたか？</li>
              <li>心当たりがある場合は、一度ログアウトして別のアカウントでログインをお試しください。</li>
            </ul>
          </div>
          <Button variant="outline" size="sm" asChild className="w-full mt-2">
            <Link to="/auth">別のアカウントでログインし直す</Link>
          </Button>
        </div>
      ) : (errorCode === 'BUYER_LOGIN_REQUIRED' || errorCode === 'OAUTH_STATE_MISMATCH' || errorCode === 'OAUTH_STATE_REQUIRED' || errorCode === 'OAUTH_STATE_EXPIRED') ? (
        <div className="glass-card border-accent/20 rounded-xl p-5 space-y-3 bg-accent/5">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-accent">
            <RotateCcw className="h-4 w-4" /> まず確認してほしいこと
          </h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>購入した buyer アカウントでログインした状態が切れているか、連携開始セッションが途中で変わっています。</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>購入した buyer アカウントでログインし直す</li>
              <li>別タブに移らず、そのまま Discord 連携をやり直す</li>
              <li>seller アカウントでログインしたままになっていないか確認する</li>
            </ul>
          </div>
          <Button variant="outline" size="sm" asChild className="w-full mt-2">
            <Link to="/buyer/login?returnTo=/buyer/discord/confirm">購入したアカウントでログインし直す</Link>
          </Button>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold">考えられる原因</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Discordサーバーの招待リンクが無効になっている</li>
            <li>Botがサーバーから削除されている</li>
            <li>一時的なDiscordの障害が発生している</li>
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 px-1">
        <span>エラーコード:</span>
        <Badge variant="outline" className="font-mono text-xs">
          {isLinkedError ? 'DISCORD_ALREADY_LINKED' : errorCode}
        </Badge>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {!isLinkedError && (
          <Button asChild className="w-full h-12 text-base font-bold">
            <Link to="/buyer/discord/confirm">
              <RotateCcw className="h-5 w-5 mr-2" />
              もう一度連携する
            </Link>
          </Button>
        )}

        <div className="glass-card rounded-lg p-4 text-sm space-y-2">
          <p className="font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4" /> 解決しない場合
          </p>
          <p className="text-muted-foreground text-xs">
            販売者へお問い合わせください。エラーコードをお伝えいただくとスムーズです。
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            contact@example.com
          </p>
        </div>

        <Button variant="outline" asChild className="w-full">
          <Link to="/member/me">マイページへ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
