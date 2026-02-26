import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xaqzuevdmeqxntvhamce.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcXp1ZXZkbWVxeG50dmhhbWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDAxODAsImV4cCI6MjA4NzYxNjE4MH0.p_Gfy9YDtGCnmqa0UjqU0LMVUXS6xDl9-sRipF0xfIU";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testLogin() {
    const email = 'e2e-seller-test@example.com';
    console.log(`Trying to login with ${email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: "Password123!",
    });
    if (error) {
        console.error("Login failed:", error.message);
    } else {
        console.log("Login succeeded:", data.user?.id);
    }
}

testLogin();
