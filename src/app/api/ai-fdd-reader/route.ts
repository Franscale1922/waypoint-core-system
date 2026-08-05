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
const DOWNLOAD_URL = `${SITE}/downloads/ai-paperwork-reader.pdf`;

const LABEL = "[ai-fdd-reader]";
const MODEL = "aiFddReaderDownload";

export async function POST(req: Request) {
  // Hoisted so the catch below can hand the reservation back. A send that
  // REJECTS at the network layer, rather than resolving with { error }, skips
  // every release inside the try; the lock would then survive, and the
  // visitor's retry would be answered with a deduplicated success for a
  // delivery that never happened.
  let release: (() => Promise<void>) | null = null;
  try {
    const body = await req.json();
    const { name, articleSlug } = body;

    // Rate limits, address validation and duplicate suppression, before this
    // request is allowed to write a row or send anything. See @/lib/lead-capture.
    const guard = await guardCapture({
      req,
      route: "ai-fdd-reader",
      // A limiter outage refuses the form, but the CRM is an external webhook
      // that is still up, so the lead does not have to die with the request.
      preserveLead: () =>
        notifyCrm({
          name: name || "Website Visitor",
          email: String(body.email).trim().toLowerCase(),
          source: "AI Paperwork Reader",
          notes: "Captured during a degraded request; no email was sent.",
        }),
      email: body.email,
      idempotency: { model: MODEL },
    });
    if (!guard.proceed) return guard.response;
    release = guard.release;
    const email = guard.email;

    const firstName = name ? String(name).split(" ")[0] : "there";
    const isKelsey = email === TO.toLowerCase();

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
        source: "AI Paperwork Reader",
        notes: articleSlug ? `Article: ${articleSlug}` : undefined,
      })
    );

    // Notify Kelsey. Best-effort: logged, never raised to the visitor.
    const notifyResult = await resend.emails.send({
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
    resendFailed(`${LABEL} notify`, notifyResult);

    // Send the download to the subscriber
    if (!isKelsey) {
      // Degrades to a mailto when the DB write failed, rather than the old
      // `${SITE}/unsubscribe`, a path with no handler at all, so the one email
      // guaranteed to go out during an outage carried a dead opt-out link.
      const unsub = buildUnsubscribeLink(downloadId, "ai-fdd-reader");
      const unsubUrl = unsub.url;

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

      const deliveryResult = await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: TO,
        subject: "The AI Paperwork Reader: your download is inside",
        headers: unsub.headers,
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

      // The whole point of the request. Reporting success on a failed send is
      // what left people watching an inbox that was never going to receive it.
      if (resendFailed(`${LABEL} delivery`, deliveryResult)) {
        // Drop the in-flight reservation so the visitor's retry is not mistaken
        // for a duplicate of a delivery that never happened.
        await guard.release();
        return deliveryFailed();
      }

      // Arms idempotency, and only now: keyed on delivery rather than on the row
      // existing, so the retry after a failed send is not suppressed.
      if (downloadId) await markDelivered(MODEL, downloadId, LABEL);

      // Queued only now. Scheduling it earlier subscribed people to the
      // newsletter off the back of a delivery that then failed, and the
      // callback runs post-response either way, so returning 500 did not stop
      // it. (Kelsey's own address never reaches this branch.)
      afterResponse(`${LABEL} Beehiiv sync`, () => subscribeToBeehiiv(email, name || undefined));

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
            name: "nurture/ai-fdd-reader.download",
            data: { downloadId: recordId, email, name: name || null },
          });
        });
      }
    }

    // Kelsey's own address skips the subscriber send, so nothing consumed the
    // reservation. Releasing keeps test submissions from blocking each other.
    if (isKelsey) await guard.release();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (release) await release();
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(LABEL, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
