import { NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { scoreResultsHtml, scoreResultsText } from "@/app/emails/scorecard-results";
import { followUpDay2Html, followUpDay2Text } from "@/app/emails/follow-up-day2";
import { followUpDay5Html, followUpDay5Text } from "@/app/emails/follow-up-day5";
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

    // ── 2. Fire Email 1 immediately ───────────────────────────────────────────
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Your Franchise Readiness Score: ${Math.min(score, 98)}/100`,
      html: scoreResultsHtml({ name, score, primaryDriver: primaryDriver ?? "", biggestFear: biggestFear ?? "" }),
      text: scoreResultsText({ name, score, primaryDriver: primaryDriver ?? "", biggestFear: biggestFear ?? "" }),
      tags: [{ name: "sequence", value: "scorecard-email-1" }],
    });


    // ── 3. Schedule Email 2 (Day 2) via Resend Scheduled ─────────────────────
    // Resend supports "scheduledAt" on the email send payload
    const day2 = new Date();
    day2.setDate(day2.getDate() + 2);

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `The 3 questions most people forget to ask before buying a franchise`,
      html: followUpDay2Html(name),
      text: followUpDay2Text(name),
      scheduledAt: day2.toISOString(),
      tags: [{ name: "sequence", value: "scorecard-email-2" }],
    });

    // ── 4. Schedule Email 3 (Day 5) ───────────────────────────────────────────
    const day5 = new Date();
    day5.setDate(day5.getDate() + 5);

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Still thinking about it, ${name.split(" ")[0]}?`,
      html: followUpDay5Html(name, score),
      text: followUpDay5Text(name, score),
      scheduledAt: day5.toISOString(),
      tags: [{ name: "sequence", value: "scorecard-email-3" }],
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      sequenceStarted: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[scorecard-complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
