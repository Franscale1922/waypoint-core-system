/**
 * Scorecard Email 4 (Day 7): Strong band (≥80) — soft discovery-call invite
 * Sent ~7 days after scorecard completion
 * Tag: scorecard-email-4
 */

export function scorecardDay7StrongHtml(name: string, score: number, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>One last note on your readiness score</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, the conversation is overdue.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      A week ago you scored ${score}/100 on the readiness scorecard. That puts you in the band of candidates I see act on this decision within ninety days. You are not the person who needs more information. You are the person who needs the right conversation at the right moment, and that moment is closer than you think.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      I am keeping the promise I made in the first email. This is the last one unless you reach out. The reason I am writing it is that at a score in your range, the cost of waiting is usually higher than the cost of acting. Territory awards close. The brands that fit you the cleanest are the brands actively recruiting right now. Six months from now your shortlist will be smaller, not larger.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The candidates who score where you scored and waited tend to wish they had not.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        ... Something I have said more than once
      </p>
    </div>

    <p style="margin:0 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Thirty minutes is what I am asking for. If the right move is to talk to two specific brands this month, I will tell you which ones. If the right move is to slow down for a specific reason I see in your situation, you will hear that too.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book the Call
    </a>

    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        Waypoint Franchise Advisors · P.O. Box 3421, Whitefish, MT 59937. You received this because you completed the Franchise Readiness Score at waypointfranchise.com. This is the last email in this series. <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function scorecardDay7StrongText(name: string, score: number, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The conversation is overdue.

A week ago you scored ${score}/100 on the readiness scorecard. That puts you in the band of candidates I see act on this decision within ninety days. You are not the person who needs more information. You are the person who needs the right conversation at the right moment.

This is the last email unless you reach out. The reason I am writing it is that at a score in your range, the cost of waiting is usually higher than the cost of acting. Territory awards close. The brands that fit you cleanest are the brands actively recruiting right now.

"The candidates who score where you scored and waited tend to wish they had not."

Thirty minutes. If the right move is to talk to two specific brands this month, I will tell you which ones. If the right move is to slow down for a specific reason I see in your situation, you will hear that too.

Book the call: https://waypointfranchise.com/book

Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana

---
Waypoint Franchise Advisors
P.O. Box 3421, Whitefish, MT 59937
You received this because you completed the Franchise Readiness Score at waypointfranchise.com. This is the last email in this series.
To stop receiving these notes: ${unsubscribeUrl}
`.trim();
}
