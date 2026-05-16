/**
 * Archetype Email 3 (Day 5): Strength + trap insight for The Driver
 * Sent ~5 days after archetype quiz completion
 * Tag: archetype-email-3
 */

export function archetypeDay5DriverHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Driver's trap when buying a franchise</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, the Driver's trap when evaluating a franchise.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Your strength is that you do not need to be convinced to act. You move on incomplete information when the bias is toward action, and most of the time that bias pays off because your iteration loop is faster than everyone else's. You can read a franchisor pitch in twenty minutes and have a verdict by the elevator. That is real and it is one of the most useful filters a Driver brings to this process.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The trap is that Drivers tend to like franchisors who match their energy. The brand whose founder closes you in the first call. The discovery day that ends with a handshake instead of a follow-up question list. The category that promises a fast ramp because the message lands hard against your impatience with slow ones. Drivers respect speed. Franchisors who know that will sell speed back to you whether or not the model can deliver it.
    </p>

    <!-- The framework -->
    <div style="background:#FBFAF6;border:1px solid #e2ddd2;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">A FILTER THAT HELPS</p>
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1a1a1a;">Two questions before you sign anything:</p>
      <p style="margin:0 0 12px;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>1.</strong> &nbsp;Walk me through three median franchisees who did not hit the ramp curve the brand markets. What happened, and what did the franchisor do about it?
      </p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>2.</strong> &nbsp;Beyond Year One revenue, what is the actual hand-off plan for the operations work I will not want to do?
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The first question separates a brand with a working ramp from a brand selling a story about one. The second one is the question that pulls a Driver out of "I will figure out the back office later" and into a real conversation about what the model needs from you beyond closing.
    </p>

    <!-- Pull quote -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0;font-size:17px;color:#1a1a1a;line-height:1.5;font-style:italic;">
        The Drivers who land well are not the ones who moved fastest. They are the ones who learned to slow down for the two questions that matter.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want a second set of eyes before you pull the trigger on the brand in your head right now, that is a thirty-minute call worth taking. Free, no pitch.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free 30-Min Call
    </a>

    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        Waypoint Franchise Advisors · P.O. Box 3421, Whitefish, MT 59937. You received this because you completed the Franchise Archetype Quiz at waypointfranchise.com. <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function archetypeDay5DriverText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The Driver's trap when evaluating a franchise.

Your strength is that you do not need to be convinced to act. You move on incomplete information when the bias is toward action, and most of the time that bias pays off because your iteration loop is faster than everyone else's. You can read a franchisor pitch in twenty minutes and have a verdict by the elevator.

The trap is that Drivers tend to like franchisors who match their energy. The brand whose founder closes you in the first call. The discovery day that ends with a handshake instead of a follow-up question list. Drivers respect speed. Franchisors who know that will sell speed back to you whether or not the model can deliver it.

A filter that helps. Two questions before you sign anything:

1. Walk me through three median franchisees who did not hit the ramp curve the brand markets. What happened, and what did the franchisor do about it?

2. Beyond Year One revenue, what is the actual hand-off plan for the operations work I will not want to do?

The Drivers who land well are not the ones who moved fastest. They are the ones who learned to slow down for the two questions that matter.

Book a free call: https://waypointfranchise.com/book

Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana

---
Waypoint Franchise Advisors
P.O. Box 3421, Whitefish, MT 59937
You received this because you completed the Franchise Archetype Quiz at waypointfranchise.com.
To stop receiving these notes: ${unsubscribeUrl}
`.trim();
}
