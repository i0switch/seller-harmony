import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBanner, LoadingSkeleton } from "@/components/shared";
import { formatCurrency, planTypeLabel } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Purchase() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { role } = useAuth();
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

    const { data: plan, isLoading, error } = useQuery({
        queryKey: ["public", "plan", id],
        queryFn: async () => {
            if (!id) throw new Error("Plan ID is required");

            const res = await fetch(
                `${SUPABASE_URL}/functions/v1/stripe-checkout?plan_id=${encodeURIComponent(id)}`,
                {
                    method: "GET",
                    headers: {
                        apikey: SUPABASE_PUBLISHABLE_KEY,
                    },
                }
            );

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error((data as { error?: string } | null)?.error || "プラン情報の取得に失敗しました。");
            }
            if (!data) throw new Error("プランが見つかりません。");
            return data as { name?: string; description?: string; price?: number; currency?: string; interval?: string; seller_store_name?: string };
        },
        enabled: !!id,
    });

    const handleCheckout = async () => {
        try {
            setIsCheckoutLoading(true);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session || (role && role !== "buyer" && role !== "platform_admin")) {
                toast({
                    title: "ログインが必要です",
                    description: "購入へ進む前に、購入者アカウントでログイン・または会員登録をお願いします",
                });
                navigate(`/buyer/login?returnTo=${encodeURIComponent(`/p/${id}`)}`);
                return;
            }

            const { data, error } = await supabase.functions.invoke("stripe-checkout", {
                body: { plan_id: id },
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("購入URLの取得に失敗しました");
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "決済の準備中にエラーが発生しました";
            if (message.includes("You already have an active subscription to this plan")) {
                toast({
                    title: "このプランはすでに購入済みです",
                    description: "購入者マイページまたはDiscord連携画面から続けてください。",
                });
                navigate("/member/me");
                return;
            }

            toast({
                title: "エラー",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsCheckoutLoading(false);
        }
    };

    // If F4-01 needs guest checkout, we shouldn't block. But let's build the auth check to see how it looks.
    // Actually, we should just let handleCheckout attempt it. If not logged in, we might redirect to a platform login, but let's keep it simple.

    if (isLoading) return <LoadingSkeleton type="cards" rows={1} />;
    if (error || !plan) {
        return (
            <div className="flex justify-center mt-10">
                <ErrorBanner error={error || new Error("見つかりません")} />
            </div>
        );
    }

    const storeName = (plan as Record<string, unknown>).seller_store_name as string || "販売者";

    return (
        <Card className="w-full shadow-lg border-primary/20">
            <CardHeader className="text-center pb-2">
                <div className="text-sm font-medium text-muted-foreground mb-1">{storeName}</div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-center pt-6 pb-8">
                <div className="text-4xl font-bold text-primary mb-2">
                    {formatCurrency(plan.price)}
                </div>
                <div className="text-sm text-muted-foreground">
                    {plan.interval === "month" ? "月額" : plan.interval === "year" ? "年額" : "単回払い"}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
                <Button
                    className="w-full text-lg h-12"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isCheckoutLoading}
                >
                    {isCheckoutLoading ? "準備中..." : "購入手続きへ進む"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                    「購入手続きへ進む」をクリックすると、安全なStripe決済画面へ移動します。
                </p>
            </CardFooter>
        </Card>
    );
}
