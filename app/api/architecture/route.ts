import { NextResponse } from "next/server";
import { createArchitectureManifest } from "@/lib/architecture/manifest";
import { createProjectPlan } from "@/lib/planner/create-plan";
import { planRequestSchema } from "@/lib/planner/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 12_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const plan = createProjectPlan(parsed.data);
    const manifest = createArchitectureManifest(plan);
    return NextResponse.json(
      { manifest, mode: "rule-based-preview" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "BLINK could not validate this architecture. Refine the project description and try again." },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }
}
