import { NextResponse } from "next/server";
import { Resend } from "resend";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { scoreResultsHtml, scoreResultsText } from "@/app/emails/scorecard-results";
import { ScorecardSchema } from "@/app/lib/schemas";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Kelsey Stuart <kelsey@waypointfranchise.com>";

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = ScorecardSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, score, primaryDriver, biggestFear } = parsed.data;

    // ── 1. Upsert lead in DB ──────────────────────────────────────────────────
    const existing = await prisma.lead.findFirst({ where: { email } });

    const lead = existing
      ? await prisma.lead.update({
          where: { id: existing.id },
          data: {
            score,
            careerTrigger: primaryDriver,
            franchiseAngle: biggestFear ? `Inbound: ${biggestFear}` : existing.franchiseAngle,
            status: "SEQUENCED",
          },
        })
      : await prisma.lead.create({
          data: {
            name,
            email,
            score,
            careerTrigger: primaryDriver,
            franchiseAngle: biggestFear ? `Inbound: ${biggestFear}` : null,
            status: "SEQUENCED",
          },
        });

    // ── 2. Create ScorecardSubmission for nurture tracking ────────────────────
    const submission = await (prisma as any).scorecardSubmission.create({
      data: {
        email,
        name,
        score,
        primaryDriver: primaryDriver ?? null,
        biggestFear: biggestFear ?? null,
        nurtureStep: 1, // Email 1 (results) is sent immediately below
      },
    });

    // ── 3. Send Email 1 immediately (scorecard results) ───────────────────────
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Your Franchise Readiness Score: ${Math.min(score, 98)}/100`,
      html: scoreResultsHtml({ name, score, primaryDriver: primaryDriver ?? "", biggestFear: biggestFear ?? "" }),
      text: scoreResultsText({ name, score, primaryDriver: primaryDriver ?? "", biggestFear: biggestFear ?? "" }),
      tags: [{ name: "sequence", value: "scorecard-email-1" }],
    });

    // ── 4. Fire Inngest nurture — handles Day 3 + Day 7 with unsubscribe gating
    await inngest.send({
      name: "nurture/scorecard.complete",
      data: {
        submissionId: submission.id,
        email,
        name,
        score,
      },
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      submissionId: submission.id,
      sequenceStarted: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[scorecard-complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
