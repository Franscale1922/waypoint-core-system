/**
 * Archetype Email 2 (Day 3): Advisor's-perspective story for The Creative
 * Sent ~72 hours after archetype quiz completion
 * Tag: archetype-email-2
 */

export function archetypeDay3CreativeHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What I watch Creatives do, from where I sit</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, what I watch Creatives do well from where I sit.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through their first year. The Creatives were the archetype most likely to take a brand's standard playbook and quietly do it better. They were the ones whose Instagram looked like a regional brand by month three. Their grand opening photographed. Their staff uniforms fit the local aesthetic. Their interior was clean to corporate standard but felt like something more.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      In categories where the experience is a real part of the product, the Creatives compounded fast. Beauty, boutique fitness, entertainment, children's enrichment. Their local presence became a marketing engine other franchisees could not replicate. Corporate would call to ask what was working in their market and the answer was usually a hundred small choices that nobody else thought to make.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The Creatives did not bend the brand. They saturated the franchisor's standards with taste and made the result feel like the brand had always intended it that way.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        — A pattern I watched repeatedly
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The Creatives who tripped up did it for one reason. They poured energy into the brand experience while the operating side of the business quietly drifted. Beautiful storefront, immaculate Instagram, and the bookkeeping had not been touched in eight weeks. The energy that builds a Creative's edge is the same energy that can blind them to what the back office is doing while they are busy refining the front.
    </p>

    <!-- The lesson -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">WHAT THIS MEANS FOR YOU</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        If you scored Creative, the franchise that fits you is one where the experience is genuinely part of the product and where the franchisor's operating infrastructure runs cleanly enough that you can spend your time on the part of the business you are actually wired for. Both filters matter. Without the second one, your taste becomes a tax on the rest of the business.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want to talk through which categories let your aesthetic instinct do the heavy lifting and which ones quietly punish it, my calendar is open. No pitch.
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

export function archetypeDay3CreativeText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

What I watch Creatives do well, from where I sit.

Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through their first year. The Creatives were the archetype most likely to take a brand's standard playbook and quietly do it better. Their Instagram looked like a regional brand by month three. Their grand opening photographed. Their interior was clean to corporate standard but felt like something more.

In categories where the experience is a real part of the product, the Creatives compounded fast. Beauty, boutique fitness, entertainment, children's enrichment. Their local presence became a marketing engine other franchisees could not replicate.

"The Creatives did not bend the brand. They saturated the franchisor's standards with taste and made the result feel like the brand had always intended it that way."

The Creatives who tripped up did it for one reason. They poured energy into the brand experience while the operating side of the business quietly drifted. Beautiful storefront, immaculate Instagram, and the bookkeeping had not been touched in eight weeks.

What this means for you: if you scored Creative, the franchise that fits you is one where the experience is genuinely part of the product AND where the franchisor's operating infrastructure runs cleanly enough that you can spend your time on the part of the business you are actually wired for.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
