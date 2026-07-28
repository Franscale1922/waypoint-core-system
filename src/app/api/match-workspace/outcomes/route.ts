/**
 * Record a real-world outcome for a candidate and brand.
 *
 * Goes through `appendOutcome` so the outcome chain obeys the same lineage rule as everything else:
 * an outcome may only supersede another outcome for the SAME candidate and brand, which is what
 * stops "placed at Brand A" rewriting "lost at Brand B".
 *
 * Outcomes are a timeline, not a state machine: introduced, advanced and placed are separate events
 * rather than corrections of one another, so a new event needs no `supersedesId`. Supersession here
 * means the earlier event was recorded WRONGLY.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/with-admin";
import prisma from "@/lib/prisma";
import { appendOutcome, LineageError } from "@/lib/match-workspace/append";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  candidateId: z.string().min(1),
  waypointBrandId: z.string().min(1),
  originatingRunId: z.string().min(1),
  // The frozen outcome vocabulary [C-4]. A value outside it is rejected before it reaches the DB.
  type: z.enum(["introduced", "advanced", "placed", "lost", "withdrawn"]),
  reason: z.string().max(2000).nullable().optional(),
  /** Real-world effective date, which is often not today. */
  effectiveAt: z.coerce.date().optional(),
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
      { ok: false, error: "Invalid outcome.", detail: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const outcome = await prisma.$transaction((tx) =>
      appendOutcome(tx, {
        ...parsed.data,
        reason: parsed.data.reason ?? null,
        actor: session.user.email,
      }),
    );
    return NextResponse.json({ ok: true, outcome }, { status: 201 });
  } catch (err) {
    if (err instanceof LineageError) {
      return NextResponse.json({ ok: false, error: err.message, code: err.code }, { status: 409 });
    }
    console.error("match-workspace outcome failed", err);
    return NextResponse.json({ ok: false, error: "The outcome could not be recorded." }, { status: 500 });
  }
});
