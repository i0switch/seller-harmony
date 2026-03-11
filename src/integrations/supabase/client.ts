import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || "https://xaqzuevdmeqxntvhamce.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcXp1ZXZkbWVxeG50dmhhbWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDAxODAsImV4cCI6MjA4NzYxNjE4MH0.p_Gfy9YDtGCnmqa0UjqU0LMVUXS6xDl9-sRipF0xfIU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
