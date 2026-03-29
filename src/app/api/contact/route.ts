import { NextResponse } from "next/server";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
// FROM must use the verified Resend sending domain (mail.waypointfranchise.com).
// waypointfranchise.com root is not verified — Resend silently drops those sends.
const FROM = "Waypoint Website <noreply@mail.waypointfranchise.com>";

export async function POST(req: Request) {
  try {
    const { name, email, phone, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }

    // ── CRM sync — fire-and-forget ─────────────────────────────────────────
    notifyCrm({
      name,
      email,
      phone: phone || undefined,
      source: "Contact Form",
      notes: message.slice(0, 500),
    });

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

    if (notifyResult.error) {
      console.error("[contact] Resend notify error:", JSON.stringify(notifyResult.error));
    }

    // Skip auto-reply when submitter is the same address as TO — avoids same-domain
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
      if (replyResult.error) {
        console.error("[contact] Resend auto-reply error:", JSON.stringify(replyResult.error));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[contact]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
