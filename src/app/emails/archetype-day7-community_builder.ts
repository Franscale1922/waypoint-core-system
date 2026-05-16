/**
 * Archetype Email 4 (Day 7): Soft discovery-call invite for The Community Builder
 * Sent ~7 days after archetype quiz completion
 * Tag: archetype-email-4
 */

export function archetypeDay7CommunityBuilderHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>One last note, Community Builder</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, one last note.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      A week ago you took the archetype quiz and landed on Community Builder. I sent you a couple of follow-ups, and I want to keep my word on what I said in the first one. This is the last email unless you reach out.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The thing about Community Builders is that you can sell most franchises better than the brand can. The question I want to help you answer is whether the brand can hold up the back end of what you would build on the front end. Owners wired like you can paper over a weak operating system longer than other archetypes, and that is exactly why you need someone honest about what is actually underneath the brand story.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      What a call with me actually is: thirty minutes where I ask about the town you want to operate in, what your local network actually looks like, and which categories will turn your wiring into a moat instead of into a weekend job. If the answer is none of the brands you are looking at, that is a useful answer too.
    </p>

    <!-- Pull quote -->
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:20px;color:#FFFFFF;line-height:1.4;">
        &ldquo;Community Builders do not need me to make them better at people. They need me to find the brand that does not waste what they are already good at.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        ... Something I have said more than once
      </p>
    </div>

    <p style="margin:0 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If the timing is not right yet, bookmark the link and come back when it is. The conversation will still be here.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free Call When You're Ready
    </a>

    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        Waypoint Franchise Advisors · P.O. Box 3421, Whitefish, MT 59937. You received this because you completed the Franchise Archetype Quiz at waypointfranchise.com. This is the last email in this series. <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function archetypeDay7CommunityBuilderText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

One last note.

A week ago you took the archetype quiz and landed on Community Builder. I sent you a couple of follow-ups, and I want to keep my word on what I said in the first one. This is the last email unless you reach out.

The thing about Community Builders is that you can sell most franchises better than the brand can. The question I want to help you answer is whether the brand can hold up the back end of what you would build on the front end. Owners wired like you can paper over a weak operating system longer than other archetypes, and that is exactly why you need someone honest about what is actually underneath the brand story.

What a call with me actually is: thirty minutes where I ask about the town you want to operate in, what your local network actually looks like, and which categories will turn your wiring into a moat instead of into a weekend job.

"Community Builders do not need me to make them better at people. They need me to find the brand that does not waste what they are already good at."

Book a free call: https://waypointfranchise.com/book

Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana

---
Waypoint Franchise Advisors
P.O. Box 3421, Whitefish, MT 59937
You received this because you completed the Franchise Archetype Quiz at waypointfranchise.com. This is the last email in this series.
To stop receiving these notes: ${unsubscribeUrl}
`.trim();
}
