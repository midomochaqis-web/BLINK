import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bsyccwbjjhnhlpiuwuhw.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeWNjd2JqamhuaGxwaXV3dWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NzI5NTMsImV4cCI6MjEwODQ0ODk1M30.5J5XeImeso41GyOtFrViwcn9w8pIlMMgcoYd_SWOGCk";
  if (!url || !key || url.includes("YOUR_PROJECT") || key.startsWith("YOUR_")) return null;
  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return browserClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseBrowserClient() !== null;
}
