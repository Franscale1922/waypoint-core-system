/**
 * Archetype Email 2 (Day 3): Advisor's-perspective story for The Operator
 * Sent ~72 hours after archetype quiz completion
 * Tag: archetype-email-2
 */

export function archetypeDay3OperatorHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What I watch Operators do, from where I sit</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, what I watch Operators do well from where I sit.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through their first year. The Operators were the ones the corporate team always wanted more of. They followed the system. They asked operational questions other archetypes never thought to ask. They were the franchisees the brand pointed to when telling their own story.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Across home services, restoration, fitness, lawn care, pest control, the Operators ran tighter labor cost percentages, dispatched cleaner routes, and could tell you their utilization rate from memory by month four. The work I watched them do behind the scenes was almost always quiet. No drama, no rescue plans. Just a system running the way it was designed to run.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The Operators did not improvise. They took the playbook and ran it better than the brand was running it themselves.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        ... Something I learned watching franchisor field calls
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Here is the part that surprised me. The Operators who chose well got disproportionate returns from the franchise model. The ones who chose poorly were the most frustrated owners I worked with. Their pattern was the same. They bought into a brand whose operating system was actually weak, and the gap between what they could execute and what the brand had built showed up by month nine. An Operator without a strong playbook is just an unhappy manager.
    </p>

    <!-- The lesson -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">WHAT THIS MEANS FOR YOU</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        If you scored Operator, the franchise that fits you is one where the operating model is genuinely strong, not just marketed that way. There is a real difference. The brands worth your time can show you the playbook and the data behind it. The ones that cannot are buying your discipline to make up for what they did not build.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want to talk through which categories have systems worth your operating muscle and which ones do not, my calendar is open. No pitch.
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

export function archetypeDay3OperatorText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

What I watch Operators do well, from where I sit.

Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through their first year. The Operators were the ones the corporate team always wanted more of. They followed the system. They asked operational questions other archetypes never thought to ask. They were the franchisees the brand pointed to when telling their own story.

Across home services, restoration, fitness, lawn care, pest control, the Operators ran tighter labor cost percentages, dispatched cleaner routes, and could tell you their utilization rate from memory by month four.

"The Operators did not improvise. They took the playbook and ran it better than the brand was running it themselves."

Here is the part that surprised me. The Operators who chose well got disproportionate returns. The ones who chose poorly were the most frustrated owners I worked with. They bought into a brand whose operating system was actually weak, and the gap between what they could execute and what the brand had built showed up by month nine. An Operator without a strong playbook is just an unhappy manager.

What this means for you: if you scored Operator, the franchise that fits you is one where the operating model is genuinely strong, not just marketed that way. The brands worth your time can show you the playbook and the data behind it.

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
