import { NextResponse } from "next/server";
import { afterResponse } from "@/lib/after-response";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { scoreResultsHtml, scoreResultsText } from "@/app/emails/scorecard-results";
import { ScorecardSchema } from "@/app/lib/schemas";
import { subscribeToBeehiiv } from "@/lib/beehiiv";
import { isEmailSuppressed } from "@/lib/email-suppression";
import { guardCapture, resendFailed, markDelivered, deliveryFailed } from "@/lib/lead-capture";

const resend = new Resend(process.env.RESEND_API_KEY);
// FROM uses the verified mail.waypointfranchise.com subdomain (apex is reserved for Google Workspace receiving).
// REPLY_TO uses the apex so any replies land in Kelsey's Gmail inbox.
const FROM = "Kelsey Stuart <kelsey@mail.waypointfranchise.com>";
const REPLY_TO = "kelsey@waypointfranchise.com";
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

    const { name, score, primaryDriver, biggestFear } = parsed.data;

    // Rate limits and address normalization. No idempotency key here: a retake
    // produces a genuinely different score, so suppressing the repeat would
    // swallow a result the visitor is waiting on. The per-address limit is what
    // bounds abuse of this route.
    const guard = await guardCapture({
      req,
      route: "scorecard-complete",
      preserveLead: () =>
        notifyCrm({
          name,
          email: parsed.data.email.trim().toLowerCase(),
          source: "Franchise Scorecard",
          notes: "Captured during a degraded request; no email was sent.",
        }),
      email: parsed.data.email,
    });
    if (!guard.proceed) return guard.response;
    const email = guard.email;

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

    // ── 1b. CRM sync ─────────────────────────────────────────────────────────
    // Runs after the response is flushed, so it never delays the results email.
    // See @/lib/after-response for why a bare unawaited promise is not safe here.
    afterResponse("[scorecard-complete] CRM sync", () =>
      notifyCrm({
        name,
        email,
        source: "Franchise Scorecard",
        notes: [
          `Score: ${score}/100`,
          primaryDriver ? `Driver: ${primaryDriver}` : null,
          biggestFear   ? `Fear: ${biggestFear}`     : null,
        ].filter(Boolean).join(" | "),
      })
    );

    // ── 2. Deduplicate: only start a new nurture sequence if none is active ───
    // "Active" = not completed and not unsubscribed. If a sequence is already
    // sleeping for this email, skip creating another one; prevents double emails
    // when someone re-submits the scorecard.
    // One cast for this model instead of four: the Prisma client types are
    // regenerated on deploy and do not yet know these fields locally.
    const submissions = (prisma as any).scorecardSubmission;

    const activeSubmission = await submissions.findFirst({
      where: {
        email,
        nurtureCompletedAt: null,
        unsubscribed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    let submission = activeSubmission;
    let sequenceStarted = false;
    // Read by the deferred nurture trigger below, which runs only once the
    // response is flushed and so sees whatever the results send set it to.
    // Without it a failed delivery returned 500 to the visitor and started the
    // drip regardless, because after() had already been handed the callback:
    // Day-3 marketing for a result they never received.
    let delivered = false;

    if (!activeSubmission) {
      submission = await submissions.create({
        data: {
          email,
          name,
          score,
          primaryDriver: primaryDriver ?? null,
          biggestFear: biggestFear ?? null,
        },
      });

      // Scheduled, not awaited: the results email below is the thing the user is
      // waiting on, and it must not be blocked by the Inngest round-trip. This
      // used to be an unguarded `await`, so an Inngest hiccup returned a 500 and
      // sent no results email at all.
      //
      // On failure the row created just above is deleted, and that compensation
      // is load-bearing. The dedup query matches any row with nurtureCompletedAt
      // null and unsubscribed false, so an orphan left by a failed send makes
      // every future retake take the "already active" branch: that address could
      // never start a sequence again. The lead row keeps the score either way.
      const submissionId = submission.id;
      afterResponse("[scorecard-complete] Nurture trigger", async () => {
        try {
          if (!delivered) {
            console.error("[scorecard-complete] delivery failed; releasing the submission row instead of starting a sequence");
            await submissions.delete({ where: { id: submissionId } });
            return;
          }
          // An opt-out recorded on ANY list belongs to this person and stops the
          // sequence before it starts. The results email above still goes out:
          // they just asked for it.
          // isEmailSuppressedFailClosed cannot distinguish "this person opted
          // out" from "the lookup failed", so it must not be what decides to
          // DESTROY the row: a transient read error would erase the quiz answers.
          // Not sending is the fail-closed part; deleting needs a real opt-out.
          let suppressed: boolean;
          try {
            suppressed = await isEmailSuppressed(email);
          } catch (lookupErr) {
            console.error("[scorecard-complete] suppression lookup failed; skipping the sequence but keeping the row:", lookupErr);
            return;
          }
          if (suppressed) {
            console.log("[scorecard-complete] address is suppressed; releasing the submission row");
            await submissions.delete({ where: { id: submissionId } });
            return;
          }
          await inngest.send({
            name: "nurture/scorecard.complete",
            data: { submissionId, email, name, score },
          });
        } catch (err) {
          console.error(
            `[scorecard-complete] Nurture trigger failed; releasing submission ${submissionId} so a retake can start one:`,
            err
          );
          await submissions.delete({ where: { id: submissionId } });
        }
      });

      sequenceStarted = true;
    } else {
      // Update score on the existing submission (they retook the scorecard)
      await submissions.update({
        where: { id: activeSubmission.id },
        data: { score },
      });
    }

    // ── 3. Send Email 1 immediately (scorecard results), always sent ─────────
    const deliveryResult = await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to: email,
      subject: `Your Franchise Readiness Score: ${Math.min(score, 98)}/100`,
      html: scoreResultsHtml({ name, score, primaryDriver: primaryDriver ?? "", biggestFear: biggestFear ?? "" }),
      text: scoreResultsText({ name, score, primaryDriver: primaryDriver ?? "", biggestFear: biggestFear ?? "" }),
      tags: [{ name: "sequence", value: "scorecard-email-1" }],
    });

    // The Resend SDK resolves with { data, error } rather than rejecting, so an
    // unchecked await reported success for a message that never left.
    if (resendFailed("[scorecard-complete] delivery", deliveryResult)) return deliveryFailed();
    delivered = true;

    // ── Beehiiv subscriber sync ─────────────────────────────────────────────
    // Queued only now. Scheduled earlier it ran even when the results email
    // failed, because after() fires post-response regardless of the status.
    afterResponse("[scorecard-complete] Beehiiv sync", () => subscribeToBeehiiv(email, name));
    await markDelivered("scorecardSubmission", submission.id, "[scorecard-complete]");

    // ── 4. Alert Kelsey for high-score submissions ────────────────────────────
    if (score >= HIGH_SCORE_THRESHOLD) {
      const tier = score >= 70 ? (score >= 85 ? "🔥 Exceptional" : "✅ Strong") : "Solid";
      const slackWebhook = process.env.SLACK_WEBHOOK_URL;

      if (slackWebhook) {
        // Scheduled like the rest of this handler's background work. A dropped
        // alert means Kelsey misses a hot lead, so it must not be a bare
        // unawaited fetch the invocation can be frozen before finishing.
        afterResponse("[scorecard-complete] Slack alert", () =>
          fetch(slackWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*${tier} scorecard submission*: ${firstName} scored *${score}/100*`,
                  },
                },
                {
                  type: "section",
                  fields: [
                    { type: "mrkdwn", text: `*Name:*\n${name}` },
                    { type: "mrkdwn", text: `*Email:*\n${email}` },
                    { type: "mrkdwn", text: `*Score:*\n${score}/100` },
                    { type: "mrkdwn", text: `*Driver:*\n${primaryDriver ?? "-"}` },
                    { type: "mrkdwn", text: `*Biggest fear:*\n${biggestFear ?? "-"}` },
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
          })
        );
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
