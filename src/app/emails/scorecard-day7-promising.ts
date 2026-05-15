/**
 * Scorecard Email 4 (Day 7): Promising band (60-79) — soft discovery-call invite
 * Sent ~7 days after scorecard completion
 * Tag: scorecard-email-4
 */

export function scorecardDay7PromisingHtml(name: string, score: number, unsubscribeUrl: string): string {
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
      ${firstName}, you are closer than you think.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      A week ago you scored ${score}/100 on the readiness scorecard. That puts you in the band where the foundation is real, the motivation is real, and there is one or two specific things between you and the decision that I can usually identify in a thirty-minute call. The work is not redo from scratch. The work is sharpen the part that is not yet sharp.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      I am keeping the promise I made in the first email. This is the last one unless you reach out. I am writing it because the candidates who score in your range and disappear back into research mode tend to spend six more months gathering information that does not actually change their answer. The information you already have is more useful than the information you are still chasing.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;Promising means you are not waiting on a number. You are waiting on a conversation.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        — Something I have said more than once
      </p>
    </div>

    <p style="margin:0 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Thirty minutes is enough. I will tell you which one or two things are actually standing between you and a confident yes, and which ones are noise. If you leave the call deciding to wait six months, that is a useful outcome too.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free 30-Min Call
    </a>

    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">— Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        This is the last email in this series. You'll only hear from me again if you reach out. <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function scorecardDay7PromisingText(name: string, score: number, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

You are closer than you think.

A week ago you scored ${score}/100 on the readiness scorecard. That puts you in the band where the foundation is real, the motivation is real, and there is one or two specific things between you and the decision that I can usually identify in a thirty-minute call.

This is the last email unless you reach out. The candidates who score in your range and disappear back into research mode tend to spend six more months gathering information that does not actually change their answer.

"Promising means you are not waiting on a number. You are waiting on a conversation."

Thirty minutes is enough. I will tell you which one or two things are actually standing between you and a confident yes, and which ones are noise. If you leave the call deciding to wait six months, that is a useful outcome too.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana

This is the last email in this series. You'll only hear from me again if you reach out.
`.trim();
}
