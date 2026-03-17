/**
 * Email 1 (immediate): Scorecard results with personalized score summary
 */

interface ScoreResultsEmailProps {
  name: string;
  score: number;
  primaryDriver: string;
  biggestFear: string;
}

function getScoreTier(score: number) {
  if (score >= 70) {
    return {
      label: "Strong",
      headline: "Honestly? You're in a strong position.",
      body: `A score of ${score}/100 tells me your capital, motivation, and timing are well-aligned. That doesn't mean every franchise is right for you. It means we can have a real conversation about which ones are.`,
      cta: "Most people in your range find it useful to move fast. Let's talk.",
    };
  }
  if (score >= 40) {
    return {
      label: "Solid",
      headline: "You've got a solid foundation.",
      body: `A score of ${score}/100 means there are a few things worth working through before committing. Nothing that can't be figured out. I just want to make sure we're building on the right base before we start looking at brands.`,
      cta: "A 30-minute call would help me understand your full picture.",
    };
  }
  return {
    label: "Early",
    headline: "Timing might be the only thing standing in your way.",
    body: `A score of ${score}/100 usually means the fundamentals are there but something (capital, timing, or mindset) isn't quite locked in yet. That's fine. This is exactly the right time to start learning.`,
    cta: "Let's talk through what it would actually take to get you ready.",
  };
}

export function scoreResultsHtml({ name, score, primaryDriver, biggestFear }: ScoreResultsEmailProps): string {
  const tier = getScoreTier(score);
  const firstName = name.split(" ")[0];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Franchise Readiness Score</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <!-- Score badge -->
    <div style="background:#0c1929;border-radius:12px;padding:28px 32px;margin-bottom:32px;text-align:center;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#CC6535;">
        YOUR READINESS SCORE
      </p>
      <p style="margin:0;font-size:56px;font-weight:900;color:#ffffff;line-height:1.1;">
        ${score}<span style="font-size:28px;color:#CC6535;">/100</span>
      </p>
      <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#94a3b8;">
        ${tier.label} position · ${primaryDriver}
      </p>
    </div>

    <!-- Body -->
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, ${tier.headline}
    </h1>
    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      ${tier.body}
    </p>
    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      You mentioned your biggest concern is <strong>${biggestFear}</strong>. That's one of the most common things I hear, and it's also one of the most workable. The right franchise structure can actually address it directly.
    </p>
    <p style="margin:0 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      ${tier.cta}
    </p>

    <!-- CTA -->
    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free 30-Min Call
    </a>

    <!-- Footer -->
    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">— Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">
        Waypoint Franchise Advisors · Whitefish, Montana
      </p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        Free to candidates. Franchise brands pay the referral fee, not you.
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function scoreResultsText({ name, score, primaryDriver }: ScoreResultsEmailProps): string {
  const tier = getScoreTier(score);
  const firstName = name.split(" ")[0];
  return `
${firstName},

Your Franchise Readiness Score: ${score}/100 (${tier.label} position)
Driver: ${primaryDriver}

${tier.headline}

${tier.body}

${tier.cta}

Book a free 30-min call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana

Free to candidates. Franchise brands pay the referral fee, not you.
`.trim();
}
