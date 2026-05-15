/**
 * Archetype Email 3 (Day 5): Strength + trap insight for The Educator
 * Sent ~5 days after archetype quiz completion
 * Tag: archetype-email-3
 */

export function archetypeDay5EducatorHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Educator's trap when buying a franchise</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, the Educator's trap when evaluating a franchise.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Your strength is that you absorb a system more completely than the room around you. You want to understand why a process is the way it is, where the edges are, what happens when the standard breaks. That instinct is the reason owners like you become trusted operators inside a brand. It is also the reason you can spend two extra months in evaluation before you make a decision.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      I have watched this play out the same way more than once. An Educator gets serious about a category, reads everything, runs the math, talks to franchisees, takes notes that fill a binder. Then the next category lands in front of them, and the binder starts over. The pattern is not analysis paralysis. It is the desire to be the most informed person in the room before committing.
    </p>

    <!-- The framework -->
    <div style="background:#FBFAF6;border:1px solid #e2ddd2;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">A FILTER THAT HELPS</p>
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1a1a1a;">When validating a brand, ask two questions about your own questions:</p>
      <p style="margin:0 0 12px;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>1.</strong> &nbsp;Am I asking this because I genuinely need the answer to make a decision, or because I want to feel more prepared?
      </p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>2.</strong> &nbsp;If a franchisor's training curriculum cannot answer this in their actual onboarding, is that a real disqualifier, or am I auditing it because auditing is the part I am good at?
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The strongest signal a franchise system is built for Educators is not a longer training program. It is a training program where the franchisor's team can articulate why each section exists. That is the test. A weak system has a binder. A strong system has reasons.
    </p>

    <!-- Pull quote -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0;font-size:17px;color:#1a1a1a;line-height:1.5;font-style:italic;">
        The Educators who land well are not the ones who learned everything before they signed. They are the ones who learned the right things first.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want a second set of eyes on which categories actually reward your information instinct and which categories just tolerate it, that is the kind of conversation I have all day. Free, no pitch.
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

export function archetypeDay5EducatorText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The Educator's trap when evaluating a franchise.

Your strength is that you absorb a system more completely than the room around you. You want to understand why a process is the way it is, where the edges are, what happens when the standard breaks. That instinct is the reason owners like you become trusted operators inside a brand. It is also the reason you can spend two extra months in evaluation before you make a decision.

I have watched this play out the same way more than once. An Educator gets serious about a category, reads everything, runs the math, talks to franchisees, takes notes that fill a binder. Then the next category lands in front of them, and the binder starts over.

A filter that helps. When validating a brand, ask two questions about your own questions:

1. Am I asking this because I genuinely need the answer to make a decision, or because I want to feel more prepared?

2. If a franchisor's training curriculum cannot answer this in their actual onboarding, is that a real disqualifier, or am I auditing it because auditing is the part I am good at?

The strongest signal a franchise system is built for Educators is not a longer training program. It is a training program where the franchisor's team can articulate why each section exists. A weak system has a binder. A strong system has reasons.

The Educators who land well are not the ones who learned everything before they signed. They are the ones who learned the right things first.

Book a free call when you want a second set of eyes: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
