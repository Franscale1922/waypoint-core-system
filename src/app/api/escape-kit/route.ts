import { NextResponse } from "next/server";
import { afterResponse } from "@/lib/after-response";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { inngest } from "@/inngest/client";
import { buildUnsubscribeUrl } from "@/lib/nurture-emails";
import { buildEscapeKitEmail } from "@/lib/escape-kit-email";
import { subscribeToBeehiiv } from "@/lib/beehiiv";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
const FROM = "Kelsey at Waypoint <noreply@mail.waypointfranchise.com>";

function loadGuide(): string {
  const filePath = path.join(process.cwd(), "content", "downloads", "corporate-escape-kit.md");
  return fs.readFileSync(filePath, "utf8");
}

export async function POST(req: Request) {
  try {
    const { name, email, articleSlug } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const firstName = name ? name.split(" ")[0] : "there";
    const guideMarkdown = loadGuide();

    // Write download record to DB
    let downloadId: string | null = null;
    try {
      const record = await (prisma as any).escapeKitDownload.create({
        data: {
          email,
          name: name || null,
          articleSlug: articleSlug || null,
        },
      });
      downloadId = record.id;
    } catch (dbErr) {
      console.error("[escape-kit] DB write failed:", dbErr);
    }

    // ── Background work ────────────────────────────────────────────────────
    // All of it runs after the response is flushed, so none of it delays the
    // guide delivery below. See @/lib/after-response for why bare unawaited
    // promises are not safe here.
    afterResponse("[escape-kit] CRM sync", () =>
      notifyCrm({
        name: name || "Website Visitor",
        email,
        source: "Corporate Escape Kit",
        notes: articleSlug ? `Article: ${articleSlug}` : undefined,
      })
    );

    // Skipped for Kelsey's own address (test submissions)
    if (email.toLowerCase() !== TO.toLowerCase()) {
      afterResponse("[escape-kit] Beehiiv sync", () =>
        subscribeToBeehiiv(email, name || undefined)
      );
    }

    if (downloadId && email.toLowerCase() !== TO.toLowerCase()) {
      afterResponse("[escape-kit] Nurture trigger", () =>
        inngest.send({
          name: "nurture/escape-kit.download",
          data: {
            downloadId,
            email,
            name: name || null,
          },
        })
      );
    }

    // Notify Kelsey
    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `Escape Kit download: ${name || email}`,
      text: [
        `Name:    ${name || "Not provided"}`,
        `Email:   ${email}`,
        `Source:  ${articleSlug || "escape-kit page"}`,
        ``,
        `Hit reply to follow up directly.`,
      ].join("\n"),
    });

    // Send guide to subscriber
    if (email.toLowerCase() !== TO.toLowerCase()) {
      const unsubUrl = downloadId
        ? buildUnsubscribeUrl(downloadId)
        : `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.waypointfranchise.com"}/unsubscribe`;

      const htmlBody = buildEscapeKitEmail({
        firstName,
        guideMarkdown,
        unsubscribeUrl: unsubUrl,
      });

      await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: TO,
        subject: "The Corporate Escape Kit: your guide is inside",
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        html: htmlBody,
        text: [
          `Hi ${firstName},`,
          ``,
          `Here is The Corporate Escape Kit: Financial Safety Nets of Franchising vs. W2.`,
          ``,
          guideMarkdown,
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
    console.error("[escape-kit]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
