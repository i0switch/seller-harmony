import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export default function BuyerLogin() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const returnTo = searchParams.get("returnTo") || "/member/me";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const sanitizeAuthError = (input: unknown) => {
        const fallback = "入力内容を確認のうえ、再度お試しください。";
        if (!(input instanceof Error) || !input.message) return fallback;

        const normalized = input.message.toLowerCase();
        if (
            normalized.includes("invalid login credentials") ||
            normalized.includes("user not found") ||
            normalized.includes("already registered") ||
            normalized.includes("already been registered") ||
            normalized.includes("email not confirmed")
        ) {
            return fallback;
        }

        return "認証に失敗しました。時間をおいて再度お試しください。";
    };

    const handleAuth = async (e: React.FormEvent, isSignUp: boolean) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError("メールアドレスとパスワードを入力してください");
            return;
        }
        setLoading(true);
        setError("");
        setMessage("");

        try {
            if (isSignUp) {
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
                if (signUpError) throw signUpError;

                if (!signUpData.session) {
                    setMessage("確認メールを送信しました。メール内リンクを開いてからログインしてください。");
                    return;
                }

                navigate(returnTo);
                return;
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) throw signInError;

            navigate(returnTo);
        } catch (err: unknown) {
            setError(sanitizeAuthError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div className="w-full max-w-sm glass-card rounded-xl p-6">
                <div className="text-center mb-6">
                    <h1 className="text-xl font-bold">🎫 購入者ログイン / 新規登録</h1>
                    <p className="text-sm text-muted-foreground mt-1">購入を続けるにはログインしてください</p>
                </div>
                <form className="space-y-4">
                    {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
                    {message && <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">{message}</p>}
                    <div className="space-y-2">
                        <Label htmlFor="email">メールアドレス</Label>
                        <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">パスワード</Label>
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={loading}
                            onClick={(e) => handleAuth(e, true)}
                        >
                            新規登録
                        </Button>
                        <Button
                            type="button"
                            className="w-full"
                            disabled={loading}
                            onClick={(e) => handleAuth(e, false)}
                        >
                            ログイン
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
