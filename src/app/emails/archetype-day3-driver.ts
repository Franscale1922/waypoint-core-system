/**
 * Archetype Email 2 (Day 3): Advisor's-perspective story for The Driver
 * Sent ~72 hours after archetype quiz completion
 * Tag: archetype-email-2
 */

export function archetypeDay3DriverHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What I watch Drivers do, from where I sit</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, what I watch Drivers do well from where I sit.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through their first year. The Drivers were always the easiest archetype to identify by week three. They were closing on prospects the rest of the cohort was still warming up. They were impatient with the training pace. They wanted the playbook in their hands so they could already be selling by the time training was done.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      In categories where prospecting is the daily engine, the Drivers compounded fast. Junk removal, B2B services, real estate, pest control. They could absorb rejection at a pace that exhausted other archetypes by week two. A no was just a coordinate. They moved to the next call without looking back.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The Drivers I watched did not chase activity. They created it. Then they outran everyone else trying to react to what they had already built.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        — A pattern I saw repeat across categories
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Here is the part that surprised me. The Drivers who chose the wrong category were the ones I watched grind for eighteen months on the front end and then quietly stall when the business needed operating attention. They had built revenue fast. They had not built a system to hold it. The same gas pedal that gets a Driver to revenue can leave the rest of the business undermanaged.
    </p>

    <!-- The lesson -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">WHAT THIS MEANS FOR YOU</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        If you scored Driver, the franchise that fits you is one where daily prospecting is the engine and where the franchisor's operating system fills in the parts you find tedious. Both filters matter. Without the second one, a Driver can build a business that runs on caffeine and willpower until something breaks.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want to talk through which categories give you a real outlet for your gas pedal and which ones will leave you bored by month four, my calendar is open. No pitch.
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

export function archetypeDay3DriverText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

What I watch Drivers do well, from where I sit.

Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through their first year. The Drivers were always the easiest archetype to identify by week three. They were closing on prospects the rest of the cohort was still warming up. They were impatient with the training pace.

In categories where prospecting is the daily engine, the Drivers compounded fast. Junk removal, B2B services, real estate, pest control. They could absorb rejection at a pace that exhausted other archetypes by week two. A no was just a coordinate.

"The Drivers I watched did not chase activity. They created it. Then they outran everyone else trying to react to what they had already built."

Here is the part that surprised me. The Drivers who chose the wrong category were the ones I watched grind for eighteen months on the front end and then quietly stall when the business needed operating attention. The same gas pedal that gets a Driver to revenue can leave the rest of the business undermanaged.

What this means for you: if you scored Driver, the franchise that fits you is one where daily prospecting is the engine and the franchisor's operating system fills in what you find tedious. Both filters matter.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
