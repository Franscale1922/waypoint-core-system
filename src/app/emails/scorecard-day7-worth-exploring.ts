/**
 * Scorecard Email 4 (Day 7): Worth Exploring band (40-59) — soft discovery-call invite
 * Sent ~7 days after scorecard completion
 * Tag: scorecard-email-4
 */

export function scorecardDay7WorthExploringHtml(name: string, score: number, unsubscribeUrl: string): string {
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
      ${firstName}, the honest version of where you are.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      A week ago you scored ${score}/100 on the readiness scorecard. That puts you in the band where the conversation is real and the gap is also real. You are not too early. You are not ready. You are somewhere in between, and most candidates in that range have specific work to do before signing anything would actually be a good decision.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      I am keeping the promise I made in the first email. This is the last one unless you reach out. I am writing it because at your score, the most useful next step is rarely to look at brands. It is to identify which one or two things are actually causing the gap. Capital, runway, family alignment, decision clarity, timing. The right answer to that question is what makes the next twelve months either productive or wasted.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The candidates who score in your range and act on the wrong gap waste a year. The ones who name the right gap are usually ready in six months.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        — Something I have learned by watching the same pattern repeat
      </p>
    </div>

    <p style="margin:0 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Thirty minutes is what I am asking for. The point of the call is not to sell you a brand. It is to help you identify the specific gap, and to give you an honest read on what closing it actually looks like. If the answer is wait a year and address two things, that is what you will hear.
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

export function scorecardDay7WorthExploringText(name: string, score: number, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The honest version of where you are.

A week ago you scored ${score}/100 on the readiness scorecard. That puts you in the band where the conversation is real and the gap is also real. You are not too early. You are not ready. You are somewhere in between, and most candidates in that range have specific work to do before signing anything would actually be a good decision.

This is the last email unless you reach out. At your score, the most useful next step is rarely to look at brands. It is to identify which one or two things are actually causing the gap. Capital, runway, family alignment, decision clarity, timing.

"The candidates who score in your range and act on the wrong gap waste a year. The ones who name the right gap are usually ready in six months."

Thirty minutes is what I am asking for. The point of the call is not to sell you a brand. It is to help you identify the specific gap, and to give you an honest read on what closing it actually looks like.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana

This is the last email in this series. You'll only hear from me again if you reach out.
`.trim();
}
