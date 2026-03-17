import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "kelsey@waypointfranchise.com";
const FROM = "Waypoint Website <noreply@mail.waypointfranchise.com>";

const CHECKLIST = `
FRANCHISE READINESS CHECKLIST
Waypoint Franchise Advisors — waypointfranchise.com

Use this before any first conversation. If you can answer yes to most of these,
you are likely ready to explore seriously. If you can not answer most of them yet,
this tells you what to work on first.

---

FINANCIAL READINESS
[ ] I have at least $75,000 in liquid assets (cash, brokerage, or rollable retirement funds)
[ ] I understand the difference between liquid capital and total investment
[ ] I have reviewed my personal monthly expenses and know my break-even income number
[ ] I have considered how long I can sustain my lifestyle while a business ramps up
[ ] I (and my partner, if applicable) are aligned on how much we are comfortable investing

LIFESTYLE AND GOALS
[ ] I can describe what I want my day-to-day to look like in 3 years
[ ] I know whether I want to be hands-on or semi-absentee in the business
[ ] I have thought about whether I want to build and sell, or build and keep
[ ] I understand that franchise ownership is a business, not a passive investment
[ ] I am not looking for a franchise to replace a corporate job starting next month

TIME AND READINESS
[ ] I am not in a financial emergency — I have time to make a good decision
[ ] I am ready to spend 3-5 hours per week on this research for the next 6-10 weeks
[ ] I am open to exploring brands I have never heard of, not just household names
[ ] I understand the Franchise Disclosure Document (FDD) is a legal document, not a brochure
[ ] I am willing to talk to 5-10 existing franchise owners before making a decision

PERSONAL FIT
[ ] I have thought about whether I enjoy leading people or prefer working alone
[ ] I am comfortable following a proven system, not reinventing the wheel
[ ] I understand that I will be responsible for local marketing and team management
[ ] I have discussed this with my partner, spouse, or any key people it affects
[ ] I am doing this because I want it, not because someone talked me into it

---

If you answered yes to 15 or more: We should talk soon. You are ready to explore.
If you answered yes to 10-14: Good foundation. A few things to get clear on first.
If you answered yes to fewer than 10: Not quite ready. This checklist tells you exactly what to work on.

---

Want to talk through where you landed?
Book a free 30-minute call: https://waypointfranchise.com/book
Or take the Readiness Quiz: https://waypointfranchise.com/scorecard

Kelsey Stuart
Waypoint Franchise Advisors
(214) 995-1062
`.trim();

export async function POST(req: Request) {
  try {
    const { name, email, source } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const firstName = name ? name.split(" ")[0] : "there";

    // Notify Kelsey
    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `New checklist request from ${name || email}`,
      text: [
        `New checklist download via ${source || "resources"} page`,
        ``,
        `Name: ${name || "Not provided"}`,
        `Email: ${email}`,
        `Source: ${source || "resources"}`,
        ``,
        `---`,
        `Sent from waypointfranchise.com/resources`,
      ].join("\n"),
    });

    // Send checklist to subscriber
    if (email.toLowerCase() !== TO.toLowerCase()) {
      await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: TO,
        subject: `Your Franchise Readiness Checklist`,
        text: [
          `Hi ${firstName},`,
          ``,
          `Here is the checklist I use before any first conversation.`,
          ``,
          CHECKLIST,
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
