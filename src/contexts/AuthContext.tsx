import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/async";

export type Role = "platform_admin" | "seller" | "buyer";
export type OnboardingStep = "profile" | "stripe" | "discord" | "complete";

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: Role | null;
    isLoading: boolean;

    // Seller specific state
    sellerOnboardingStep: OnboardingStep;
    setSellerOnboardingStep: (step: OnboardingStep) => void;
    sellerLogin: (email: string, pass: string) => Promise<{ error: { message: string } | null }>;
    sellerSignup: (email: string, pass: string, displayName?: string) => Promise<{ error: { message: string } | null }>;

    // Shared actions
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [sellerOnboardingStep, setSellerOnboardingStep] = useState<OnboardingStep>("profile");

    const sanitizeAuthError = (message?: string) => {
        if (!message) return "認証に失敗しました。時間をおいて再度お試しください。";

        const normalized = message.toLowerCase();
        if (
            normalized.includes("invalid login credentials") ||
            normalized.includes("user not found") ||
            normalized.includes("email not confirmed") ||
            normalized.includes("already registered") ||
            normalized.includes("already been registered")
        ) {
            return "入力内容を確認のうえ、再度お試しください。";
        }

        return "認証に失敗しました。時間をおいて再度お試しください。";
    };

    useEffect(() => {
        let subscription: { unsubscribe: () => void } | undefined;

        const initializeAuth = async () => {
            try {
                const { data: { session: initialSession } } = await withTimeout(
                    supabase.auth.getSession(),
                    "認証セッションの取得がタイムアウトしました。",
                );
                await onAuthStateChange("INITIAL", initialSession);

                const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
                    (_event, newSession) => onAuthStateChange(_event, newSession)
                );
                subscription = sub;
            } catch (error) {
                console.error("initializeAuth failed:", error);
                setSession(null);
                setUser(null);
                setRole(null);
                setIsLoading(false);
            }
        };

        initializeAuth();

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const onAuthStateChange = async (event: string | null, currentSession: Session | null) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
            try {
                const { data } = await withTimeout(
                    supabase
                        .from('users')
                        .select('role')
                        .eq('id', currentSession.user.id)
                        .single(),
                    "ユーザー権限の取得がタイムアウトしました。",
                );
                setRole((data?.role as Role) || null);
            } catch (error) {
                console.error("role lookup failed:", { event, error });
                setRole(null);
            }
        } else {
            setRole(null);
        }

        setIsLoading(false);
    };

    const sellerLogin = async (email: string, pass: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) {
            return { error: { message: sanitizeAuthError(error.message) } };
        }
        return { data, error: null };
    };

    const sellerSignup = async (email: string, pass: string, displayName?: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: {
                    role: "seller",
                    ...(displayName ? { display_name: displayName.trim() } : {}),
                }
            }
        });

        if (error) {
            return { error: { message: sanitizeAuthError(error.message) } };
        }

        return { data, error: null };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setSellerOnboardingStep("profile");
        setSession(null);
        setUser(null);
        setRole(null);
    };

    const value: AuthContextType = {
        session,
        user,
        role,
        isLoading,
        sellerOnboardingStep,
        setSellerOnboardingStep,
        sellerLogin,
        sellerSignup,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
