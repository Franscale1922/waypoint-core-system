/**
 * Archetype Email 2 (Day 3): Advisor's-perspective story for The Analyst
 * Sent ~72 hours after archetype quiz completion
 * Tag: archetype-email-2
 */

export function archetypeDay3AnalystHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What I watch Analysts do, from where I sit</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, what I watch Analysts do well from where I sit.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through their first year. The Analysts were the ones the corporate team did not always love during the sales cycle and almost always respected eighteen months in. They asked harder questions than the brand wanted in discovery. They demanded data the marketing team had not packaged yet. They were not unpleasant about it. They were just unwilling to move without the numbers.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      That instinct showed up in everything afterward. In restoration, in medical wellness, in QSR, in pest control, in pool and outdoor, the Analysts ran clean books, built defensible models for territory growth, and could explain their Year-Two pro forma to anyone who asked because they had built it themselves three quarters earlier.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The Analysts did not avoid risk. They priced it correctly while everyone else was guessing.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        ... A pattern I came to rely on
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The Analysts who tripped up did it for the same reason every time. They built the model. They re-built the model. They added a fourth scenario. By the time they were ready to act, two other archetypes had already locked up the territory or the brand had moved on to a different cohort. Analysis paralysis is real for this archetype and it costs them more than they realize.
    </p>

    <!-- The lesson -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">WHAT THIS MEANS FOR YOU</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        If you scored Analyst, you are already going to do the due diligence. The work I want to do with you is helping you decide when the model is good enough to act on. Analysts often make franchise decisions that hold up well over time, but only after they decide the data point they are waiting for is not the one that will actually change their answer.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want to talk through which data points are signal and which ones are comfort-seeking, my calendar is open. No pitch.
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

export function archetypeDay3AnalystText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

What I watch Analysts do well, from where I sit.

Before I was an advisor, I sat on the franchisor side and watched a lot of new owners come through their first year. The Analysts were the ones the corporate team did not always love during the sales cycle and almost always respected eighteen months in. They asked harder questions than the brand wanted in discovery. They demanded data the marketing team had not packaged yet. They were just unwilling to move without the numbers.

That instinct showed up in everything afterward. In restoration, medical wellness, QSR, pest control, pool and outdoor, the Analysts ran clean books, built defensible models for territory growth, and could explain their Year-Two pro forma to anyone who asked.

"The Analysts did not avoid risk. They priced it correctly while everyone else was guessing."

The Analysts who tripped up did it for the same reason every time. They built the model. They re-built the model. They added a fourth scenario. By the time they were ready to act, two other archetypes had already locked up the territory.

What this means for you: if you scored Analyst, you are already going to do the due diligence. The work I want to do with you is helping you decide when the model is good enough to act on.

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
