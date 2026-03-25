import { NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "../../../lib/prisma";
import fs from "fs";
import path from "path";
import { inngest } from "@/inngest/client";
import { buildUnsubscribeUrl } from "@/lib/nurture-emails";
import { parseChecklistMarkdown, buildChecklistEmail } from "@/lib/checklist-email";
import { subscribeToBeehiiv } from "@/lib/beehiiv";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
const FROM = "Kelsey at Waypoint <noreply@mail.waypointfranchise.com>";

/**
 * Maps a checklistSlug to its file in content/downloads/.
 * Add new entries here as new industry-specific checklists are created.
 */
const CHECKLIST_FILES: Record<string, string> = {
  "universal": "universal-franchise-readiness-checklist.md",
  "food-and-beverage": "food-franchise-readiness-checklist.md",
  "home-services": "home-services-franchise-readiness-checklist.md",
  "fitness-wellness": "fitness-wellness-franchise-readiness-checklist.md",
  "senior-care": "senior-care-franchise-readiness-checklist.md",
  "b2b": "b2b-franchise-readiness-checklist.md",
};

function loadChecklist(slug: string): string {
  const filename = CHECKLIST_FILES[slug] ?? CHECKLIST_FILES["universal"];
  const filePath = path.join(process.cwd(), "content", "downloads", filename);
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
const CHECKLIST_LABELS: Record<string, string> = {
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

    const slug = checklistSlug || "universal";
    const firstName = name ? name.split(" ")[0] : "there";
    const checklistContent = loadChecklist(slug);
    const checklistLabel = CHECKLIST_LABELS[slug] ?? "Franchise Readiness";

    // Write a lead record — ChecklistDownload is separate from the cold-outreach Lead model
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

    // Beehiiv subscriber sync — fire-and-forget, skipped for Kelsey's own address
    if (email.toLowerCase() !== TO.toLowerCase()) {
      subscribeToBeehiiv(email, name || undefined).catch(() => {});
    }

    // Fire the nurture sequence — fire-and-forget, does not block checklist delivery
    // Skip for Kelsey's own address (test submissions)
    if (downloadId && email.toLowerCase() !== TO.toLowerCase()) {
      try {
        await inngest.send({
          name: "nurture/checklist.download",
          data: {
            downloadId,
            email,
            name: name || null,
            checklistType: slug,
            articleSlug: articleSlug || null,
          },
        });
      } catch (nurtureErr) {
        // Non-fatal — checklist delivery succeeds regardless
        console.error("[capture-email] Nurture trigger failed:", nurtureErr);
      }
    }

    // Notify Kelsey
    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `Checklist download — ${checklistLabel}`,
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
          // RFC 8058 one-click unsubscribe — the #1 inbox provider trust signal
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
