import { NextResponse } from "next/server";
import { afterResponse } from "@/lib/after-response";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";
import prisma from "../../../lib/prisma";
import fs from "fs";
import path from "path";
import { inngest } from "@/inngest/client";
import { buildUnsubscribeUrl } from "@/lib/nurture-emails";
import { parseChecklistMarkdown, buildChecklistEmail } from "@/lib/checklist-email";
import { subscribeToBeehiiv } from "@/lib/beehiiv";
import { resolveChecklistSlug, type ChecklistSlug } from "@/lib/checklists";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
const FROM = "Kelsey at Waypoint <noreply@mail.waypointfranchise.com>";

/**
 * Maps a checklistSlug to its file in content/downloads/.
 * Add new entries here as new industry-specific checklists are created.
 * The Record<ChecklistSlug, ...> keeps this map and CHECKLIST_SLUGS from
 * drifting: adding a slug to one without the other is now a type error.
 */
const CHECKLIST_FILES: Record<ChecklistSlug, string> = {
  "universal": "universal-franchise-readiness-checklist.md",
  "food-and-beverage": "food-franchise-readiness-checklist.md",
  "home-services": "home-services-franchise-readiness-checklist.md",
  "fitness-wellness": "fitness-wellness-franchise-readiness-checklist.md",
  "senior-care": "senior-care-franchise-readiness-checklist.md",
  "b2b": "b2b-franchise-readiness-checklist.md",
};

function loadChecklist(slug: ChecklistSlug): string {
  const filePath = path.join(process.cwd(), "content", "downloads", CHECKLIST_FILES[slug]);
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    // Fallback to universal if the mapped file is missing on disk.
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
    const { name, email, source, checklistSlug, articleSlug } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Resolved ONCE and reused for the file, the label, and what gets
    // persisted. Previously an unknown non-empty slug (a typo, or a value a
    // component sends that was never added to CHECKLIST_FILES) passed through
    // untouched: the universal file was delivered under the fallback label
    // "Franchise Readiness", while the raw bogus string was written to
    // ChecklistDownload.checklistType, and the caller still saw success. The
    // resolved slug is what all three downstream calls now agree on.
    const slug = resolveChecklistSlug(checklistSlug);
    const firstName = name ? name.split(" ")[0] : "there";
    const checklistContent = loadChecklist(slug);
    const checklistLabel = CHECKLIST_LABELS[slug];

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
      console.error("[capture-email] DB write failed:", dbErr);
    }

    // ── Background work ────────────────────────────────────────────────────
    // All of it runs after the response is flushed, so none of it delays the
    // checklist email below. See @/lib/after-response for why bare unawaited
    // promises are not safe here.
    afterResponse("[capture-email] CRM sync", () =>
      notifyCrm({
        name: name || "Website Visitor",
        email,
        source: `Checklist Download: ${checklistLabel}`,
        notes: articleSlug ? `Article: ${articleSlug}` : undefined,
      })
    );

    // Skipped for Kelsey's own address (test submissions)
    if (email.toLowerCase() !== TO.toLowerCase()) {
      afterResponse("[capture-email] Beehiiv sync", () =>
        subscribeToBeehiiv(email, name || undefined)
      );
    }

    if (downloadId && email.toLowerCase() !== TO.toLowerCase()) {
      afterResponse("[capture-email] Nurture trigger", () =>
        inngest.send({
          name: "nurture/checklist.download",
          data: {
            downloadId,
            email,
            name: name || null,
            checklistType: slug,
            articleSlug: articleSlug || null,
          },
        })
      );
    }

    // Notify Kelsey
    await resend.emails.send({
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

    // Send checklist to subscriber
    if (email.toLowerCase() !== TO.toLowerCase()) {
      // Build unsubscribe URL for the List-Unsubscribe header.
      // Falls back gracefully if downloadId is null (DB write failed upstream).
      const unsubUrl = downloadId
        ? buildUnsubscribeUrl(downloadId)
        : `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.waypointfranchise.com"}/unsubscribe`;

      // Build the branded HTML version from the parsed checklist markdown
      const parsed = parseChecklistMarkdown(checklistContent);
      const htmlBody = buildChecklistEmail({
        firstName,
        checklistLabel,
        parsed,
        unsubscribeUrl: unsubUrl,
      });

      await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: TO,
        subject: `Your ${checklistLabel} Checklist`,
        headers: {
          // RFC 8058 one-click unsubscribe: the #1 inbox provider trust signal
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
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
          `To unsubscribe: ${unsubUrl}`,
        ].join("\n"),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[capture-email]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
