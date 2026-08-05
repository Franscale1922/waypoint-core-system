import { NextResponse } from "next/server";
import { afterResponse } from "@/lib/after-response";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { ArchetypeSchema } from "@/app/lib/schemas";
import { buildUnsubscribeLink } from "@/lib/nurture-emails";
import { isEmailSuppressed } from "@/lib/email-suppression";
import { guardCapture, resendFailed, markDelivered, deliveryFailed } from "@/lib/lead-capture";

const resend = new Resend(process.env.RESEND_API_KEY);
// FROM uses the verified mail.waypointfranchise.com subdomain (apex is reserved for Google Workspace receiving).
// REPLY_TO uses the apex so any replies land in Kelsey's Gmail inbox.
const FROM = "Kelsey Stuart <kelsey@mail.waypointfranchise.com>";
const REPLY_TO = "kelsey@waypointfranchise.com";

/**
 * Escapes a caller-supplied value for interpolation into the HTML email below.
 *
 * The quiz endpoint is public and takes the recipient address in the same body
 * as the archetype text, so without this a caller could have Waypoint deliver
 * arbitrary markup and links to a victim, from Waypoint's verified sending
 * domain. The schema also bounds these fields; this is the half that makes the
 * content inert rather than merely short.
 */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = ArchetypeSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, archetype, archetypeName, strongFits, weakFits } = parsed.data;

    // Rate limits and address normalization. No idempotency key: a retake can
    // yield a different archetype, and that result is what the visitor is
    // waiting to read. The per-address limit is what bounds abuse here.
    const guard = await guardCapture({
      req,
      route: "archetype-complete",
      email: parsed.data.email,
    });
    if (!guard.proceed) return guard.response;
    const email = guard.email;

    // ── 1. Upsert lead in DB ──────────────────────────────────────────────────
    const existing = await prisma.lead.findFirst({ where: { email } });

    const lead = existing
      ? await prisma.lead.update({
          where: { id: existing.id },
          data: {
            franchiseAngle: `Archetype: ${archetypeName} | Fits: ${strongFits.slice(0, 2).join(", ")}`,
            status: "SEQUENCED",
          },
        })
      : await prisma.lead.create({
          data: {
            name,
            email,
            franchiseAngle: `Archetype: ${archetypeName} | Fits: ${strongFits.slice(0, 2).join(", ")}`,
            status: "SEQUENCED",
          },
        });

    // ── 2. CRM sync ───────────────────────────────────────────────────────────
    // Runs after the response is flushed, so it never delays the confirmation
    // email. See @/lib/after-response for why a bare unawaited promise is unsafe.
    afterResponse("[archetype-complete] CRM sync", () =>
      notifyCrm({
        name,
        email,
        source: "Franchise Archetype Quiz",
        notes: `Archetype: ${archetypeName} | Strong fits: ${strongFits.slice(0, 3).join(", ")}`,
      })
    );

    // ── 2b. Deduplicate: only start a new nurture sequence if none is active ──
    // Mirrors scorecard pattern. Prevents double-emails if someone retakes the
    // quiz. "Active" = not completed and not unsubscribed.
    // One cast for this model instead of four: the Prisma client types are
    // regenerated on deploy and do not yet know these fields locally.
    const submissions = (prisma as any).archetypeSubmission;

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
    // response is flushed and so sees whatever the confirmation send set it to.
    // Without it a failed delivery returned 500 to the visitor and started the
    // drip regardless, because after() had already been handed the callback:
    // Day-3 marketing for a result they never received.
    let delivered = false;

    if (!activeSubmission) {
      submission = await submissions.create({
        data: {
          email,
          name,
          archetype,
          archetypeName,
          strongFits,
          weakFits,
        },
      });

      // Scheduled, not awaited: the confirmation email below is the thing the
      // user is waiting on, and it must not be blocked by the Inngest
      // round-trip. This used to be an unguarded `await`, so an Inngest hiccup
      // returned a 500 and sent no confirmation at all.
      //
      // On failure the row created just above is deleted, and that compensation
      // is load-bearing. The dedup query matches any row with nurtureCompletedAt
      // null and unsubscribed false, so an orphan left by a failed send makes
      // every future retake take the "already active" branch: that address could
      // never start a sequence again. The lead row keeps the archetype either way.
      const submissionId = submission.id;
      afterResponse("[archetype-complete] Nurture trigger", async () => {
        try {
          if (!delivered) {
            console.error("[archetype-complete] delivery failed; releasing the submission row instead of starting a sequence");
            await submissions.delete({ where: { id: submissionId } });
            return;
          }
          // An opt-out on ANY list belongs to this person and stops the sequence
          // before it starts. The confirmation email above still goes out.
          // isEmailSuppressedFailClosed cannot distinguish "this person opted
          // out" from "the lookup failed", so it must not be what decides to
          // DESTROY the row: a transient read error would erase the quiz answers.
          // Not sending is the fail-closed part; deleting needs a real opt-out.
          let suppressed: boolean;
          try {
            suppressed = await isEmailSuppressed(email);
          } catch (lookupErr) {
            console.error("[archetype-complete] suppression lookup failed; skipping the sequence but keeping the row:", lookupErr);
            return;
          }
          if (suppressed) {
            console.log("[archetype-complete] address is suppressed; releasing the submission row");
            await submissions.delete({ where: { id: submissionId } });
            return;
          }
          await inngest.send({
            name: "nurture/archetype.complete",
            data: { submissionId, email, name, archetype },
          });
        } catch (err) {
          console.error(
            `[archetype-complete] Nurture trigger failed; releasing submission ${submissionId} so a retake can start one:`,
            err
          );
          await submissions.delete({ where: { id: submissionId } });
        }
      });

      sequenceStarted = true;
    } else {
      // Update archetype on existing submission (they retook the quiz)
      await submissions.update({
        where: { id: activeSubmission.id },
        data: { archetype, archetypeName, strongFits, weakFits },
      });
    }

    // ── 3. Send confirmation email (Day 0) ───────────────────────────────────
    // Uses HMAC unsubscribe URL keyed to the archetypeSubmission.id so the
    // unsubscribe link is signed and 1-click compliant. Mirrors scorecard pattern.
    const strongFitsText = strongFits.map(esc).join(", ");
    const weakFitsText = weakFits.map(esc).join(", ");
    const safeArchetypeName = esc(archetypeName);
    const safeFirstName = esc(name.split(" ")[0]);
    // The plain-text alternative is not HTML, so it takes the raw values: an
    // escaped "&" would render as "&amp;" to the reader. A header, though, is
    // neither, and a newline in a subject is header injection.
    const firstName = name.split(" ")[0];
    const plainStrongFits = strongFits.join(", ");
    const plainWeakFits = weakFits.join(", ");
    const subjectName = archetypeName.replace(/[\r\n]+/g, " ");

    // Was a local IIFE whose no-secret branch returned `/unsubscribe`, a path
    // with no handler. The shared builder degrades to a mailto instead, so the
    // opt-out in this email always resolves to something that works.
    const unsub = buildUnsubscribeLink(submission.id, "archetype");
    const unsubscribeUrl = unsub.url;

    const deliveryResult = await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to: email,
      subject: `Your Franchise Archetype: ${subjectName}`,
      headers: unsub.headers,
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <p style="font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Your Franchise Archetype</p>
          <h1 style="font-size: 28px; margin: 0 0 8px; color: #1b3a5f;">${safeArchetypeName}</h1>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
          <p>${safeFirstName},</p>
          <p>Based on how you answered, your franchise archetype is <strong>${safeArchetypeName}</strong>.</p>
          <p style="margin: 20px 0 8px; font-weight: bold; color: #1b3a5f;">Industries that tend to fit you:</p>
          <p style="color: #2d7a4f;">${strongFitsText}</p>
          <p style="margin: 20px 0 8px; font-weight: bold; color: #1b3a5f;">Industries that often don't align:</p>
          <p style="color: #888;">${weakFitsText}</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p>I'll follow up over the next week with a few more notes specific to your archetype. If you want to skip ahead and talk through what this means for your situation, my calendar is open.</p>
          <p style="margin-top: 24px;">
            <a href="https://waypointfranchise.com/book" style="background: #CC6535; color: #0c1929; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Book a Free Call</a>
          </p>
          <p style="margin-top: 28px; color: #888; font-size: 14px;">Kelsey<br/>Waypoint Franchise Advisors</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="font-size: 11px; color: #aaa;">Waypoint Franchise Advisors · P.O. Box 3421, Whitefish, MT 59937. You received this because you completed the Franchise Archetype Quiz at waypointfranchise.com. <a href="${unsubscribeUrl}" style="color: #aaa;">Unsubscribe</a></p>
        </div>
      `,
      text: `Your Franchise Archetype: ${subjectName}\n\n${firstName},\n\nBased on how you answered, your franchise archetype is ${archetypeName}.\n\nIndustries that tend to fit you: ${plainStrongFits}\nIndustries that often don't align: ${plainWeakFits}\n\nI'll follow up over the next week with a few more notes specific to your archetype. If you want to skip ahead, book a free call at waypointfranchise.com/book.\n\nKelsey\nWaypoint Franchise Advisors\n\n---\nWaypoint Franchise Advisors\nP.O. Box 3421, Whitefish, MT 59937\nTo stop receiving these notes: ${unsubscribeUrl}`,
      tags: [{ name: "sequence", value: "archetype-email-1" }],
    });

    // The Resend SDK resolves with { data, error } rather than rejecting, so an
    // unchecked await reported success for a message that never left.
    if (resendFailed("[archetype-complete] delivery", deliveryResult)) return deliveryFailed();
    delivered = true;
    await markDelivered("archetypeSubmission", submission.id, "[archetype-complete]");

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      submissionId: submission.id,
      archetype,
      sequenceStarted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[archetype-complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
