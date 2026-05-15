/**
 * Archetype Email 3 (Day 5): Strength + trap insight for The Analyst
 * Sent ~5 days after archetype quiz completion
 * Tag: archetype-email-3
 */

export function archetypeDay5AnalystHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Analyst's trap when buying a franchise</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, the Analyst's trap when evaluating a franchise.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Your strength is that you do not need someone to convince you. You need the data to convince you, and that bar is high. You will read the FDD line by line. You will recalculate the franchisor's own pro forma against industry medians. You will run scenarios most candidates do not even know exist. That instinct will protect you from most of the bad decisions other archetypes make on instinct.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The trap is not lack of rigor. The trap is that Analysts mistake more data for better answers. At some point in every franchise evaluation, you cross the line where the next number you build will not actually change your decision. You will keep building it anyway because the building is the part you trust. Meanwhile, the brand you would actually have signed with awarded the territory to someone else.
    </p>

    <!-- The framework -->
    <div style="background:#FBFAF6;border:1px solid #e2ddd2;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">A FILTER THAT HELPS</p>
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1a1a1a;">Two questions to ask yourself, not the franchisor:</p>
      <p style="margin:0 0 12px;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>1.</strong> &nbsp;What is the specific data point I am still waiting for? Write it down. Be honest about whether the answer to that question could plausibly change your decision.
      </p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>2.</strong> &nbsp;Am I building this third scenario because the math is not done, or because deciding is the part that is harder than analyzing?
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Both questions are uncomfortable on purpose. The strongest Analysts I have worked with use a written commitment to a model threshold. "If the median franchisee in the FDD is above X and the franchisor can answer Y, I will move forward." That kind of pre-commitment short-circuits the trap because the answer is already on paper before the data arrives.
    </p>

    <!-- Pull quote -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0;font-size:17px;color:#1a1a1a;line-height:1.5;font-style:italic;">
        The Analysts who land well are not the ones who built the most thorough model. They are the ones who decided in advance which numbers would actually make them act.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want a second set of eyes on whether you have enough information to decide and whether what you are still chasing is signal or comfort, that is a useful thirty minutes. Free, no pitch.
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

export function archetypeDay5AnalystText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The Analyst's trap when evaluating a franchise.

Your strength is that you do not need someone to convince you. You need the data to convince you, and that bar is high. You will read the FDD line by line. You will recalculate the franchisor's own pro forma against industry medians. You will run scenarios most candidates do not even know exist.

The trap is not lack of rigor. The trap is that Analysts mistake more data for better answers. At some point in every franchise evaluation, you cross the line where the next number you build will not actually change your decision. You will keep building it anyway because the building is the part you trust.

A filter that helps. Two questions to ask yourself, not the franchisor:

1. What is the specific data point I am still waiting for? Write it down. Be honest about whether the answer to that question could plausibly change your decision.

2. Am I building this third scenario because the math is not done, or because deciding is the part that is harder than analyzing?

The strongest Analysts I have worked with use a written commitment to a model threshold. "If the median franchisee in the FDD is above X and the franchisor can answer Y, I will move forward."

The Analysts who land well are not the ones who built the most thorough model. They are the ones who decided in advance which numbers would actually make them act.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
