/**
 * Archetype Email 2 (Day 3): Advisor's-perspective story for The Educator
 * Sent ~72 hours after archetype quiz completion
 * Tag: archetype-email-2
 */

export function archetypeDay3EducatorHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What I watch Educators do, from where I sit</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, what I watch Educators do well from where I sit.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Before I was an advisor, I sat on the franchisor side of the table. I watched a lot of new owners come through training, hit their first 90 days, and then turn into something. Some grew. Some stalled. The pattern I learned to spot early was almost never about capital or category. It was about how the owner processed information.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The Educators always stood out in the same way. They asked the question one layer deeper than the room expected. They took notes the rest of the cohort didn't take. They were the ones who could repeat back the operating standard in their own words by the end of week two, not because they memorized it, but because they had already started teaching it to the staff they hadn't hired yet.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The Educators didn't try to learn the system. They tried to understand it well enough to teach it.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        — Something I noticed sitting in on training cohorts
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      That instinct compounded fast. The same owner who broke a process down for a brand-new hire was also the one who could walk a hesitant customer through a complicated decision. Both behaviors are the same skill. In categories where the training and the customer education are the actual product, that skill is the business.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The Educators who tripped up did it for one reason that I saw over and over. They wanted everyone to understand before they took action. In high-volume, throughput-driven categories, that instinct slowed them down. In senior care, in children's enrichment, in coaching, the same instinct was their advantage. The category mattered more than the operator.
    </p>

    <!-- The lesson -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">WHAT THIS MEANS FOR YOU</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        If you scored Educator, the work I want to do with you is not about finding any franchise. It is about finding the kind of franchise where your instinct to develop people and educate customers is the moat, not the friction. There is a real difference, and most candidate-side guidance does not draw it sharply enough.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want to talk through which categories sit on the right side of that line for someone wired like you, my calendar is open. No pitch, no pressure.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free 30-Min Call
    </a>

    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">— Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        You received this because you completed the Franchise Archetype Quiz at waypointfranchise.com. <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function archetypeDay3EducatorText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

What I watch Educators do well, from where I sit.

Before I was an advisor, I sat on the franchisor side of the table. I watched a lot of new owners come through training, hit their first 90 days, and then turn into something. Some grew. Some stalled. The pattern I learned to spot early was almost never about capital or category. It was about how the owner processed information.

The Educators always stood out in the same way. They asked the question one layer deeper than the room expected. They took notes the rest of the cohort didn't take. They were the ones who could repeat back the operating standard in their own words by the end of week two, not because they memorized it, but because they had already started teaching it to the staff they hadn't hired yet.

"The Educators didn't try to learn the system. They tried to understand it well enough to teach it."

That instinct compounded fast. The same owner who broke a process down for a brand-new hire was also the one who could walk a hesitant customer through a complicated decision. Both behaviors are the same skill. In categories where the training and the customer education are the actual product, that skill is the business.

The Educators who tripped up did it for one reason I saw over and over. They wanted everyone to understand before they took action. In high-volume, throughput-driven categories, that instinct slowed them down. In senior care, in children's enrichment, in coaching, the same instinct was their advantage. The category mattered more than the operator.

What this means for you: if you scored Educator, the work I want to do with you is not about finding any franchise. It is about finding the kind of franchise where your instinct to develop people and educate customers is the moat, not the friction.

If you want to talk through which categories sit on the right side of that line for someone wired like you, book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
