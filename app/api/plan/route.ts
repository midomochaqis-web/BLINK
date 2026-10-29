import { NextResponse } from "next/server";
import { createProjectPlan } from "@/lib/planner/create-plan";
import { planRequestSchema } from "@/lib/planner/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 12_000) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }

    const body: unknown = await request.json();
    const parsed = planRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const plan = createProjectPlan(parsed.data);
    return NextResponse.json({ plan }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }
}
