import { NextResponse } from "next/server";
import { Resend } from "resend";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { scoreResultsHtml, scoreResultsText } from "@/app/emails/scorecard-results";
import { ScorecardSchema } from "@/app/lib/schemas";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Kelsey Stuart <kelsey@waypointfranchise.com>";
const HIGH_SCORE_THRESHOLD = 70;

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
    const firstName = name.split(" ")[0];

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

    // ── 2. Deduplicate: only start a new nurture sequence if none is active ───
    // "Active" = not completed and not unsubscribed. If a sequence is already
    // sleeping for this email, skip creating another one — prevents double emails
    // when someone re-submits the scorecard.
    const activeSubmission = await (prisma as any).scorecardSubmission.findFirst({
      where: {
        email,
        nurtureCompletedAt: null,
        unsubscribed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    let submission = activeSubmission;
    let sequenceStarted = false;

    if (!activeSubmission) {
      submission = await (prisma as any).scorecardSubmission.create({
        data: {
          email,
          name,
          score,
          primaryDriver: primaryDriver ?? null,
          biggestFear: biggestFear ?? null,
          nurtureStep: 1,
        },
      });

      await inngest.send({
        name: "nurture/scorecard.complete",
        data: {
          submissionId: submission.id,
          email,
          name,
          score,
        },
      });

      sequenceStarted = true;
    } else {
      // Update score on the existing submission (they retook the scorecard)
      await (prisma as any).scorecardSubmission.update({
        where: { id: activeSubmission.id },
        data: { score },
      });
    }

    // ── 3. Send Email 1 immediately (scorecard results) — always sent ─────────
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Your Franchise Readiness Score: ${Math.min(score, 98)}/100`,
      html: scoreResultsHtml({ name, score, primaryDriver: primaryDriver ?? "", biggestFear: biggestFear ?? "" }),
      text: scoreResultsText({ name, score, primaryDriver: primaryDriver ?? "", biggestFear: biggestFear ?? "" }),
      tags: [{ name: "sequence", value: "scorecard-email-1" }],
    });

    // ── 4. Alert Kelsey for high-score submissions ────────────────────────────
    if (score >= HIGH_SCORE_THRESHOLD) {
      const tier = score >= 70 ? (score >= 85 ? "🔥 Exceptional" : "✅ Strong") : "Solid";
      const slackWebhook = process.env.SLACK_WEBHOOK_URL;

      if (slackWebhook) {
        // Non-blocking — don't let Slack failure break the API
        fetch(slackWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*${tier} scorecard submission* — ${firstName} scored *${score}/100*`,
                },
              },
              {
                type: "section",
                fields: [
                  { type: "mrkdwn", text: `*Name:*\n${name}` },
                  { type: "mrkdwn", text: `*Email:*\n${email}` },
                  { type: "mrkdwn", text: `*Score:*\n${score}/100` },
                  { type: "mrkdwn", text: `*Driver:*\n${primaryDriver ?? "—"}` },
                  { type: "mrkdwn", text: `*Biggest fear:*\n${biggestFear ?? "—"}` },
                  { type: "mrkdwn", text: `*Sequence started:*\n${sequenceStarted ? "Yes" : "Already active"}` },
                ],
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: { type: "plain_text", text: "View in Admin" },
                    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.waypointfranchise.com"}/admin/scorecard`,
                  },
                ],
              },
            ],
          }),
        }).catch((e) => console.error("[scorecard-complete] Slack alert failed:", e));
      }
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      submissionId: submission.id,
      sequenceStarted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[scorecard-complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
