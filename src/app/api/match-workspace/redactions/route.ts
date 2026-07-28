/**
 * Right to be forgotten for one candidate. [C-7]
 *
 * Anonymize, never destroy: the immutable runs, scores, decisions and outcomes key on the opaque
 * `Candidate.id`, which carries no PII, so historical truth and future calibration survive. What
 * goes is the PII itself, including every candidate-facing projection body written about this
 * person.
 *
 * This endpoint exists because a reviewer pointed out that `redactCandidate` had no caller outside
 * its tests, which meant [C-7] was implemented but not OPERABLE.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/with-admin";
import prisma from "@/lib/prisma";
import { redactCandidate } from "@/lib/match-workspace/projection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  candidateId: z.string().min(1),
  /** Typed confirmation, because this is irreversible for the PII it clears. */
  confirm: z.literal("REDACT"),
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
      { ok: false, error: 'Invalid request. Send { candidateId, confirm: "REDACT" }.' },
      { status: 400 },
    );
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: parsed.data.candidateId } });
  if (!candidate) {
    return NextResponse.json({ ok: false, error: "No such candidate." }, { status: 404 });
  }
  if (candidate.redactedAt) {
    // Idempotent: already anonymized is a success, not an error.
    return NextResponse.json({ ok: true, alreadyRedacted: true, projectionsRedacted: 0 }, { status: 200 });
  }

  const result = await redactCandidate(prisma, parsed.data.candidateId);
  console.warn(`[C-7] candidate ${result.candidateId} redacted by ${session.user.email}`);
  return NextResponse.json({ ok: true, alreadyRedacted: false, ...result }, { status: 200 });
});
