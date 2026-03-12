/**
 * Email 3 (Day 5 follow-up): Soft invite to book a call
 * Sent ~5 days after scorecard completion
 */

export function followUpDay5Html(name: string, score: number): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Still thinking about it?</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c08b3e;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, still thinking about it?
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      A few days ago you scored ${score}/100 on the Franchise Readiness Quiz. I haven't heard from you since, and that's completely fine. This is a big decision and it deserves time.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      I want to be straightforward with you: I'm not going to send you a dozen emails. This is the last one unless you reach out. I don't believe in pushing people toward something this significant.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      What I can offer is 30 minutes where I'll tell you exactly what I think, whether that's "here are three concepts worth exploring" or "honestly, now isn't the right time." Either answer is useful. Neither costs you anything.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:22px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The worst outcome is making a $300K decision on incomplete information.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#d4a55a;">
        — Something I say in every first call
      </p>
    </div>

    <p style="margin:0 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If the timing still isn't right, no hard feelings. Bookmark the link and come back when it is.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#d4a55a;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free Call When You're Ready
    </a>

    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">— Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        This is the last email in this series. You'll only hear from me again if you reach out.
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function followUpDay5Text(name: string, score: number): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

Still thinking about it?

A few days ago you scored ${score}/100 on the Franchise Readiness Quiz.

I'm not going to send you a dozen emails. This is the last one unless you reach out.

What I can offer is 30 minutes where I'll tell you exactly what I think, whether that's "here are three concepts worth exploring" or "honestly, now isn't the right time." Either answer is useful.

"The worst outcome is making a $300K decision on incomplete information."

Book a free call when you're ready: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana

This is the last email in this series.
`.trim();
}
