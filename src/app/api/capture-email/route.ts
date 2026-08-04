import { NextResponse } from "next/server";
import { afterResponse } from "@/lib/after-response";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";
import prisma from "../../../lib/prisma";
import fs from "fs";
import path from "path";
import { inngest } from "@/inngest/client";
import { buildUnsubscribeLink } from "@/lib/nurture-emails";
import { parseChecklistMarkdown, buildChecklistEmail } from "@/lib/checklist-email";
import { subscribeToBeehiiv } from "@/lib/beehiiv";
import { isEmailSuppressedFailClosed } from "@/lib/email-suppression";
import { guardCapture, resendFailed, markDelivered, deliveryFailed } from "@/lib/lead-capture";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
const FROM = "Kelsey at Waypoint <noreply@mail.waypointfranchise.com>";
const LABEL = "[capture-email]";
const MODEL = "checklistDownload";

/**
 * Maps a checklistSlug to its file in content/downloads/.
 * Add new entries here as new industry-specific checklists are created.
 */
const CHECKLIST_FILES = {
  "universal": "universal-franchise-readiness-checklist.md",
  "food-and-beverage": "food-franchise-readiness-checklist.md",
  "home-services": "home-services-franchise-readiness-checklist.md",
  "fitness-wellness": "fitness-wellness-franchise-readiness-checklist.md",
  "senior-care": "senior-care-franchise-readiness-checklist.md",
  "b2b": "b2b-franchise-readiness-checklist.md",
} as const;

type ChecklistSlug = keyof typeof CHECKLIST_FILES;

/**
 * Collapses whatever arrived in the body to a slug we actually publish.
 *
 * This is a guard, not a convenience. `checklistType` scopes the idempotency
 * key, so storing an unrecognised slug verbatim would let a caller mint a fresh
 * key per request ("universal", "universal2", "zzz") and walk straight around
 * the duplicate-delivery check while being sent the very same universal
 * checklist every time. Unknown slugs have to converge here.
 */
function resolveChecklistSlug(raw: unknown): ChecklistSlug {
  return typeof raw === "string" && raw in CHECKLIST_FILES ? (raw as ChecklistSlug) : "universal";
}

function loadChecklist(slug: ChecklistSlug): string {
  const filePath = path.join(process.cwd(), "content", "downloads", CHECKLIST_FILES[slug]);
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    // Fallback to universal if file is missing
    const fallback = path.join(process.cwd(), "content", "downloads", CHECKLIST_FILES["universal"]);
    return fs.readFileSync(fallback, "utf8");
  }
}

/**
 * Human-readable label for Kelsey's notification email.
 */
