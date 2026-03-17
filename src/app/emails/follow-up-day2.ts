/**
 * Email 2 (Day 2 follow-up): "The 3 questions most people forget to ask"
 * Sent ~48 hours after scorecard completion
 */

export function followUpDay2Html(name: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3 questions most people forget to ask</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, the 3 questions most people forget to ask before they buy a franchise.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      I've been through a lot of franchise discovery processes, as a franchisor, as a franchisee, and now as an advisor. The people who make good decisions almost always ask the same three things. Most people don't ask any of them.
    </p>

    <!-- Question 1 -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">01</p>
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1a1a1a;">"What does a bad week look like?"</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        Everyone talks to the brand's success stories. Ask to talk to a franchisee who had a rough first year. What went wrong? What did they wish they'd known? The brand will tell you how great things can be. The franchisees will tell you what it actually takes.
      </p>
    </div>

    <!-- Question 2 -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">02</p>
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1a1a1a;">"What's the real reason people leave the system?"</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        The FDD tells you how many units closed last year. It doesn't tell you why. Was it underperformance? Retirement? Conflict with the franchisor? The difference matters enormously. If you're buying a system, you're betting on how well it retains owners.
      </p>
    </div>

    <!-- Question 3 -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">03</p>
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1a1a1a;">"How does the brand make money when I'm struggling?"</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        Royalties are a percentage of top-line revenue, so the brand gets paid whether you're profitable or not. A brand that charges 8% royalties on $600K in revenue is pulling $48K from you before you see a dime of it. Understanding the real numbers at the median owner level, not the best case, is everything.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      These are the conversations I have with every person I work with before we ever look at a brand list. If you want to have that conversation now, my calendar is open.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free 30-Min Call
    </a>

    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">— Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function followUpDay2Text(name: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The 3 questions most people forget to ask before they buy a franchise.

01. "What does a bad week look like?"
Talk to a franchisee who had a rough first year, not just the success stories.

02. "What's the real reason people leave the system?"
The legal disclosure document tells you how many units closed. It doesn't tell you why.

03. "How does the brand make money when I'm struggling?"
Royalties come off the top. Understand the median unit economics, not the best case.

These are the conversations I have with every person I work with before we look at a single brand.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
