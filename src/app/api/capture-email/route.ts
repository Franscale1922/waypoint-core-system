import { NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "../../../lib/prisma";
import fs from "fs";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
const FROM = "Waypoint Website <noreply@mail.waypointfranchise.com>";

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
    try {
      await prisma.checklistDownload.create({
        data: {
          email,
          name: name || null,
          articleSlug: articleSlug || null,
          checklistType: slug,
        },
      });
    } catch (dbErr) {
      // Log but don't block email delivery if DB write fails
      console.error("[capture-email] DB write failed:", dbErr);
    }

    // Notify Kelsey
    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `New checklist download — ${checklistLabel} (${name || email})`,
      text: [
        `New checklist download`,
        ``,
        `Name: ${name || "Not provided"}`,
        `Email: ${email}`,
        `Checklist: ${checklistLabel}`,
        `Article: ${articleSlug || source || "resources"}`,
        ``,
        `---`,
        `Sent from waypointfranchise.com`,
      ].join("\n"),
    });

    // Send checklist to subscriber
    if (email.toLowerCase() !== TO.toLowerCase()) {
      await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: TO,
        subject: `Your ${checklistLabel} Checklist`,
        text: [
          `Hi ${firstName},`,
          ``,
          `Here is the checklist I use before any first conversation in this category.`,
          ``,
          checklistContent,
          ``,
          `---`,
          `Reply to this email if you have questions. I read everything.`,
          ``,
          `Kelsey`,
          `Waypoint Franchise Advisors`,
          `waypointfranchise.com`,
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
