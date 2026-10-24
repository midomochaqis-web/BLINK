import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bsyccwbjjhnhlpiuwuhw.supabase.co";
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeWNjd2JqamhuaGxwaXV3dWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NzI5NTMsImV4cCI6MjEwODQ0ODk1M30.5J5XeImeso41GyOtFrViwcn9w8pIlMMgcoYd_SWOGCk";
  const providerKey = process.env.OPENAI_API_KEY;

  const checks: Record<string, boolean> = {
    supabaseUrl: Boolean(url),
    supabasePublicKey: Boolean(publicKey),
    aiProviderKey: Boolean(providerKey),
    databaseSchema: false,
  };

  if (url && publicKey) {
    try {
      const client = createClient(url, publicKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await client.from("projects").select("id").limit(0);
      checks.databaseSchema = !error;
      if (error) console.warn("BLINK readiness schema check failed:", error.code || "unknown");
    } catch {
      checks.databaseSchema = false;
    }
  }

  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json(
    { service: "BLINK", status: ready ? "ready" : "configuration_required", checks },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
