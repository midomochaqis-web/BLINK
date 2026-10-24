import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const providerKey = process.env.OPENAI_API_KEY;

  const checks: Record<string, boolean> = {
    supabaseUrl: Boolean(url),
    supabasePublicKey: Boolean(publicKey),
    supabaseServiceRole: Boolean(serviceRoleKey),
    aiProviderKey: Boolean(providerKey),
    databaseSchema: false,
  };

  if (url && serviceRoleKey) {
    try {
      const admin = createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await admin.from("projects").select("id").limit(0);
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
