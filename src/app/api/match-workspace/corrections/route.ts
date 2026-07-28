/**
 * Record an advisor correction to a frozen score field. [C-12]
 *
 * Scores are immutable, so a correction is never an edit: it is a new row stating the field, the
 * before and after values, the reason, the source and the actor, all of which the roadmap requires.
 * The stored score is left exactly as the matcher produced it, and reconstruction still works from
 * it, which is the point of keeping the correction beside the score rather than inside it.
 *
 * This endpoint exists because a reviewer pointed out `appendCorrection` had no caller outside its
 * tests, leaving `MatchCorrection` unreachable from the app even though the worksheet displays it.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/with-admin";
import prisma from "@/lib/prisma";
import { appendCorrection, LineageError } from "@/lib/match-workspace/append";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  scoreId: z.string().min(1),
  field: z.string().min(1).max(80),
  beforeValue: z.unknown(),
  afterValue: z.unknown(),
  reason: z.string().min(1).max(2000),
  source: z.string().min(1).max(200),
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
      { ok: false, error: "Invalid correction.", detail: parsed.error.issues },
      { status: 400 },
    );
  }
  const { beforeValue, afterValue, ...rest } = parsed.data;

  try {
    const correction = await prisma.$transaction((tx) =>
      appendCorrection(tx, {
        ...rest,
        beforeValue: (beforeValue ?? null) as never,
        afterValue: (afterValue ?? null) as never,
        actor: session.user.email,
      }),
    );
    return NextResponse.json({ ok: true, correction }, { status: 201 });
  } catch (err) {
    if (err instanceof LineageError) {
      return NextResponse.json({ ok: false, error: err.message, code: err.code }, { status: 409 });
    }
    console.error("match-workspace correction failed", err);
    return NextResponse.json({ ok: false, error: "The correction could not be recorded." }, { status: 500 });
  }
});
