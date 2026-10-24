import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 75;

const requestSchema = z.object({
  prompt: z.string().trim().min(12, "Describe what you want to build in a little more detail.").max(8000),
  projectName: z.string().trim().max(120).optional(),
});

const outputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(1000),
  html: z.string().min(20).max(700000),
  files: z.array(z.object({
    path: z.string().min(1).max(180),
    content: z.string().max(300000),
  })).max(30).default([]),
});

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function enforcePreviewPolicy(source: string): string {
  const policy = "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' data:; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'\">";
  let html = source.replace(/<meta\b[^>]*content-security-policy[^>]*>/gi, "");
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (head) => head + policy);
  if (/<html\b[^>]*>/i.test(html)) return html.replace(/<html\b[^>]*>/i, (tag) => tag + "<head>" + policy + "</head>");
  return html.replace(/<!doctype\s+html[^>]*>/i, (doctype) => doctype + "<head>" + policy + "</head>");
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const providerKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return fail("BLINK needs Supabase environment variables and the database migration before AI generation can be enabled.", 503);
  }
  if (!providerKey) return fail("AI generation is not configured yet. Add OPENAI_API_KEY to the server environment.", 503);

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || token.length > 10000) return fail("Sign in to generate an application.", 401);

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > 12000) return fail("The request body is too large.", 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("The request body must be valid JSON.", 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request.", 400);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return fail("Your session is invalid or expired. Sign in again.", 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: allowed, error: quotaError } = await admin.rpc("consume_generation_quota", {
    p_user_id: authData.user.id,
    p_limit: 20,
  });
  if (quotaError) {
    console.error("BLINK quota RPC error", quotaError.message);
    return fail("Generation limits are not ready. Apply the BLINK Supabase migration and try again.", 503);
  }
  if (allowed !== true) return fail("You've reached the current limit of 20 generations per hour. Please try again later.", 429);

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const prompt = [
    "You are BLINK, a senior product designer and frontend engineer.",
    "Create a genuinely functional, polished web application from the user's requirements.",
    "Return JSON only with keys name, summary, html, files. files is an array of {path, content}, with index.html included when useful.",
    "html must be a complete standalone HTML document with all CSS and JavaScript inline.",
    "Use semantic accessible HTML, responsive layout, meaningful empty/loading/error states, and working interactions (forms, tabs, filters, modals, navigation, calculators, etc. as relevant).",
    "Visual direction: professional editorial spacing, strong typography, refined components, avoid generic AI gradients and fake dashboard metrics. Default palette should use black, white, and indigo blue unless the user asks for a different product palette.",
    "Do not use external scripts, frameworks, analytics, network calls, fetch, WebSocket, remote fonts, remote images, or remote resources. Use inline SVG, CSS shapes, and local demo data instead.",
    "Do not include backend credentials or secrets. If a server-dependent feature is requested, implement a clearly labelled client-side prototype and explain the backend integration in summary.",
    "Include this CSP meta tag in the HTML head: <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' data:; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'\">.",
    "Keep the total HTML under 500 KB. Do not wrap JSON in markdown fences.",
    "User requirements:\n" + parsed.data.prompt,
    parsed.data.projectName ? "Requested project name: " + parsed.data.projectName : "",
  ].filter(Boolean).join("\n\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${providerKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You return valid JSON only, following the provided schema and constraints." },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      const safeStatus = response.status;
      console.error("BLINK AI provider returned status", safeStatus);
      if (safeStatus === 429) return fail("The AI provider is busy or its rate limit was reached. Please retry shortly.", 429);
      if (safeStatus === 401 || safeStatus === 403) return fail("The AI provider key is invalid or lacks permission. Check the server configuration.", 502);
      return fail("The AI provider could not complete this request. Please try again.", 502);
    }

    const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw || raw.length > 900000) return fail("The AI provider returned an empty or oversized response.", 502);

    let decoded: unknown;
    try { decoded = JSON.parse(raw); } catch { return fail("The AI provider returned an invalid response. Try simplifying your request.", 502); }
    const output = outputSchema.safeParse(decoded);
    if (!output.success) return fail("The generated project did not pass validation. Try again with a more specific request.", 502);
    if (!/^<!doctype html/i.test(output.data.html.trim()) && !/^<html[\s>]/i.test(output.data.html.trim())) {
      return fail("The generated preview was not a complete HTML document. Please try again.", 502);
    }
    const paths = new Set<string>();
    for (const file of output.data.files) {
      if (file.path.startsWith("/") || file.path.split("/").some((part) => part === "..") || file.path.includes("\\") || paths.has(file.path)) {
        return fail("The AI provider returned an invalid file path. Try again.", 502);
      }
      paths.add(file.path);
    }
    const safeHtml = enforcePreviewPolicy(output.data.html);
    if (new TextEncoder().encode(safeHtml).byteLength > 700000) return fail("The generated HTML is too large to store safely. Try a smaller request.", 502);
    const projectFiles = [{ path: "index.html", content: safeHtml }, ...output.data.files.filter((file) => file.path !== "index.html").slice(0, 29)];
    return NextResponse.json({ ...output.data, html: safeHtml, files: projectFiles }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return fail("Generation timed out. Try a smaller request.", 504);
    console.error("BLINK generation failure", error instanceof Error ? error.message : "unknown error");
    return fail("Something went wrong while generating your application.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
