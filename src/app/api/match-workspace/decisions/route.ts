/**
 * Record an advisor decision on a scored brand.
 *
 * A thin wrapper over `appendDecision`, so the worksheet is held to exactly the same append-only
 * rules as the import: same lineage, and a change must supersede the chain's current head. The
 * route never writes a MatchDecision directly, because a second writer that skipped those checks
 * would make "current" ambiguous and quietly break the candidate-safe projection.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/with-admin";
import prisma from "@/lib/prisma";
import { appendDecision, LineageError } from "@/lib/match-workspace/append";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  scoreId: z.string().min(1),
  state: z.enum(["shortlist", "final_slate", "rejected"]),
  reason: z.string().max(2000).nullable().optional(),
  /** The decision this one replaces. Null only when the brand has no decision yet. */
  supersedesId: z.string().nullable().optional(),
});

export const POST = withAdmin(async (req, session) => {
  let parsed;
  try {
    parsed = BodySchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Expected a JSON body." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid decision.", detail: parsed.error.issues },
      { status: 400 },
    );
  }
  const { scoreId, state, reason, supersedesId } = parsed.data;

  try {
    const decision = await prisma.$transaction((tx) =>
      appendDecision(tx, {
        scoreId,
        state,
        actor: session.user.email,
        reason: reason ?? null,
        supersedesId: supersedesId ?? null,
      }),
    );
    return NextResponse.json({ ok: true, decision }, { status: 201 });
  } catch (err) {
    if (err instanceof LineageError) {
      // Most often a stale page: someone else moved the chain on. A conflict, not a fault.
      return NextResponse.json({ ok: false, error: err.message, code: err.code }, { status: 409 });
    }
    console.error("match-workspace decision failed", err);
    return NextResponse.json({ ok: false, error: "The decision could not be recorded." }, { status: 500 });
  }
});
