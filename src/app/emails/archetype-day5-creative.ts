/**
 * Archetype Email 3 (Day 5): Strength + trap insight for The Creative
 * Sent ~5 days after archetype quiz completion
 * Tag: archetype-email-3
 */

export function archetypeDay5CreativeHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Creative's trap when buying a franchise</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, the Creative's trap when evaluating a franchise.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Your strength is that you can spot a category before it has fully arrived. You notice the design direction the rest of the market will be chasing in eighteen months. You can walk into a discovery day and see how a brand should look before they have figured it out themselves. That instinct is one of the most valuable signals a Creative can bring to franchise evaluation, and it is also where you can lose yourself.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The trap is that Creatives buy the aesthetic. The brand whose website is the most beautiful one in the deck. The category that is currently photographing well. The founder whose taste matches yours. Those signals can be real, and they can also be a brand that has invested in surface while skipping the parts that determine whether the business actually works in a market like yours.
    </p>

    <!-- The framework -->
    <div style="background:#FBFAF6;border:1px solid #e2ddd2;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">A FILTER THAT HELPS</p>
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1a1a1a;">Two questions to ground the aesthetic case:</p>
      <p style="margin:0 0 12px;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>1.</strong> &nbsp;Strip the design and the brand book away. Is this category still a business I would want to own? Would I run it if the aesthetic was average?
      </p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>2.</strong> &nbsp;What is the franchisor's actual operations infrastructure? Not the social proof. Not the deck. The systems that pay payroll, track unit economics, and catch a struggling franchisee before month six.
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Both questions separate the brand experience from the business model. A strong brand for a Creative answers both confidently. A brand that has confused good design for a good business will redirect you back to the founder's story. Watch which one you are getting.
    </p>

    <!-- Pull quote -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0;font-size:17px;color:#1a1a1a;line-height:1.5;font-style:italic;">
        The Creatives who land well are not the ones who picked the prettiest brand. They are the ones who learned to ask whether the brand they fell for also has a working machine behind it.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want a second set of eyes on whether the brand you are drawn to also has the operational backbone to support what you would build with it, that is a useful thirty minutes. Free, no pitch.
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

export function archetypeDay5CreativeText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The Creative's trap when evaluating a franchise.

Your strength is that you can spot a category before it has fully arrived. You notice the design direction the rest of the market will be chasing in eighteen months. You can walk into a discovery day and see how a brand should look before they have figured it out themselves.

The trap is that Creatives buy the aesthetic. The brand whose website is the most beautiful one in the deck. The category that is currently photographing well. The founder whose taste matches yours. Those signals can be real, and they can also be a brand that has invested in surface while skipping the parts that determine whether the business actually works.

A filter that helps. Two questions to ground the aesthetic case:

1. Strip the design and the brand book away. Is this category still a business I would want to own? Would I run it if the aesthetic was average?

2. What is the franchisor's actual operations infrastructure? Not the social proof. Not the deck. The systems that pay payroll, track unit economics, and catch a struggling franchisee before month six.

A strong brand for a Creative answers both confidently. A brand that has confused good design for a good business will redirect you back to the founder's story.

The Creatives who land well are not the ones who picked the prettiest brand. They are the ones who learned to ask whether the brand they fell for also has a working machine behind it.

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
