/**
 * Archetype Email 3 (Day 5): Strength + trap insight for The Connector
 * Sent ~5 days after archetype quiz completion
 * Tag: archetype-email-3
 */

export function archetypeDay5ConnectorHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Connector's trap when buying a franchise</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, the Connector's trap when evaluating a franchise.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Your strength is that you take a discovery day and walk out with three new relationships, not three new questions. You read franchisors fast. You read existing franchisees faster. By the end of an afternoon you have a picture of a brand that other people need weeks to form. That instinct is real and it is one of the most useful filters you can run.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The trap is how quickly that picture can become the decision. Connectors are prone to buying the people. They like the founder. They get along with the field rep. The existing owner they had lunch with felt like an old friend by dessert. Those signals are valuable, and they are also exactly what a brand with weak fundamentals can manufacture. Likeable people exist inside both strong franchise systems and brittle ones.
    </p>

    <!-- The framework -->
    <div style="background:#FBFAF6;border:1px solid #e2ddd2;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">A FILTER THAT HELPS</p>
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1a1a1a;">Two questions to bring into every brand conversation:</p>
      <p style="margin:0 0 12px;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>1.</strong> &nbsp;If the founder left tomorrow, would the operating model still work? Whose hands are actually building this thing?
      </p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>2.</strong> &nbsp;Beyond the franchisees they want you to talk to, who in the system is one year in and quiet? Ask for those introductions specifically.
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The first question separates a brand from its founder's charisma. The second is the question that gets a Connector out of the friendly-validation echo chamber and into actual signal. Most brands will give you a curated validation list. The list you want is the one they did not curate.
    </p>

    <!-- Pull quote -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0;font-size:17px;color:#1a1a1a;line-height:1.5;font-style:italic;">
        The Connectors who land well are not the ones who liked the people most. They are the ones who learned to ask which people were missing from the room.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want a second set of eyes on a brand you are emotionally attached to already, that is a useful conversation to have before the FDD review, not after. Free, no pitch.
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

export function archetypeDay5ConnectorText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The Connector's trap when evaluating a franchise.

Your strength is that you take a discovery day and walk out with three new relationships, not three new questions. You read franchisors fast. You read existing franchisees faster. By the end of an afternoon you have a picture other people need weeks to form.

The trap is how quickly that picture can become the decision. Connectors are prone to buying the people. They like the founder. They get along with the field rep. The existing owner they had lunch with felt like an old friend by dessert. Those signals are valuable, and they are also exactly what a brand with weak fundamentals can manufacture.

A filter that helps. Two questions to bring to every brand conversation:

1. If the founder left tomorrow, would the operating model still work? Whose hands are actually building this thing?

2. Beyond the franchisees they want you to talk to, who in the system is one year in and quiet? Ask for those introductions specifically.

The first question separates a brand from its founder's charisma. The second gets a Connector out of the curated-validation echo chamber and into actual signal.

The Connectors who land well are not the ones who liked the people most. They are the ones who learned to ask which people were missing from the room.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
