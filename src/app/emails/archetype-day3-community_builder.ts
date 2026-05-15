/**
 * Archetype Email 2 (Day 3): Advisor's-perspective story for The Community Builder
 * Sent ~72 hours after archetype quiz completion
 * Tag: archetype-email-2
 */

export function archetypeDay3CommunityBuilderHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What I watch Community Builders do, from where I sit</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, what I watch Community Builders do well from where I sit.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through their first year. The Community Builders were the archetype I could feel before I could name. They walked into the building and the room rearranged itself. Other franchisees gravitated toward them in training. By month two they were already running events the corporate team had not authorized and asking forgiveness instead of permission.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      In categories where local presence is the moat, the Community Builders quietly built unfair advantages in their first year. Boutique fitness, children's programs, pet services, beauty. Their grand opening was not a marketing event. It was a community event that the brand happened to also benefit from. Their founding member lists turned into referral engines that ran for years.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The Community Builders did not market a business. They invited people into one and let the business form around the invitation.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        — Something I watched repeat enough times to trust
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The Community Builders who stalled did it for one reason. They poured energy into community work while the operating side of the business quietly drifted. Staffing churn, financial reporting, P&L discipline. The same time they were spending on a member appreciation event was time the business needed for the back office. By month nine, the energy could not paper over the operational gaps anymore.
    </p>

    <!-- The lesson -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">WHAT THIS MEANS FOR YOU</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        If you scored Community Builder, the franchise that fits you is one where local energy IS the moat and where the franchisor's operating system genuinely protects you from the parts of the business that will pull you away from what you do best. Both filters matter. One without the other turns a great community presence into a burned-out owner.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want to talk through which categories let your community wiring do the heavy lifting and which ones quietly compete with it, my calendar is open. No pitch.
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

export function archetypeDay3CommunityBuilderText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

What I watch Community Builders do well, from where I sit.

Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through their first year. The Community Builders were the archetype I could feel before I could name. They walked into the building and the room rearranged itself. By month two they were already running events the corporate team had not authorized and asking forgiveness instead of permission.

In categories where local presence is the moat, the Community Builders quietly built unfair advantages in their first year. Boutique fitness, children's programs, pet services, beauty. Their grand opening was not a marketing event. It was a community event that the brand happened to also benefit from.

"The Community Builders did not market a business. They invited people into one and let the business form around the invitation."

The Community Builders who stalled did it for one reason. They poured energy into community work while the operating side of the business quietly drifted. The same time they were spending on a member appreciation event was time the business needed for the back office.

What this means for you: if you scored Community Builder, the franchise that fits you is one where local energy IS the moat AND where the franchisor's operating system genuinely protects you from the parts of the business that will pull you away from what you do best.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