const CHECKLIST_LABELS: Record<ChecklistSlug, string> = {
  "universal": "Universal Franchise Readiness",
  "food-and-beverage": "Food & Beverage",
  "home-services": "Home Services",
  "fitness-wellness": "Fitness & Wellness",
  "senior-care": "Senior Care",
  "b2b": "B2B Franchise",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, source, checklistSlug, articleSlug } = body;

    const slug = resolveChecklistSlug(checklistSlug);

    // Rate limits, address validation and duplicate suppression, before this
    // request is allowed to write a row or send anything. See @/lib/lead-capture.
    const guard = await guardCapture({
      req,
      route: "capture-email",
      email: body.email,
      idempotency: { model: MODEL, where: { checklistType: slug } },
    });
    if (!guard.proceed) return guard.response;
    const email = guard.email;

    const firstName = name ? String(name).split(" ")[0] : "there";
    const checklistContent = loadChecklist(slug);
    const checklistLabel = CHECKLIST_LABELS[slug];
    const isKelsey = email === TO.toLowerCase();

    // Write a lead record. ChecklistDownload is separate from the cold-outreach Lead model
    let downloadId: string | null = null;
    try {
      const record = await prisma.checklistDownload.create({
        data: {
          email,
          name: name || null,
          articleSlug: articleSlug || null,
          checklistType: slug,
        },
      });
      downloadId = record.id;
    } catch (dbErr) {
      // Log but don't block email delivery if DB write fails
      console.error(`${LABEL} DB write failed:`, dbErr);
    }

    // ── Background work ────────────────────────────────────────────────────
    // All of it runs after the response is flushed, so none of it delays the
    // checklist email below. See @/lib/after-response for why bare unawaited
    // promises are not safe here.
    afterResponse(`${LABEL} CRM sync`, () =>
      notifyCrm({
        name: name || "Website Visitor",
        email,
        source: `Checklist Download: ${checklistLabel}`,
        notes: [articleSlug ? `Article: ${articleSlug}` : null, source ? `Widget: ${source}` : null]
          .filter(Boolean)
          .join(" · ") || undefined,
      })
    );

    // Skipped for Kelsey's own address (test submissions)
    if (!isKelsey) {
      afterResponse(`${LABEL} Beehiiv sync`, () => subscribeToBeehiiv(email, name || undefined));
    }

    // Notify Kelsey. Best-effort on purpose: the visitor is not the right person
    // to fail for a missing internal notification, so this is logged, not raised.
    const notifyResult = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `Checklist download: ${checklistLabel}`,
      text: [
        `Name:      ${name || "Not provided"}`,
        `Email:     ${email}`,
        `Checklist: ${checklistLabel}`,
        ``,
        `Article: ${articleSlug || "resources page"}`,
        ``,
        `Hit reply to follow up directly.`,
      ].join("\n"),
    });
    resendFailed(`${LABEL} notify`, notifyResult);

    // Send checklist to subscriber
    if (!isKelsey) {
      // Degrades to a mailto when the DB write above failed, rather than the old
      // `${site}/unsubscribe`, a path with no handler, so the one email
      // guaranteed to go out during an outage carried a dead opt-out link.
      const unsub = buildUnsubscribeLink(downloadId, "checklist");

      // Build the branded HTML version from the parsed checklist markdown
      const parsed = parseChecklistMarkdown(checklistContent);
      const htmlBody = buildChecklistEmail({
        firstName,
        checklistLabel,
        parsed,
        unsubscribeUrl: unsub.url,
      });

      const deliveryResult = await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: TO,
        subject: `Your ${checklistLabel} Checklist`,
        headers: unsub.headers,
        html: htmlBody,
        text: [
          `Hi ${firstName},`,
          ``,
          `Here is your ${checklistLabel} checklist. View this email in an HTML-capable mail client for the best experience.`,
          ``,
          checklistContent,
          ``,
          `---`,
          `Reply to this email if you have questions. I read everything.`,
          ``,
          `Kelsey`,
          `Waypoint Franchise Advisors`,
          `P.O. Box 3421, Whitefish, MT 59937`,
          `waypointfranchise.com`,
          ``,
          `To unsubscribe: ${unsub.url}`,
        ].join("\n"),
      });

      // The whole point of the request. Reporting success on a failed send is
      // what left people watching an inbox that was never going to receive it.
      if (resendFailed(`${LABEL} delivery`, deliveryResult)) return deliveryFailed();

      // Arms idempotency, and only now: keyed on delivery rather than on the row
      // existing, so the retry after a failed send is not suppressed.
      if (downloadId) await markDelivered(MODEL, downloadId, LABEL);

      // Scheduled only after the checklist actually went out. No drip for an
      // address that never received the thing it signed up for. Suppression is
      // checked by ADDRESS, so an opt-out recorded on any other list stops this
      // sequence too, which is the guarantee the unsubscribe link implies.
      if (downloadId) {
        const recordId = downloadId;
        afterResponse(`${LABEL} Nurture trigger`, async () => {
          if (await isEmailSuppressedFailClosed(email)) {
            console.log(`${LABEL} address is suppressed; no nurture sequence started`);
            return;
          }
          await inngest.send({
            name: "nurture/checklist.download",
            data: {
              downloadId: recordId,
              email,
              name: name || null,
              checklistType: slug,
              articleSlug: articleSlug || null,
            },
          });
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(LABEL, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
