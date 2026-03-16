import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
const FROM = "Waypoint Website <hi@waypointfranchise.com>";

export async function POST(req: Request) {
  try {
    const { name, email, phone, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }

    await resend.emails.send({
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

    // Also send an auto-reply to the person who submitted
    await resend.emails.send({
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

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[contact]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
