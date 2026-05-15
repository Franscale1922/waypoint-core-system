/**
 * Archetype Email 3 (Day 5): Strength + trap insight for The Community Builder
 * Sent ~5 days after archetype quiz completion
 * Tag: archetype-email-3
 */

export function archetypeDay5CommunityBuilderHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Community Builder's trap when buying a franchise</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, the Community Builder's trap when evaluating a franchise.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Your strength is that you can walk into a new town and have a working network inside ninety days. You know what makes a room feel like something. You can sense whether a brand has a soul before the deck is open. That instinct is real and it is the reason your business, when you find the right one, can compound without buying ads.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The trap is that Community Builders fall in love with the founder's story. A brand whose origin is a heartfelt mission, a chapter list of personal moments, a sense of being part of something bigger. That energy reads to a Community Builder as alignment. Sometimes it is. Sometimes it is the polished version of a brand that has spent more on storytelling than on operating infrastructure.
    </p>

    <!-- The framework -->
    <div style="background:#FBFAF6;border:1px solid #e2ddd2;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">A FILTER THAT HELPS</p>
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1a1a1a;">Two questions to ground the warm story:</p>
      <p style="margin:0 0 12px;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>1.</strong> &nbsp;Beyond the founder's story, walk me through the operational playbook for the first 120 days. What is the actual support cadence, not the inspirational version?
      </p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>2.</strong> &nbsp;How does the brand protect a Year-One franchisee from spending forty hours on bookkeeping and HR when they should be in the community?
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Both questions translate the warm energy into operating reality. A brand with a real operating system answers them with specifics. A brand that confuses storytelling with infrastructure will give you another version of the founder's story. Watch which one you are getting.
    </p>

    <!-- Pull quote -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0;font-size:17px;color:#1a1a1a;line-height:1.5;font-style:italic;">
        The Community Builders who land well are not the ones who fell hardest for the mission. They are the ones who learned to ask what happens after the founder has finished talking.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want a second set of eyes on the brand whose story is already pulling you in, that is the kind of conversation worth having before you sign anything. Free, no pitch.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free 30-Min Call
    </a>

    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">— Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        You received this because you completed the Franchise Archetype Quiz at waypointfranchise.com. <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function archetypeDay5CommunityBuilderText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The Community Builder's trap when evaluating a franchise.

Your strength is that you can walk into a new town and have a working network inside ninety days. You know what makes a room feel like something. You can sense whether a brand has a soul before the deck is open.

The trap is that Community Builders fall in love with the founder's story. A brand whose origin is a heartfelt mission, a chapter list of personal moments, a sense of being part of something bigger. That energy reads to a Community Builder as alignment. Sometimes it is. Sometimes it is the polished version of a brand that has spent more on storytelling than on operating infrastructure.

A filter that helps. Two questions to ground the warm story:

1. Beyond the founder's story, walk me through the operational playbook for the first 120 days. What is the actual support cadence, not the inspirational version?

2. How does the brand protect a Year-One franchisee from spending forty hours on bookkeeping and HR when they should be in the community?

A brand with a real operating system answers with specifics. A brand that confuses storytelling with infrastructure will give you another version of the founder's story.

The Community Builders who land well are not the ones who fell hardest for the mission. They are the ones who learned to ask what happens after the founder has finished talking.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
