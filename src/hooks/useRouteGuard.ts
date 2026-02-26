import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function usePlatformAuth() {
  const { session, role, isLoading, logout: globalLogout } = useAuth();
  const isLoggedIn = !!session && role === "platform_admin";

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await globalLogout();
  };

  return { isLoggedIn, isLoading, login, logout };
}

export function useBuyerAuth() {
  const { session, role, logout: globalLogout } = useAuth();
  const hasSession = !!session && role === "buyer";

  const startSession = () => {};
  const endSession = async () => { await globalLogout(); };

  return { hasSession, startSession, endSession };
}
