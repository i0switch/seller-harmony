import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
    sellerSignup: (email: string, pass: string) => Promise<{ error: { message: string } | null }>;

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

    useEffect(() => {
        const initializeAuth = async () => {
            // Get initial session first
            const { data: { session: initialSession } } = await supabase.auth.getSession();
            await onAuthStateChange("INITIAL", initialSession);

            // Then listen for changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                (_event, newSession) => onAuthStateChange(_event, newSession)
            );

            return () => {
                subscription.unsubscribe();
            };
        };

        initializeAuth();
    }, []);

    const onAuthStateChange = async (event: string | null, currentSession: Session | null) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
            // Read role from public.users table (source of truth)
            const { data } = await supabase
                .from('users')
                .select('role')
                .eq('id', currentSession.user.id)
                .single();
            setRole((data?.role as Role) || "buyer");
        } else {
            setRole(null);
        }

        setIsLoading(false);
    };

    const sellerLogin = async (email: string, pass: string) => {
        return await supabase.auth.signInWithPassword({ email, password: pass });
    };

    const sellerSignup = async (email: string, pass: string) => {
        return await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: { role: "seller" }
            }
        });
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
