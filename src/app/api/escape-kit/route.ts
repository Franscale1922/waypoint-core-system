import { NextResponse } from "next/server";
import { afterResponse } from "@/lib/after-response";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { inngest } from "@/inngest/client";
import { buildUnsubscribeLink } from "@/lib/nurture-emails";
import { buildEscapeKitEmail } from "@/lib/escape-kit-email";
import { subscribeToBeehiiv } from "@/lib/beehiiv";
import { isEmailSuppressedFailClosed } from "@/lib/email-suppression";
import { guardCapture, resendFailed, markDelivered, deliveryFailed } from "@/lib/lead-capture";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
const FROM = "Kelsey at Waypoint <noreply@mail.waypointfranchise.com>";
const LABEL = "[escape-kit]";
const MODEL = "escapeKitDownload";

function loadGuide(): string {
  const filePath = path.join(process.cwd(), "content", "downloads", "corporate-escape-kit.md");
  return fs.readFileSync(filePath, "utf8");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, articleSlug } = body;

    const guard = await guardCapture({
      req,
      route: "escape-kit",
      email: body.email,
      idempotency: { model: MODEL },
    });
    if (!guard.proceed) return guard.response;
    const email = guard.email;

    const firstName = name ? String(name).split(" ")[0] : "there";
    const guideMarkdown = loadGuide();
    const isKelsey = email === TO.toLowerCase();

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
      console.error(`${LABEL} DB write failed:`, dbErr);
    }

    // ── Background work ────────────────────────────────────────────────────
    // All of it runs after the response is flushed, so none of it delays the
    // guide delivery below. See @/lib/after-response for why bare unawaited
    // promises are not safe here.
    afterResponse(`${LABEL} CRM sync`, () =>
      notifyCrm({
        name: name || "Website Visitor",
        email,
        source: "Corporate Escape Kit",
        notes: articleSlug ? `Article: ${articleSlug}` : undefined,
      })
    );

    // Skipped for Kelsey's own address (test submissions)
    if (!isKelsey) {
      afterResponse(`${LABEL} Beehiiv sync`, () => subscribeToBeehiiv(email, name || undefined));
    }

    // Notify Kelsey. Best-effort: logged, never raised to the visitor.
    const notifyResult = await resend.emails.send({
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
    resendFailed(`${LABEL} notify`, notifyResult);

    // Send guide to subscriber
    if (!isKelsey) {
      // "escape-kit", NOT the default this used to inherit. The shared builder
      // was hardcoded to /api/unsubscribe, which looks ids up in the CHECKLIST
      // table, so every Escape Kit unsubscribe click landed on a table that
      // could not contain that id, reported "you may have already been removed",
      // and opted nobody out. The list argument is required now for that reason.
      const unsub = buildUnsubscribeLink(downloadId, "escape-kit");

      const htmlBody = buildEscapeKitEmail({
        firstName,
        guideMarkdown,
        unsubscribeUrl: unsub.url,
      });

      const deliveryResult = await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: TO,
        subject: "The Corporate Escape Kit: your guide is inside",
        headers: unsub.headers,
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
          `To unsubscribe: ${unsub.url}`,
        ].join("\n"),
      });

      if (resendFailed(`${LABEL} delivery`, deliveryResult)) return deliveryFailed();

      if (downloadId) await markDelivered(MODEL, downloadId, LABEL);

      if (downloadId) {
        const recordId = downloadId;
        afterResponse(`${LABEL} Nurture trigger`, async () => {
          if (await isEmailSuppressedFailClosed(email)) {
            console.log(`${LABEL} address is suppressed; no nurture sequence started`);
            return;
          }
          await inngest.send({
            name: "nurture/escape-kit.download",
            data: {
              downloadId: recordId,
              email,
              name: name || null,
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
