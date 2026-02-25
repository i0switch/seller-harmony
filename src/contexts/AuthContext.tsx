import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
    sellerLogin: (email: string, pass: string) => Promise<any>;
    sellerSignup: (email: string, pass: string) => Promise<any>;

    // Shared actions
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [sellerOnboardingStep, setSellerOnboardingStep] = useState<OnboardingStep>(
        (localStorage.getItem("seller_onboarding_step") as OnboardingStep) || "profile"
    );

    useEffect(() => {
        // Sync onboarding step to local storage until moved to DB
        localStorage.setItem("seller_onboarding_step", sellerOnboardingStep);
    }, [sellerOnboardingStep]);

    useEffect(() => {
        const initializeAuth = async () => {
            onAuthStateChange(null, null); // Dummy trigger to fetch session on mount

            const { data: { session } } = await supabase.auth.getSession();
            await onAuthStateChange(null, session);

            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                (_event, newSession) => onAuthStateChange(_event, newSession)
            );

            return () => {
                subscription.unsubscribe();
            };
        };

        initializeAuth();
    }, []);

    const onAuthStateChange = async (_event: any, currentSession: Session | null) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
            // Decode user role
            const userRole = currentSession.user.user_metadata?.role as Role | undefined;
            setRole(userRole || "buyer"); // default to buyer
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
