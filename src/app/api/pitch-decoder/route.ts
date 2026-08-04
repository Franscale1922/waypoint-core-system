import { NextResponse } from "next/server";
import { afterResponse } from "@/lib/after-response";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { buildPdfMagnetEmail } from "@/lib/pdf-magnet-email";
import { subscribeToBeehiiv } from "@/lib/beehiiv";
import { buildUnsubscribeLink } from "@/lib/nurture-emails";
import { isEmailSuppressedFailClosed } from "@/lib/email-suppression";
import { guardCapture, resendFailed, markDelivered, deliveryFailed } from "@/lib/lead-capture";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
const FROM = "Kelsey at Waypoint <noreply@mail.waypointfranchise.com>";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.waypointfranchise.com";
const DOWNLOAD_URL = `${SITE}/downloads/franchise-pitch-decoder.pdf`;

const LABEL = "[pitch-decoder]";
const MODEL = "pitchDecoderDownload";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, articleSlug } = body;

    // Rate limits, address validation and duplicate suppression, before this
    // request is allowed to write a row or send anything. See @/lib/lead-capture.
    const guard = await guardCapture({
      req,
      route: "pitch-decoder",
      email: body.email,
      idempotency: { model: MODEL },
    });
    if (!guard.proceed) return guard.response;
    const email = guard.email;

    const firstName = name ? String(name).split(" ")[0] : "there";
    const isKelsey = email === TO.toLowerCase();

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
      console.error(`${LABEL} DB write failed:`, dbErr);
    }

    // ── Background work ────────────────────────────────────────────────────
    // All of it runs after the response is flushed, so none of it delays the
    // delivery email below. See @/lib/after-response for why bare unawaited
    // promises are not safe here.
    afterResponse(`${LABEL} CRM sync`, () =>
      notifyCrm({
        name: name || "Website Visitor",
        email,
        source: "Franchise Pitch Decoder",
        notes: articleSlug ? `Article: ${articleSlug}` : undefined,
      })
    );

    // Skipped for Kelsey's own address (test submissions)
    if (!isKelsey) {
      afterResponse(`${LABEL} Beehiiv sync`, () =>
        subscribeToBeehiiv(email, name || undefined)
      );
    }

    // Notify Kelsey. Best-effort: logged, never raised to the visitor.
    const notifyResult = await resend.emails.send({
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
    resendFailed(`${LABEL} notify`, notifyResult);

    // Send the download to the subscriber
    if (!isKelsey) {
      // Degrades to a mailto when the DB write failed, rather than the old
      // `${SITE}/unsubscribe`, a path with no handler at all, so the one email
      // guaranteed to go out during an outage carried a dead opt-out link.
      const unsub = buildUnsubscribeLink(downloadId, "pitch-decoder");
      const unsubUrl = unsub.url;

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

      const deliveryResult = await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: TO,
        subject: "The Franchise Pitch Decoder: your download is inside",
        headers: unsub.headers,
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

      // The whole point of the request. Reporting success on a failed send is
      // what left people watching an inbox that was never going to receive it.
      if (resendFailed(`${LABEL} delivery`, deliveryResult)) return deliveryFailed();

      // Arms idempotency, and only now: keyed on delivery rather than on the row
      // existing, so the retry after a failed send is not suppressed.
      if (downloadId) await markDelivered(MODEL, downloadId, LABEL);

      // Scheduled only after the download actually went out, and skipped for an
      // address that opted out on ANY list, which is what the link implies.
      if (downloadId) {
        const recordId = downloadId;
        afterResponse(`${LABEL} Nurture trigger`, async () => {
          if (await isEmailSuppressedFailClosed(email)) {
            console.log(`${LABEL} address is suppressed; no nurture sequence started`);
            return;
          }
          await inngest.send({
            name: "nurture/pitch-decoder.download",
            data: { downloadId: recordId, email, name: name || null },
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
