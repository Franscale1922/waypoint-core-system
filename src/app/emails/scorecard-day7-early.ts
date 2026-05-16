/**
 * Scorecard Email 4 (Day 7): Early band (<40) — soft education-first invite
 * Sent ~7 days after scorecard completion
 * Tag: scorecard-email-4
 */

export function scorecardDay7EarlyHtml(name: string, score: number, unsubscribeUrl: string): string {
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
      ${firstName}, the most useful version of this conversation.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      A week ago you scored ${score}/100 on the readiness scorecard. That puts you in the band where my honest opinion is that buying a franchise right now is not the move. That is not a bad answer. It is the answer that protects you from making a decision that would be hard to come back from.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      I am keeping the promise I made in the first email. This is the last one unless you reach out. The reason I am sending it is that the candidates I work with who eventually buy a franchise and do it well were almost all in your range when they started thinking about it. Time is not the enemy. Direction is. The next twelve to twenty-four months are about closing the gap between where you are and where the decision becomes safe to make.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;Early is not a verdict on you. It is a verdict on the timing. Those are two completely different things.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        ... Something I tell candidates in your range often
      </p>
    </div>

    <p style="margin:0 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want a thirty-minute conversation that is honest about where you are and useful about what to do next, that is what I offer. There is no pitch and no pressure. I have given the answer "do not buy a franchise yet" plenty of times. It is a real answer.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free 30-Min Call
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

export function scorecardDay7EarlyText(name: string, score: number, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The most useful version of this conversation.

A week ago you scored ${score}/100 on the readiness scorecard. That puts you in the band where my honest opinion is that buying a franchise right now is not the move. That is not a bad answer. It is the answer that protects you from making a decision that would be hard to come back from.

This is the last email unless you reach out. The candidates I work with who eventually buy a franchise and do it well were almost all in your range when they started thinking about it. Time is not the enemy. Direction is.

"Early is not a verdict on you. It is a verdict on the timing. Those are two completely different things."

If you want a thirty-minute conversation that is honest about where you are and useful about what to do next, that is what I offer. There is no pitch and no pressure.

Book a free call: https://waypointfranchise.com/book

Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana

---
Waypoint Franchise Advisors
P.O. Box 3421, Whitefish, MT 59937
You received this because you completed the Franchise Readiness Score at waypointfranchise.com. This is the last email in this series.
To stop receiving these notes: ${unsubscribeUrl}
`.trim();
}
