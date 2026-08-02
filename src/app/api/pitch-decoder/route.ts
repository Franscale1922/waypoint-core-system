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
const DOWNLOAD_URL = `${SITE}/downloads/franchise-pitch-decoder.pdf`;

// HMAC unsubscribe URL for the pitch-decoder list (mirrors buildUnsubscribeUrl).
function pitchDecoderUnsubUrl(downloadId: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return `${SITE}/unsubscribe`;
  const token = crypto.createHmac("sha256", secret).update(downloadId).digest("hex");
  return `${SITE}/api/pitch-decoder-unsubscribe?id=${downloadId}&token=${token}`;
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
      const record = await (prisma as any).pitchDecoderDownload.create({
        data: {
          email,
          name: name || null,
          articleSlug: articleSlug || null,
        },
      });
      downloadId = record.id;
    } catch (dbErr) {
      console.error("[pitch-decoder] DB write failed:", dbErr);
    }

    // ── CRM sync (fire-and-forget) ─────────────────────────────────────────
    notifyCrm({
      name: name || "Website Visitor",
      email,
      source: "Franchise Pitch Decoder",
      notes: articleSlug ? `Article: ${articleSlug}` : undefined,
    });

    // Beehiiv subscriber sync (fire-and-forget), skipped for Kelsey's own address
    if (email.toLowerCase() !== TO.toLowerCase()) {
      subscribeToBeehiiv(email, name || undefined).catch(() => {});
    }

    // Fire the nurture sequence after the response is flushed, so the Inngest
    // round-trip never delays the delivery email below. Scheduling is itself
    // guarded: after() throws synchronously when the platform supplies no
    // waitUntil, and a nurture failure must never break delivery.
    if (downloadId && email.toLowerCase() !== TO.toLowerCase()) {
      try {
        after(async () => {
          try {
            await inngest.send({
              name: "nurture/pitch-decoder.download",
              data: {
                downloadId,
                email,
                name: name || null,
              },
            });
          } catch (nurtureErr) {
            console.error("[pitch-decoder] Nurture trigger failed:", nurtureErr);
          }
        });
      } catch (scheduleErr) {
        console.error("[pitch-decoder] Nurture scheduling failed:", scheduleErr);
      }
    }

    // Notify Kelsey
    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `Pitch Decoder download: ${name || email}`,
      text: [
        `Name:    ${name || "Not provided"}`,
        `Email:   ${email}`,
        `Source:  ${articleSlug || "pitch-decoder page"}`,
        ``,
        `Hit reply to follow up directly.`,
      ].join("\n"),
    });

    // Send the download to the subscriber
    if (email.toLowerCase() !== TO.toLowerCase()) {
      const unsubUrl = downloadId
        ? pitchDecoderUnsubUrl(downloadId)
        : `${SITE}/unsubscribe`;

      const htmlBody = buildPdfMagnetEmail({
        firstName,
        kicker: "Your Download",
        title: "The Franchise Pitch Decoder",
        subtitle: "Hear what a pitch is really saying",
        intro: [
          "Here is the Pitch Decoder you asked for. It is a short reference for listening to a franchise pitch and noticing what is being said, what is being skipped, and the one question that tends to surface the rest.",
          "It works on any business someone is selling you, not just franchises. Keep it nearby the next time you sit across from a sales table.",
        ],
        downloadUrl: DOWNLOAD_URL,
        downloadLabel: "Download the Pitch Decoder",
        preHeader: "Your Franchise Pitch Decoder is inside.",
        unsubscribeUrl: unsubUrl,
      });

      await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: TO,
        subject: "The Franchise Pitch Decoder: your download is inside",
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        html: htmlBody,
        text: [
          `Hi ${firstName},`,
          ``,
          `Here is the Franchise Pitch Decoder you asked for. It is a short reference for hearing what a franchise pitch is really saying, and the one question that tends to surface the rest.`,
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
    console.error("[pitch-decoder]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
