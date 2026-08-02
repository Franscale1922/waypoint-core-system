import { NextResponse, after } from "next/server";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { inngest } from "@/inngest/client";
import { buildPdfMagnetEmail } from "@/lib/pdf-magnet-email";
import { subscribeToBeehiiv } from "@/lib/beehiiv";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
const FROM = "Kelsey at Waypoint <noreply@mail.waypointfranchise.com>";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.waypointfranchise.com";
const DOWNLOAD_URL = `${SITE}/downloads/ai-paperwork-reader.pdf`;

// HMAC unsubscribe URL for the ai-fdd-reader list (mirrors buildUnsubscribeUrl).
function aiFddReaderUnsubUrl(downloadId: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return `${SITE}/unsubscribe`;
  const token = crypto.createHmac("sha256", secret).update(downloadId).digest("hex");
  return `${SITE}/api/ai-fdd-reader-unsubscribe?id=${downloadId}&token=${token}`;
}

export async function POST(req: Request) {
  try {
    const { name, email, articleSlug } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const firstName = name ? name.split(" ")[0] : "there";

    // Write download record to DB
    let downloadId: string | null = null;
    try {
      const record = await (prisma as any).aiFddReaderDownload.create({
        data: {
          email,
          name: name || null,
          articleSlug: articleSlug || null,
        },
      });
      downloadId = record.id;
    } catch (dbErr) {
      console.error("[ai-fdd-reader] DB write failed:", dbErr);
    }

    // ── CRM sync (fire-and-forget) ─────────────────────────────────────────
    notifyCrm({
      name: name || "Website Visitor",
      email,
      source: "AI Paperwork Reader",
      notes: articleSlug ? `Article: ${articleSlug}` : undefined,
    });

    // Beehiiv subscriber sync (fire-and-forget), skipped for Kelsey's own address
    if (email.toLowerCase() !== TO.toLowerCase()) {
      subscribeToBeehiiv(email, name || undefined).catch(() => {});
    }

    // Fire the nurture sequence after the response is flushed, so the Inngest
    // round-trip never delays the delivery email below.
    if (downloadId && email.toLowerCase() !== TO.toLowerCase()) {
      const nurtureDownloadId = downloadId;
      after(async () => {
        try {
          await inngest.send({
            name: "nurture/ai-fdd-reader.download",
            data: {
              downloadId: nurtureDownloadId,
              email,
              name: name || null,
            },
          });
        } catch (nurtureErr) {
          // Non-fatal: delivery already succeeded
          console.error("[ai-fdd-reader] Nurture trigger failed:", nurtureErr);
        }
      });
    }

    // Notify Kelsey
    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `AI Paperwork Reader download: ${name || email}`,
      text: [
        `Name:    ${name || "Not provided"}`,
        `Email:   ${email}`,
        `Source:  ${articleSlug || "ai-fdd-reader page"}`,
        ``,
        `Hit reply to follow up directly.`,
      ].join("\n"),
    });

    // Send the download to the subscriber
    if (email.toLowerCase() !== TO.toLowerCase()) {
      const unsubUrl = downloadId
        ? aiFddReaderUnsubUrl(downloadId)
        : `${SITE}/unsubscribe`;

      const htmlBody = buildPdfMagnetEmail({
        firstName,
        kicker: "Your Download",
        title: "The AI Paperwork Reader",
        subtitle: "Put AI to work on the FDD",
        intro: [
          "Here is the AI Paperwork Reader you asked for. It is a copy-paste prompt pack for putting AI to work reading the FDD, the Franchise Disclosure Document, which is the legal packet a franchise gives you before you sign.",
          "Paste the prompts into the AI tool you already use and let it pull the long document into plain summaries. The AI assists the read. It does not replace your attorney.",
        ],
        downloadUrl: DOWNLOAD_URL,
        downloadLabel: "Download the Prompt Pack",
        preHeader: "Your AI Paperwork Reader prompt pack is inside.",
        unsubscribeUrl: unsubUrl,
      });

      await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: TO,
        subject: "The AI Paperwork Reader: your download is inside",
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        html: htmlBody,
        text: [
          `Hi ${firstName},`,
          ``,
          `Here is the AI Paperwork Reader you asked for. It is a copy-paste prompt pack for using AI to read the FDD, the Franchise Disclosure Document, the legal packet a franchise gives you before you sign. The AI assists. It does not replace your attorney.`,
          ``,
          `Download it here: ${DOWNLOAD_URL}`,
          ``,
          `If you want a second set of eyes on what you find, you can book a free call at https://waypointfranchise.com/book.`,
          ``,
          `Kelsey,`,
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
    console.error("[ai-fdd-reader]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
