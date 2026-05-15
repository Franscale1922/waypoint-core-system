/**
 * Archetype Email 2 (Day 3): Advisor's-perspective story for The Connector
 * Sent ~72 hours after archetype quiz completion
 * Tag: archetype-email-2
 */

export function archetypeDay3ConnectorHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What I watch Connectors do, from where I sit</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, what I watch Connectors do well from where I sit.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through training. The Connectors were always the easiest to spot. They were the ones who knew the names of every person in the cohort by lunch on day one. They had introduced themselves to the field reps and were on a first-name basis with someone at corporate by the end of the week. None of it was performative. It was just how they processed a new room.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      What surprised me about Connectors over time was how fast their referral networks built. In categories where their network was already partly aligned, the first ninety days produced revenue I did not see from other archetypes. Senior care, real estate, business services. The work of building the pipeline was already half done before they signed.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The Connectors did not build a customer list. They activated one they had already been building for years without calling it that.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        — Something I noticed early in my franchisor years
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The Connectors who stalled did it for one reason that I saw more than once. They leaned so hard on relationships that they under-invested in the operating side. Customers loved them. Their staffing was a mess. Their books were a year behind. The brand kept growing on the back of pipeline momentum until something operational broke and the whole thing slowed for six months while they caught up.
    </p>

    <!-- The lesson -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">WHAT THIS MEANS FOR YOU</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        If you scored Connector, the franchise that fits you is one where your network can actually feed the funnel and the franchisor's operating system fills in the parts that bore you. That second filter matters as much as the first. A strong brand for a Connector is one with infrastructure you can lean on while you do what you do best.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want to talk through which categories actually feed off the network you already have, my calendar is open. No pitch.
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

export function archetypeDay3ConnectorText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

What I watch Connectors do well, from where I sit.

Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through training. The Connectors were always the easiest to spot. They knew the names of every person in the cohort by lunch on day one. They had introduced themselves to the field reps and were on a first-name basis with someone at corporate by end of week. None of it was performative.

What surprised me about Connectors over time was how fast their referral networks built. In categories where their network was already partly aligned, the first ninety days produced revenue I did not see from other archetypes. Senior care, real estate, business services. The work of building the pipeline was already half done before they signed.

"The Connectors did not build a customer list. They activated one they had already been building for years without calling it that."

The Connectors who stalled did it for one reason. They leaned so hard on relationships that they under-invested in operations. Customers loved them. Their staffing was a mess. Their books were a year behind. The brand kept growing on pipeline momentum until something operational broke and the whole thing slowed.

What this means for you: if you scored Connector, the franchise that fits you is one where your network can actually feed the funnel and the franchisor's operating system fills in the parts that bore you. Both filters matter.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
