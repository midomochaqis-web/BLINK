import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("BLINK first-run experience", () => {
  it("shows the authentication gateway before the full workspace", () => {
    const page = read("app/page.tsx");
    const authGate = page.indexOf('if (!user || recoveryMode)');
    const workspace = page.indexOf('return <main className="app-shell">');

    expect(authGate).toBeGreaterThan(-1);
    expect(workspace).toBeGreaterThan(authGate);
    expect(page).toContain('supabase.auth.signUp');
    expect(page).toContain('supabase.auth.signInWithPassword');
    expect(page).toContain('supabase.auth.resetPasswordForEmail');
    expect(page).toContain('supabase.auth.updateUser({ password })');
  });

  it("sends generation to the server API and runs returned HTML in a sandbox", () => {
    const page = read("app/page.tsx");
    const route = read("app/api/generate/route.ts");

    expect(page).toContain('fetch("/api/generate"');
    expect(page).toContain('srcDoc={createPreviewDocument(activeProject.html)}');
    expect(page).toContain("blink-preview-runtime-error");
    expect(page).toContain("window.addEventListener('error'");
    expect(page).toContain('sandbox="allow-scripts"');
    expect(route).toContain('process.env.OPENAI_API_KEY');
    expect(route).toContain('request.headers.get("authorization")');
    expect(route).toContain('Authorization: `Bearer ${providerKey}`');
  });

  it("persists project-scoped AI conversation history with owner-scoped reads", () => {
    const page = read("app/page.tsx");
    const schema = read("supabase/migrations/202610240001_initial_schema.sql");
    expect(page).toContain('from("ai_conversations")');
    expect(page).toContain('from("ai_messages")');
    expect(page).toContain("persistConversationTurn");
    expect(page).toContain("loadConversation");
    expect(schema).toContain("create table if not exists public.user_profiles");
    expect(schema).toContain("create table if not exists public.ai_conversations");
    expect(schema).toContain("create table if not exists public.ai_messages");
    expect(schema).toContain("enable row level security");
    expect(schema).toContain("auth.uid()");
  });

  it("consumes generation quota with the authenticated user's token, not a service key", () => {
    const route = read("app/api/generate/route.ts");
    expect(route).toContain('authClient.rpc("consume_generation_quota"');
    expect(route).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(route).toContain("Bearer " + '+ " " + token');
  });

  it("does not pretend GitHub Pages can authenticate or generate apps", () => {
    const page = read("index.html");

    expect(page).toContain("GitHub Pages cannot securely process account sessions");
    expect(page).toContain("Account access is intentionally not simulated");
    expect(page).toContain("vercel.com/new/clone");
  });
});
