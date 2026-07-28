/**
 * Capture candidate-facing text for one confirmed-slate brand.
 *
 * The text comes from the `brand-introduction-scripts` skill, which runs AFTER the advisor confirms
 * the Top 3. That is why this is a separate endpoint rather than a field on the import: the July
 * matcher removed its Stage 5, so the confirmed slate is the only possible input to this text.
 *
 * A refusal returns every leak finding with its exact span, so a rewrite can fix them in one pass.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/with-admin";
import prisma from "@/lib/prisma";
import { appendProjection, ProjectionRefused } from "@/lib/match-workspace/projection";
import { explainFindings } from "@/lib/match-workspace/projection-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  runId: z.string().min(1),
  waypointBrandId: z.string().min(1),
  matchDecisionId: z.string().min(1),
  bodyText: z.string().min(1).max(20000),
  sourceSkill: z.string().min(1).default("brand-introduction-scripts"),
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
      { ok: false, error: "Invalid projection.", detail: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const projection = await prisma.$transaction((tx) =>
      appendProjection(tx, { ...parsed.data, actor: session.user.email }),
    );
    return NextResponse.json({ ok: true, projectionId: projection.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ProjectionRefused) {
      return NextResponse.json(
        {
          ok: false,
          code: err.code,
          error: err.message,
          findings: err.findings,
          explanation: explainFindings(err.findings),
        },
        // 422 for text that must be rewritten, 409 for a slate that moved underneath the caller.
        { status: err.code === "LEAK_DETECTED" || err.code === "EMPTY_BODY" ? 422 : 409 },
      );
    }
    console.error("match-workspace projection failed", err);
    return NextResponse.json({ ok: false, error: "The text could not be stored." }, { status: 500 });
  }
});
