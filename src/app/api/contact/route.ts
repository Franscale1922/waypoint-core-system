import { NextResponse } from "next/server";
import { afterResponse } from "@/lib/after-response";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";
import { guardCapture, resendFailed } from "@/lib/lead-capture";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
// FROM must use the verified Resend sending domain (mail.waypointfranchise.com).
// waypointfranchise.com root is not verified; Resend silently drops those sends.
const FROM = "Waypoint Website <noreply@mail.waypointfranchise.com>";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, message } = body;

    if (!name || !message) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }

    // This route sends an auto-reply to whatever address the body names, which
    // is the same unauthenticated inbox-bombing shape as the lead magnets, so it
    // takes the same limits. No idempotency key: two genuine messages are two
    // different messages, and swallowing the second would lose an enquiry.
    const guard = await guardCapture({
      req,
      route: "contact",
      email: body.email,
      // The enquiry itself is what must survive a degraded request here.
      preserveLead: () =>
        notifyCrm({
          name,
          email: String(body.email).trim().toLowerCase(),
          phone: phone || undefined,
          source: "Contact Form",
          notes: String(message).slice(0, 500),
        }),
    });
    if (!guard.proceed) return guard.response;
    const email = guard.email;

    // ── CRM sync ───────────────────────────────────────────────────────────
    // Runs after the response is flushed, so it never delays the emails below.
    // See @/lib/after-response for why a bare unawaited promise is unsafe here.
    afterResponse("[contact] CRM sync", () =>
      notifyCrm({
        name,
        email,
        phone: phone || undefined,
        source: "Contact Form",
        notes: message.slice(0, 500),
      })
    );

    const notifyResult = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `New inquiry from ${name}`,
      text: [
        `New website inquiry`,
        ``,
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "Not provided"}`,
        ``,
        `Message:`,
        message,
        ``,
        `---`,
        `Sent from waypointfranchise.com/contact`,
      ].join("\n"),
    });

    // Inverted relative to the lead magnets, deliberately. There the subscriber's
    // copy is the deliverable; here it is Kelsey's notification, because a
    // contact form that silently loses the enquiry has failed at its only job.
    if (resendFailed("[contact] notify", notifyResult)) {
      return NextResponse.json(
        { error: "We couldn't send that message. Please email kelsey@waypointfranchise.com directly." },
        { status: 500 }
      );
    }

    // Skip auto-reply when submitter is the same address as TO; avoids same-domain
    // filtering when testing the form from kelsey@waypointfranchise.com
    if (email.toLowerCase() !== TO.toLowerCase()) {
      const replyResult = await resend.emails.send({
        from: FROM,
        to: email,
        subject: `Got your message, ${name.split(" ")[0]}`,
        text: [
          `Hi ${name.split(" ")[0]},`,
          ``,
          `I got your message. I'll follow up within one business day.`,
          ``,
          `If you'd like to skip ahead, you can book a 30-minute call directly at:`,
          `https://waypointfranchise.com/book`,
          ``,
          `Or text me at (214) 995-1062.`,
          ``,
          `Kelsey`,
          `Waypoint Franchise Advisors`,
        ].join("\n"),
      });
      // The courtesy half: logged, never raised. Kelsey already has the message.
      resendFailed("[contact] auto-reply", replyResult);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[contact]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
