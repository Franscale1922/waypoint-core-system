/**
 * Archetype Email 4 (Day 7): Soft discovery-call invite for The Driver
 * Sent ~7 days after archetype quiz completion
 * Tag: archetype-email-4
 */

export function archetypeDay7DriverHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>One last note, Driver</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, one last note.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      A week ago you took the archetype quiz and landed on Driver. I sent you a couple of follow-ups, and I want to keep my word on what I said in the first one. This is the last email unless you reach out.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The thing about Drivers is that you do not need help finding momentum. You need help making sure the momentum is pointed at the right target. I have worked with owners who built a six-figure business in a category they should have walked away from on day one, and the muscle that got them there was the same muscle that kept them locked in long after the math stopped working.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      What a call with me actually is: thirty minutes where I give you a fast read on the category and the brand you are circling. No upsell, no padding. If the answer is move forward, you move forward. If the answer is pass, you save yourself a year. Either one is worth thirty minutes.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;Drivers do not need permission. They need a second set of eyes on whether they are about to drive in the right direction.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        — Something I have said more than once
      </p>
    </div>

    <p style="margin:0 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If the timing is not right yet, bookmark the link and come back when it is. The conversation will still be here.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free Call When You're Ready
    </a>

    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">— Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        This is the last email in this series. You'll only hear from me again if you reach out. <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function archetypeDay7DriverText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

One last note.

A week ago you took the archetype quiz and landed on Driver. I sent you a couple of follow-ups, and I want to keep my word on what I said in the first one. This is the last email unless you reach out.

The thing about Drivers is that you do not need help finding momentum. You need help making sure the momentum is pointed at the right target. I have worked with owners who built a six-figure business in a category they should have walked away from on day one, and the muscle that got them there was the same muscle that kept them locked in long after the math stopped working.

What a call with me actually is: thirty minutes where I give you a fast read on the category and the brand you are circling. No upsell, no padding. If the answer is move forward, you move forward. If the answer is pass, you save yourself a year.

"Drivers do not need permission. They need a second set of eyes on whether they are about to drive in the right direction."

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana

This is the last email in this series. You'll only hear from me again if you reach out.
`.trim();
}
